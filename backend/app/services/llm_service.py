import os
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from groq import Groq
except ImportError:
    Groq = None
    logger.warning("groq package not installed — Groq extraction unavailable")

try:
    from ollama import Client as OllamaClient
except ImportError:
    OllamaClient = None


SYSTEM_PROMPT = "You are a medical chronology assistant. You ONLY output valid JSON. No markdown, no explanation."

EXTRACTION_PROMPT = """Analyze the following medical record text. Extract ALL medical events, diagnostics, treatments, and flags you can find.

Return ONLY a valid JSON object with this exact structure:
{{
  "patient_name": "Full name or null",
  "dob": "YYYY-MM-DD or null",
  "events": [
    {{
      "date": "YYYY-MM-DD",
      "event_type": "one of: Initial Visit | Follow-Up | Imaging | Lab | Therapy | Chiropractic | Referral | Prescription | Discharge | Emergency | Surgery | Other",
      "description": "One-sentence clinical summary of what happened"
    }}
  ],
  "diagnostics": [
    {{
      "date": "YYYY-MM-DD",
      "test_name": "Name of test/imaging",
      "findings": "Key findings",
      "clinical_significance": "Significance of findings"
    }}
  ],
  "treatments": [
    {{
      "date": "YYYY-MM-DD",
      "provider": "Name of provider",
      "treatment": "Treatment provided",
      "notes": "Any notes"
    }}
  ],
  "flags": [
    {{
      "type": "Red Flag | Warning | Inconsistency",
      "description": "Description of the flag",
      "severity": "High | Medium | Low"
    }}
  ]
}}

Rules:
- Convert ALL dates to YYYY-MM-DD format
- If a date is ambiguous or missing, use null for the date field
- Do NOT invent information — only extract what is explicitly stated

Text:
{text}"""

SUMMARY_PROMPT = """You are a senior medical legal consultant. Read the following chronological medical events and provide a high-level clinical synthesis.

Your goal is to summarize the patient's injury, the diagnostic path taken, the treatments provided, and their overall clinical progression or status.

Return ONLY a valid JSON object with this exact structure:
{{
  "medical_summary": "A professional 2-3 paragraph clinical synthesis. Focus on key injuries, significant diagnostic findings, and the sequence of care.",
  "past_history": "A concise paragraph summarizing the patient's past treatment history.",
  "past_treatments": [
    {{
      "date": "YYYY-MM-DD or null",
      "provider": "Name of provider or facility",
      "treatment": "Treatment or procedure performed",
      "notes": "Relevant clinical notes or findings from that visit"
    }}
  ]
}}

IMPORTANT INSTRUCTIONS for past_treatments and past_history:
1. Identify the LATEST (most recent) date in the provided records. This is the "current visit".
2. EVERY event that occurred BEFORE this latest date MUST be considered "past treatment history".
3. Extract all conditions and treatments from these prior visits into `past_treatments` and summarize them in `past_history`.
4. If there is only one date or all events happen on the same date, then there is no past history (return empty past_treatments).
5. Sort past_treatments by date ascending (earliest first). Do NOT invent information.

Chronological Events:
{events_text}
"""


# ── Fix #9: Singleton LLM clients ────────────────────────────────
_groq_client = None
_ollama_client = None


def _get_groq_client():
    """Return a singleton Groq client instance."""
    global _groq_client
    if _groq_client is None and settings.GROQ_API_KEY and Groq:
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


def _get_ollama_client():
    """Return a singleton Ollama client instance."""
    global _ollama_client
    if _ollama_client is None and OllamaClient:
        _ollama_client = OllamaClient(host=settings.OLLAMA_BASE_URL)
    return _ollama_client


def extract_entities(text_chunk: str) -> dict:
    prompt = EXTRACTION_PROMPT.format(text=text_chunk)

    # ── Try Groq first (cloud, fast) ────────────────────────────
    client = _get_groq_client()
    if client:
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            content = chat_completion.choices[0].message.content
            parsed = json.loads(content)
            event_count = len(parsed.get("events", []))
            logger.info(f"  Groq extracted {event_count} events from chunk")
            return parsed
        except Exception as e:
            logger.error(f"Groq extraction failed: {e}")

    # ── Fallback to Ollama (local) ──────────────────────────────
    ollama = _get_ollama_client()
    if ollama:
        try:
            response = ollama.chat(model=settings.OLLAMA_MODEL, messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            content = response["message"]["content"]
            # Strip markdown code fences if present
            content = content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(content)
            event_count = len(parsed.get("events", []))
            logger.info(f"  Ollama extracted {event_count} events from chunk")
            return parsed
        except Exception as e:
            logger.error(f"Ollama extraction failed: {e}")

    logger.warning("No LLM backend available — skipping extraction")
    return {}

def generate_summary(events_text: str) -> dict:
    prompt = SUMMARY_PROMPT.format(events_text=events_text)

    client = _get_groq_client()
    if client:
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            content = chat_completion.choices[0].message.content
            parsed = json.loads(content)
            return parsed
        except Exception as e:
            logger.error(f"Groq summary failed: {e}")

    ollama = _get_ollama_client()
    if ollama:
        try:
            response = ollama.chat(model=settings.OLLAMA_MODEL, messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            content = response["message"]["content"]
            content = content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(content)
            return parsed
        except Exception as e:
            logger.error(f"Ollama summary failed: {e}")

    return {}
