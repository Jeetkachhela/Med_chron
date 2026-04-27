from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
from datetime import date, datetime


# ── Patient Schemas ──
class PatientBase(BaseModel):
    name: str
    dob: Optional[date] = None
    gender: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ── Case Schemas ──
class CaseBase(BaseModel):
    case_reference: Optional[str] = None
    patient_name: Optional[str] = None
    primary_complaint: Optional[str] = None
    injury_cause: Optional[str] = None

class CaseCreate(CaseBase):
    pass

class Case(CaseBase):
    id: int
    patient_id: int
    created_at: datetime
    processing_status: Optional[str] = "pending"
    class Config:
        from_attributes = True


# ── Event Schemas ──
class EventBase(BaseModel):
    date: Optional[date] = None
    event_type: str
    description: str
    source_file: str
    confidence: Optional[str] = None

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: int
    case_id: int
    class Config:
        from_attributes = True


# ── Diagnostic Schemas ──
class DiagnosticBase(BaseModel):
    date: Optional[date] = None
    test_name: str
    findings: str
    clinical_significance: Optional[str] = None
    source_file: Optional[str] = None

class Diagnostic(DiagnosticBase):
    id: int
    case_id: int
    class Config:
        from_attributes = True


# ── Treatment Schemas ──
class TreatmentBase(BaseModel):
    date: Optional[date] = None
    provider: Optional[str] = None
    treatment: str
    notes: Optional[str] = None
    source_file: Optional[str] = None

class Treatment(TreatmentBase):
    id: int
    case_id: int
    class Config:
        from_attributes = True


# ── Flag Schemas ──
class FlagBase(BaseModel):
    type: str
    description: str
    severity: Optional[str] = "Medium"
    source_file: Optional[str] = None

class Flag(FlagBase):
    id: int
    case_id: int
    class Config:
        from_attributes = True


# ── File Schemas ──
class FileBase(BaseModel):
    file_name: str
    file_type: Optional[str] = None
    uploaded_at: Optional[datetime] = None

class FileSchema(FileBase):
    id: int
    case_id: int
    class Config:
        from_attributes = True


# ── Composite Response ──
class ChronologyResponse(BaseModel):
    patient: Patient
    case: Case
    events: List[Event]
    diagnostics: List[Diagnostic]
    treatments: List[Treatment]
    flags: List[Flag]
    files: List[FileSchema]
    medical_summary: Optional[str] = None
    past_history: Optional[str] = None


# ── Auth Schemas ──
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        """Fix #5: Password validation."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool  # Fix #14: was int

    class Config:
        from_attributes = True
