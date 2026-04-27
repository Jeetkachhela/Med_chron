from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import os
import io
import csv
import json
import shutil
import tempfile
import uuid
import re
import logging

from app.db.database import get_db, SessionLocal
from app.models.models import Case, Patient, Event, Diagnostic, Treatment, Flag, File as DBFile, User
from app.api.deps import get_current_user
from app.schemas.schemas import CaseCreate
from app.services.pipeline import process_file, process_files_batch
from app.services.pdf_service import generate_chronology_pdf
from app.core.config import settings
from fastapi.responses import FileResponse, StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# PDF cache directory — Fix #36
PDF_CACHE_DIR = "pdf_cache"
os.makedirs(PDF_CACHE_DIR, exist_ok=True)


def _sanitize_filename(filename: str) -> str:
    """Fix #11: Prevent path traversal by stripping dangerous characters."""
    # Take only the basename, strip path separators
    filename = os.path.basename(filename)
    # Remove any non-alphanumeric characters except dots, hyphens, underscores
    filename = re.sub(r'[^\w.\-]', '_', filename)
    return filename or "unnamed_file.pdf"


def _check_case_ownership(case: Case, user: User):
    """Fix #3: Ensure user owns the case."""
    if case.user_id != user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this case.")


# ── List Cases (user-scoped) ─────────────────────────────────────
@router.get("/", response_model=list)
def list_cases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fix #3, #33: User-scoped cases with N+1 fix using subquery for event counts."""
    # Subquery for event counts — Fix #33
    event_counts = (
        db.query(Event.case_id, func.count(Event.id).label("event_count"))
        .group_by(Event.case_id)
        .subquery()
    )

    results_query = (
        db.query(Case, Patient.name, event_counts.c.event_count)
        .join(Patient, Case.patient_id == Patient.id, isouter=True)
        .outerjoin(event_counts, Case.id == event_counts.c.case_id)
        .filter(Case.user_id == current_user.id)  # Fix #3: ownership
        .order_by(Case.created_at.desc())
        .all()
    )

    results = []
    for case, patient_name, event_count in results_query:
        results.append({
            "id": case.id,
            "case_reference": case.case_reference,
            "patient_name": patient_name or "Unknown",
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "event_count": event_count or 0,
            "processing_status": case.processing_status or "pending",
        })
    return results


# ── Create Case ──────────────────────────────────────────────────
@router.post("/", response_model=dict)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient_name = getattr(case_in, 'patient_name', 'Unknown') or 'Unknown'

    patient = Patient(name=patient_name, gender="Unknown")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    ref = case_in.case_reference
    if not ref:
        ref = f"CASE-{str(uuid.uuid4())[:8].upper()}"
        
    case = Case(
        patient_id=patient.id,
        user_id=current_user.id,  # Fix #3: ownership
        case_reference=ref,
        primary_complaint=case_in.primary_complaint,
        injury_cause=case_in.injury_cause,
        processing_status="pending",
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"case_id": case.id}


# ── Upload Files ─────────────────────────────────────────────────
@router.post("/{case_id}/upload")
async def upload_files(
    case_id: int, 
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    _check_case_ownership(case, current_user)

    saved_files = []
    for file in files:
        # Fix #11: Validate file type
        if file.content_type not in settings.ALLOWED_FILE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file.content_type}' not allowed. Only PDF files are accepted."
            )

        # Fix #11: Validate file size
        contents = await file.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB size limit."
            )

        # Fix #11: Sanitize filename to prevent path traversal
        safe_name = _sanitize_filename(file.filename)
        file_location = os.path.join(UPLOAD_DIR, f"{case_id}_{uuid.uuid4().hex[:8]}_{safe_name}")
        
        with open(file_location, "wb") as buffer:
            buffer.write(contents)
        
        db_file = DBFile(
            case_id=case_id,
            file_name=file.filename,  # Keep original name for display
            file_path=file_location,
            file_type=file.content_type,
        )
        db.add(db_file)
        saved_files.append(file_location)
        
    # Update processing status — Fix #40
    case.processing_status = "processing"
    db.commit()
    
    # Trigger batch processing in background
    if saved_files:
        background_tasks.add_task(process_files_batch, saved_files, case_id)
        
    return {"message": "Files uploaded and processing started", "status": "processing"}


# ── Get Chronology ───────────────────────────────────────────────
@router.get("/{case_id}/chronology")
def get_chronology(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    _check_case_ownership(case, current_user)

    # Fix #34: Fetch related data with fewer queries using eager patterns
    events = db.query(Event).filter(Event.case_id == case_id).order_by(Event.date.asc()).all()
    diagnostics = db.query(Diagnostic).filter(Diagnostic.case_id == case_id).order_by(Diagnostic.date.asc()).all()
    treatments = db.query(Treatment).filter(Treatment.case_id == case_id).order_by(Treatment.date.asc()).all()
    flags = db.query(Flag).filter(Flag.case_id == case_id).all()
    files = db.query(DBFile).filter(DBFile.case_id == case_id).all()
    
    return {
        "patient": case.patient,
        "case": case,
        "events": events,
        "diagnostics": diagnostics,
        "treatments": treatments,
        "flags": flags,
        "files": files,
        "processing_status": case.processing_status,  # Fix #40
    }


# ── Get Processing Status ────────────────────────────────────────
@router.get("/{case_id}/status")
def get_processing_status(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fix #40: Dedicated endpoint for polling processing status."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    _check_case_ownership(case, current_user)
    
    event_count = db.query(func.count(Event.id)).filter(Event.case_id == case_id).scalar()
    return {
        "status": case.processing_status,
        "event_count": event_count,
    }


# ── Download PDF ─────────────────────────────────────────────────
@router.get("/{case_id}/pdf")
def get_pdf(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    _check_case_ownership(case, current_user)
        
    events = db.query(Event).filter(Event.case_id == case_id).order_by(Event.date.asc()).all()
    diagnostics = db.query(Diagnostic).filter(Diagnostic.case_id == case_id).order_by(Diagnostic.date.asc()).all()
    treatments = db.query(Treatment).filter(Treatment.case_id == case_id).order_by(Treatment.date.asc()).all()
    flags = db.query(Flag).filter(Flag.case_id == case_id).all()
    files = db.query(DBFile).filter(DBFile.case_id == case_id).all()
    
    data = {
        "patient": case.patient,
        "case": case,
        "events": events,
        "diagnostics": diagnostics,
        "treatments": treatments,
        "flags": flags,
        "files": files,
    }
    
    # Fix #6, #18: Use unique temp file instead of fixed path
    pdf_path = os.path.join(PDF_CACHE_DIR, f"report_{case_id}_{uuid.uuid4().hex[:8]}.pdf")
    
    try:
        generate_chronology_pdf(data, pdf_path)
        
        if os.path.exists(pdf_path):
            safe_ref = re.sub(r'[^a-zA-Z0-9\-]', '_', case.case_reference or 'Report')
            safe_filename = f"Medical_Chronology_{safe_ref}.pdf"
            
            response = FileResponse(
                pdf_path, 
                media_type="application/pdf", 
                filename=safe_filename,
            )
            # Schedule cleanup after response is sent
            background = BackgroundTasks()
            background.add_task(_cleanup_temp_file, pdf_path)
            response.background = background
            return response
    except Exception as e:
        logger.error(f"PDF generation failed for case {case_id}: {e}")
        # Clean up failed file
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
    
    raise HTTPException(status_code=500, detail="Failed to generate report. Please try again.")


def _cleanup_temp_file(path: str):
    """Fix #6: Remove temp PDF files after serving."""
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


# ── CSV Export ───────────────────────────────────────────────────
@router.get("/{case_id}/export/csv")
def export_csv(
    case_id: int,
    export_type: str = "events",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fix #38: CSV export for events, diagnostics, or treatments."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    _check_case_ownership(case, current_user)

    output = io.StringIO()
    writer = csv.writer(output)

    if export_type == "events":
        writer.writerow(["Date", "Event Type", "Description", "Source File", "Confidence"])
        rows = db.query(Event).filter(Event.case_id == case_id).order_by(Event.date.asc()).all()
        for r in rows:
            writer.writerow([str(r.date or ""), r.event_type, r.description, r.source_file, r.confidence])
    elif export_type == "diagnostics":
        writer.writerow(["Date", "Test Name", "Findings", "Clinical Significance", "Source File"])
        rows = db.query(Diagnostic).filter(Diagnostic.case_id == case_id).all()
        for r in rows:
            writer.writerow([str(r.date or ""), r.test_name, r.findings, r.clinical_significance, r.source_file])
    elif export_type == "treatments":
        writer.writerow(["Date", "Provider", "Treatment", "Notes", "Source File"])
        rows = db.query(Treatment).filter(Treatment.case_id == case_id).all()
        for r in rows:
            writer.writerow([str(r.date or ""), r.provider, r.treatment, r.notes, r.source_file])
    else:
        raise HTTPException(status_code=400, detail="export_type must be 'events', 'diagnostics', or 'treatments'")

    output.seek(0)
    safe_ref = re.sub(r'[^a-zA-Z0-9\-]', '_', case.case_reference or 'export')
    filename = f"{safe_ref}_{export_type}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _delete_case_background(case_id: int, user_id: int):
    db = SessionLocal()
    try:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case or case.user_id != user_id:
            return
            
        patient_id = case.patient_id
        file_paths = [f.file_path for f in db.query(DBFile.file_path).filter(DBFile.case_id == case_id).all() if f.file_path]

        db.query(Event).filter(Event.case_id == case_id).delete(synchronize_session=False)
        db.query(Diagnostic).filter(Diagnostic.case_id == case_id).delete(synchronize_session=False)
        db.query(Treatment).filter(Treatment.case_id == case_id).delete(synchronize_session=False)
        db.query(Flag).filter(Flag.case_id == case_id).delete(synchronize_session=False)
        db.query(DBFile).filter(DBFile.case_id == case_id).delete(synchronize_session=False)
        db.query(Case).filter(Case.id == case_id).delete(synchronize_session=False)
        if patient_id:
            db.query(Patient).filter(Patient.id == patient_id).delete(synchronize_session=False)
        db.commit()

        for fp in file_paths:
            try:
                if os.path.exists(fp):
                    os.remove(fp)
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Failed to delete case {case_id}: {e}")
    finally:
        db.close()


@router.delete("/{case_id}")
def delete_case(
    case_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fast background delete — avoids blocking UI during large case deletion."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    _check_case_ownership(case, current_user)

    background_tasks.add_task(_delete_case_background, case_id, current_user.id)

    return {"message": "Case deletion started in background"}
