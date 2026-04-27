import fitz  # PyMuPDF
import os
import re
import logging
from sqlalchemy import func
from app.db.database import SessionLocal
from app.models.models import File, Event, Case, Patient, Diagnostic, Treatment, Flag
from app.services.llm_service import extract_entities, generate_summary
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def process_file(file_path: str, case_id: int):
    """
    Background task to process a single uploaded file and update the case summary.
    Fix #12: Improved transaction safety with rollback on failure.
    """
    db = SessionLocal()
    try:
        _do_process(file_path, case_id, db)
        # Update summary after each file to ensure it's always fresh
        update_case_summary(case_id, db)
        # Mark as completed if this is the last file being processed
        _update_processing_status(case_id, db)
    except Exception as e:
        db.rollback()  # Fix #12: rollback on failure
        logger.exception(f"Pipeline failed for {file_path}: {e}")
        # Mark case as failed
        try:
            case = db.query(Case).filter(Case.id == case_id).first()
            if case:
                case.processing_status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def process_files_batch(file_paths: list[str], case_id: int):
    """
    Background task to process multiple uploaded files as a batch.
    """
    db = SessionLocal()
    try:
        for file_path in file_paths:
            _do_process(file_path, case_id, db)
        # Update summary once after ALL files are processed
        update_case_summary(case_id, db)
        _update_processing_status(case_id, db)
    except Exception as e:
        db.rollback()
        logger.exception(f"Pipeline failed for batch: {e}")
        try:
            case = db.query(Case).filter(Case.id == case_id).first()
            if case:
                case.processing_status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _update_processing_status(case_id: int, db):
    """Fix #40: Mark case as completed once processing is done."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if case:
        case.processing_status = "completed"
        db.commit()


def _split_at_sentence_boundaries(text: str, target_size: int = 4000, overlap_sentences: int = 2) -> list:
    """
    Fix #35: Split text at sentence boundaries instead of arbitrary character positions.
    This prevents cutting words/sentences in the middle, improving LLM extraction quality.
    """
    # Split on sentence-ending punctuation followed by whitespace
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = []
    current_len = 0
    
    for sentence in sentences:
        sentence_len = len(sentence)
        if current_len + sentence_len > target_size and current_chunk:
            chunks.append(' '.join(current_chunk))
            # Keep last N sentences for overlap context
            current_chunk = current_chunk[-overlap_sentences:] if overlap_sentences > 0 else []
            current_len = sum(len(s) for s in current_chunk) + len(current_chunk)
        current_chunk.append(sentence)
        current_len += sentence_len + 1  # +1 for space
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks if chunks else [text]


def _do_process(file_path: str, case_id: int, db):
    # ── 1. Read PDF ──────────────────────────────────────────────
    text = ""
    page_count = 0
    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")
        return

    if not text.strip():
        logger.warning(f"No text extracted from {file_path}")
        return

    logger.info(f"Extracted {len(text)} chars from {page_count} pages of {os.path.basename(file_path)}")

    # ── 2. Chunk text with sentence boundaries — Fix #35 ─────────
    chunks = _split_at_sentence_boundaries(text, target_size=4000, overlap_sentences=2)

    patient_info = {}

    # ── 3. Fix #10: Cross-file deduplication using DB lookup ─────
    existing_event_keys = set()
    existing_events = db.query(Event.date, Event.event_type, Event.description).filter(Event.case_id == case_id).all()
    for ev in existing_events:
        date_str = str(ev.date) if ev.date else ""
        existing_event_keys.add(("event", date_str, ev.event_type or "", (ev.description or "")[:80]))
    
    existing_diag_keys = set()
    existing_diags = db.query(Diagnostic.date, Diagnostic.test_name, Diagnostic.findings).filter(Diagnostic.case_id == case_id).all()
    for d in existing_diags:
        date_str = str(d.date) if d.date else ""
        existing_diag_keys.add(("diagnostic", date_str, d.test_name or "", (d.findings or "")[:80]))

    existing_trt_keys = set()
    existing_trts = db.query(Treatment.date, Treatment.treatment, Treatment.provider).filter(Treatment.case_id == case_id).all()
    for t in existing_trts:
        date_str = str(t.date) if t.date else ""
        existing_trt_keys.add(("treatment", date_str, t.treatment or "", (t.provider or "")[:80]))

    existing_flag_keys = set()
    existing_flags = db.query(Flag.type, Flag.description).filter(Flag.case_id == case_id).all()
    for f in existing_flags:
        existing_flag_keys.add(("flag", f.type or "", (f.description or "")[:80]))

    seen_keys = existing_event_keys | existing_diag_keys | existing_trt_keys | existing_flag_keys

    # ── 4. Process each chunk with LLM ───────────────────────────
    import concurrent.futures

    logger.info(f"  Starting parallel processing of {len(chunks)} chunks with max_workers=4...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_to_chunk = {executor.submit(extract_entities, chunk): idx for idx, chunk in enumerate(chunks)}
        
        for future in concurrent.futures.as_completed(future_to_chunk):
            idx = future_to_chunk[future]
            try:
                result = future.result()
                if not result:
                    continue

                # Capture patient info from the first chunk that has it
                if result.get("patient_name") and not patient_info.get("name"):
                    patient_info["name"] = result["patient_name"]
                    patient_info["dob"] = result.get("dob")

                # Save entities immediately per chunk to show progress in UI
                _save_entities_batch(result, case_id, os.path.basename(file_path), seen_keys, db)
                logger.info(f"  ✓ Processed chunk {idx+1}/{len(chunks)}")
            except Exception as exc:
                logger.error(f"Chunk {idx+1}/{len(chunks)} generated an exception: {exc}")

    # ── 5. Update patient info if we found it ────────────────────
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        logger.error(f"Case {case_id} not found in DB")
        return

    if patient_info.get("name") and case.patient:
        patient = case.patient
        if patient.name == "Unknown" or not patient.name:
            patient.name = patient_info["name"]
        if patient_info.get("dob") and not patient.dob:
            try:
                patient.dob = datetime.strptime(patient_info["dob"], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass
        db.commit()

    logger.info(f"  ✓ Finished processing {os.path.basename(file_path)} for case {case_id}")

def update_case_summary(case_id: int, db):
    """
    Fetches all events for a case and generates a comprehensive summary.
    """
    logger.info(f"  Updating clinical summary for case {case_id}...")
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case: return

    # Fetch all events, ordered by date
    events = db.query(Event).filter(Event.case_id == case_id).order_by(Event.date.asc()).all()
    if not events:
        logger.warning("  No events found to summarize.")
        return

    # Condense events for the prompt (Max 150 events to avoid token limits)
    if len(events) > 150:
        step = len(events) // 150
        sampled_events = events[::step][:150]
    else:
        sampled_events = events

    events_lines = []
    for e in sampled_events:
        date_str = e.date.isoformat() if e.date else "TBD"
        events_lines.append(f"{date_str}: {e.event_type} - {e.description}")
    
    events_text = "\n".join(events_lines)
    
    summary_result = generate_summary(events_text)
    if summary_result:
        case.medical_summary = summary_result.get("medical_summary", "")
        case.past_history = summary_result.get("past_history", "")
        # Save structured past treatments as JSON
        import json
        past_treatments = summary_result.get("past_treatments", [])
        if past_treatments and isinstance(past_treatments, list):
            case.past_treatments_json = json.dumps(past_treatments)
        db.commit()
        logger.info(f"  ✓ Summary updated for case {case_id} (with {len(past_treatments)} past treatments)")

def _save_entities_batch(result: dict, case_id: int, filename: str, seen_keys: set, db):
    count = 0

    # 1. Events
    for ev in result.get("events", []):
        desc = (ev.get("description") or "")
        key = ("event", ev.get("date") or "", ev.get("event_type") or "", desc[:80])
        if key in seen_keys: continue
        seen_keys.add(key)
        date_obj = _parse_date(ev.get("date"))
        db.add(Event(case_id=case_id, date=date_obj, event_type=ev.get("event_type", "Unknown"), description=desc, source_file=filename, confidence="High"))
        count += 1

    # 2. Diagnostics
    for diag in result.get("diagnostics", []):
        findings = (diag.get("findings") or "")
        key = ("diagnostic", diag.get("date") or "", diag.get("test_name") or "", findings[:80])
        if key in seen_keys: continue
        seen_keys.add(key)
        date_obj = _parse_date(diag.get("date"))
        db.add(Diagnostic(case_id=case_id, date=date_obj, test_name=diag.get("test_name") or "", findings=findings, clinical_significance=diag.get("clinical_significance") or "", source_file=filename))
        count += 1

    # 3. Treatments
    for trt in result.get("treatments", []):
        treatment = (trt.get("treatment") or "")
        key = ("treatment", trt.get("date") or "", treatment, (trt.get("provider") or "")[:80])
        if key in seen_keys: continue
        seen_keys.add(key)
        date_obj = _parse_date(trt.get("date"))
        db.add(Treatment(case_id=case_id, date=date_obj, provider=trt.get("provider") or "", treatment=treatment, notes=trt.get("notes") or "", source_file=filename))
        count += 1

    # 4. Flags
    for flag in result.get("flags", []):
        flag_desc = (flag.get("description") or "")
        key = ("flag", flag.get("type") or "", flag_desc[:80])
        if key in seen_keys: continue
        seen_keys.add(key)
        db.add(Flag(case_id=case_id, type=flag.get("type") or "Warning", description=flag_desc, severity=flag.get("severity") or "Medium", source_file=filename))
        count += 1

    if count:
        db.commit()

def _parse_date(raw_date: str):
    if not raw_date: return None
    # Support multiple formats
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(raw_date, fmt).date()
        except ValueError:
            continue
    return None
