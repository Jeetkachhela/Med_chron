from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    dob = Column(Date)
    gender = Column(String(20))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    cases = relationship("Case", back_populates="patient")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    case_reference = Column(String(100), unique=True, index=True)
    primary_complaint = Column(Text)
    injury_cause = Column(Text)

    processing_status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="cases")
    files = relationship("File", back_populates="case_", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="case_", cascade="all, delete-orphan")
    diagnostics = relationship("Diagnostic", back_populates="case_", cascade="all, delete-orphan")
    treatments = relationship("Treatment", back_populates="case_", cascade="all, delete-orphan")
    flags = relationship("Flag", back_populates="case_", cascade="all, delete-orphan")


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    file_name = Column(String(512))
    file_type = Column(String(100))
    file_path = Column(String(1024))
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    case_ = relationship("Case", back_populates="files")


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_case_date", "case_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    date = Column(Date, index=True)
    event_type = Column(String(100))
    description = Column(Text)
    source_file = Column(String(512))
    confidence = Column(String(20))

    case_ = relationship("Case", back_populates="events")


class Diagnostic(Base):
    __tablename__ = "diagnostics"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    date = Column(Date)
    test_name = Column(String(500))
    findings = Column(Text)
    clinical_significance = Column(Text)
    source_file = Column(String(512))

    case_ = relationship("Case", back_populates="diagnostics")


class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    date = Column(Date)
    provider = Column(String(255))
    treatment = Column(Text)
    notes = Column(Text)
    source_file = Column(String(512))

    case_ = relationship("Case", back_populates="treatments")


class Flag(Base):
    __tablename__ = "flags"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    type = Column(String(100))
    description = Column(Text)
    severity = Column(String(20))
    source_file = Column(String(512))

    case_ = relationship("Case", back_populates="flags")
