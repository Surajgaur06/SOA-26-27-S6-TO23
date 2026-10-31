from datetime import datetime, timezone
import hashlib
import json
import enum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, 
    ForeignKey, Text, Enum, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TECHNICIAN = "technician"
    AUDITOR = "auditor"

class LoggerStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    RETIRED = "retired"

class CalibrationStatus(str, enum.Enum):
    VALID = "valid"
    DUE_SOON = "due_soon"
    OVERDUE = "overdue"
    FAILED = "failed"
    NOT_CALIBRATED = "not_calibrated"

class RecordState(str, enum.Enum):
    DRAFT = "draft"
    FINALIZED = "finalized"
    AMENDED = "amended"

class PointOutcome(str, enum.Enum):
    PASS_STATUS = "pass"
    FAIL_STATUS = "fail"

class OverallOutcome(str, enum.Enum):
    PASS_STATUS = "pass"
    FAIL_STATUS = "fail"
    CONDITIONAL = "conditional"

class NotificationType(str, enum.Enum):
    DUE_30_DAYS = "due_30_days"
    DUE_7_DAYS = "due_7_days"
    OVERDUE = "overdue"
    EXPIRED_REFERENCE = "expired_reference"
    FAILED_CALIBRATION = "failed_calibration"
    MISSING_PROVENANCE = "missing_provenance"
    SYSTEM = "system"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.TECHNICIAN, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    
    calibrations = relationship("CalibrationRecord", foreign_keys="CalibrationRecord.technician_id", back_populates="technician")
    amendments = relationship("CalibrationAmendment", back_populates="user")
    audit_events = relationship("AuditEvent", back_populates="user")

class TemperatureLogger(Base):
    __tablename__ = "temperature_loggers"
    
    id = Column(Integer, primary_key=True, index=True)
    logger_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. TL-001
    manufacturer = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    logger_type = Column(String(50), nullable=False)  # USB, Wireless, RTD, Thermocouple, Dry Ice
    measurement_range = Column(String(50), nullable=False)  # e.g. -40°C to +85°C
    resolution = Column(Float, default=0.01, nullable=False)
    accuracy_spec = Column(String(100), nullable=False)  # e.g. ±0.3°C
    location = Column(String(100), nullable=False)  # e.g. Cold Room B, Vaccine Depot 4
    owner = Column(String(100), nullable=False)  # e.g. Dr. Jane Doe
    commissioning_date = Column(DateTime, nullable=False)
    calibration_interval_months = Column(Integer, default=12, nullable=False)
    last_calibration_date = Column(DateTime, nullable=True)
    next_due_date = Column(DateTime, nullable=True, index=True)
    status = Column(Enum(LoggerStatus), default=LoggerStatus.ACTIVE, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    
    calibrations = relationship("CalibrationRecord", back_populates="logger", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="logger", cascade="all, delete-orphan")

class ReferenceInstrument(Base):
    __tablename__ = "reference_instruments"
    
    id = Column(Integer, primary_key=True, index=True)
    instrument_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. REF-PRT-01
    manufacturer = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    measurement_range = Column(String(50), nullable=False)  # e.g. -80°C to +250°C
    certificate_number = Column(String(100), nullable=False)
    calibration_provider = Column(String(150), nullable=False)  # e.g. National Metrology Center / Accredited Lab
    calibration_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False, index=True)
    stated_uncertainty = Column(String(100), nullable=False)  # e.g. U = 0.03°C (k=2)
    traceability_details = Column(Text, nullable=False)
    certificate_file_ref = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    
    calibrations = relationship("CalibrationRecord", back_populates="reference_instrument")

class CalibrationProcedure(Base):
    __tablename__ = "calibration_procedures"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. SOP-CAL-004
    title = Column(String(150), nullable=False)
    version = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    standard_tolerance = Column(Float, default=0.50, nullable=False)
    tolerance_source = Column(String(150), nullable=False)  # e.g. Manufacturer Spec, ISO/IEC 17025 Demo standard
    created_at = Column(DateTime, default=utcnow, nullable=False)

class CalibrationRecord(Base):
    __tablename__ = "calibration_records"
    
    id = Column(Integer, primary_key=True, index=True)
    record_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. CAL-2026-0001
    logger_id = Column(Integer, ForeignKey("temperature_loggers.id"), nullable=False, index=True)
    reference_instrument_id = Column(Integer, ForeignKey("reference_instruments.id"), nullable=False, index=True)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    calibration_date = Column(DateTime, default=utcnow, nullable=False)
    location = Column(String(150), nullable=False)  # e.g. Environmental Calibration Lab #2
    ambient_temperature = Column(Float, default=22.5, nullable=False)  # °C
    ambient_humidity = Column(Float, default=45.0, nullable=False)  # % RH
    procedure_code = Column(String(50), default="SOP-CAL-001", nullable=False)
    equipment_used = Column(String(255), nullable=False)  # Stirred liquid bath, Fluke dry-well
    
    configured_tolerance = Column(Float, default=0.50, nullable=False)  # Acceptance tolerance
    tolerance_source = Column(String(150), default="Manufacturer Standard ±0.5°C", nullable=False)
    calibration_interval_months = Column(Integer, default=12, nullable=False)
    
    overall_outcome = Column(Enum(OverallOutcome), default=OverallOutcome.PASS_STATUS, nullable=False)
    max_error = Column(Float, default=0.0, nullable=False)
    state = Column(Enum(RecordState), default=RecordState.DRAFT, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    
    notes = Column(Text, nullable=True)
    provenance_hash = Column(String(64), nullable=True)  # SHA-256 hash of measurement data & metadata
    is_demo = Column(Boolean, default=True, nullable=False)  # Demo/Educational disclaimer flag
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    finalized_at = Column(DateTime, nullable=True)
    finalized_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    logger = relationship("TemperatureLogger", back_populates="calibrations")
    reference_instrument = relationship("ReferenceInstrument", back_populates="calibrations")
    technician = relationship("User", foreign_keys=[technician_id], back_populates="calibrations")
    finalizer = relationship("User", foreign_keys=[finalized_by_id])
    
    measurement_points = relationship("CalibrationMeasurementPoint", back_populates="record", cascade="all, delete-orphan", order_by="CalibrationMeasurementPoint.sequence")
    amendments = relationship("CalibrationAmendment", back_populates="record", cascade="all, delete-orphan")
    attachments = relationship("CalibrationAttachment", back_populates="record", cascade="all, delete-orphan")

class CalibrationMeasurementPoint(Base):
    __tablename__ = "calibration_measurement_points"
    
    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("calibration_records.id"), nullable=False, index=True)
    sequence = Column(Integer, default=1, nullable=False)
    nominal_temperature = Column(Float, nullable=False)  # Setpoint, e.g. 0.00 °C
    reference_reading = Column(Float, nullable=False)  # Reference thermometer reading
    logger_reading = Column(Float, nullable=False)  # Logger observed reading
    unit = Column(String(10), default="°C", nullable=False)
    ref_uncertainty = Column(Float, default=0.03, nullable=True)  # Stated reference uncertainty at point
    allowed_tolerance = Column(Float, default=0.50, nullable=False)  # Allowed limit for pass
    error = Column(Float, nullable=False)  # logger_reading - reference_reading
    abs_error = Column(Float, nullable=False)  # abs(error)
    outcome = Column(Enum(PointOutcome), default=PointOutcome.PASS_STATUS, nullable=False)
    repeated_readings = Column(Text, nullable=True)  # Optional JSON array of repeat raw values
    timestamp = Column(DateTime, default=utcnow, nullable=False)
    
    record = relationship("CalibrationRecord", back_populates="measurement_points")

class CalibrationAmendment(Base):
    __tablename__ = "calibration_amendments"
    
    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("calibration_records.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    version = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    previous_data = Column(Text, nullable=False)  # JSON snapshot before amendment
    new_data = Column(Text, nullable=False)  # JSON snapshot after amendment
    timestamp = Column(DateTime, default=utcnow, nullable=False)
    
    record = relationship("CalibrationRecord", back_populates="amendments")
    user = relationship("User", back_populates="amendments")

class CalibrationAttachment(Base):
    __tablename__ = "calibration_attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey("calibration_records.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=utcnow, nullable=False)
    
    record = relationship("CalibrationRecord", back_populates="attachments")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g. "RECORD_FINALIZED", "LOGGER_REGISTERED", "AMENDMENT_CREATED"
    entity_type = Column(String(50), nullable=False)  # e.g. "CalibrationRecord", "TemperatureLogger"
    entity_id = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)  # JSON string of payload/metadata
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=utcnow, nullable=False, index=True)
    previous_hash = Column(String(64), nullable=True)
    current_hash = Column(String(64), nullable=False)  # SHA-256 tamper-evident hash chain
    
    user = relationship("User", back_populates="audit_events")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    logger_id = Column(Integer, ForeignKey("temperature_loggers.id"), nullable=True, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.SYSTEM, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    
    logger = relationship("TemperatureLogger", back_populates="notifications")
