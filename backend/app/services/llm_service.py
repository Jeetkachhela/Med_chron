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

    # ── Try Groq first (cloud, fast) with Retries ───────────────────
    client = _get_groq_client()
    if client:
        import time
        max_retries = 3
        for attempt in range(max_retries):
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
                logger.error(f"Groq extraction failed (attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s

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


