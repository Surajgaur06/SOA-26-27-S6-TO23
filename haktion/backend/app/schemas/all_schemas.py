from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.entities import UserRole, LoggerStatus, CalibrationStatus, RecordState, PointOutcome, OverallOutcome, NotificationType

# --- Auth & User Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    full_name: str
    role: UserRole

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.TECHNICIAN

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Temperature Logger Schemas ---
class LoggerBase(BaseModel):
    logger_id: str
    manufacturer: str
    model: str
    serial_number: str
    logger_type: str
    measurement_range: str
    resolution: float = 0.01
    accuracy_spec: str
    location: str
    owner: str
    commissioning_date: datetime
    calibration_interval_months: int = 12
    status: LoggerStatus = LoggerStatus.ACTIVE
    notes: Optional[str] = None

class LoggerCreate(LoggerBase):
    pass

class LoggerUpdate(BaseModel):
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    logger_type: Optional[str] = None
    measurement_range: Optional[str] = None
    resolution: Optional[float] = None
    accuracy_spec: Optional[str] = None
    location: Optional[str] = None
    owner: Optional[str] = None
    calibration_interval_months: Optional[int] = None
    status: Optional[LoggerStatus] = None
    notes: Optional[str] = None

class LoggerResponse(LoggerBase):
    id: int
    last_calibration_date: Optional[datetime] = None
    next_due_date: Optional[datetime] = None
    calibration_status: CalibrationStatus = CalibrationStatus.NOT_CALIBRATED
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Reference Instrument Schemas ---
class ReferenceInstrumentBase(BaseModel):
    instrument_id: str
    manufacturer: str
    model: str
    serial_number: str
    measurement_range: str
    certificate_number: str
    calibration_provider: str
    calibration_date: datetime
    expiry_date: datetime
    stated_uncertainty: str
    traceability_details: str
    certificate_file_ref: Optional[str] = None
    is_active: bool = True

class ReferenceInstrumentCreate(ReferenceInstrumentBase):
    pass

class ReferenceInstrumentUpdate(BaseModel):
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    measurement_range: Optional[str] = None
    certificate_number: Optional[str] = None
    calibration_provider: Optional[str] = None
    calibration_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    stated_uncertainty: Optional[str] = None
    traceability_details: Optional[str] = None
    certificate_file_ref: Optional[str] = None
    is_active: Optional[bool] = None

class ReferenceInstrumentResponse(ReferenceInstrumentBase):
    id: int
    is_expired: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

# --- Measurement Point Schemas ---
class MeasurementPointInput(BaseModel):
    sequence: int = 1
    nominal_temperature: float
    reference_reading: float
    logger_reading: float
    unit: str = "°C"
    ref_uncertainty: Optional[float] = 0.03
    allowed_tolerance: float = 0.50
    repeated_readings: Optional[str] = None  # e.g. "[25.01, 25.02, 25.00]"

class MeasurementPointResponse(BaseModel):
    id: int
    record_id: int
    sequence: int
    nominal_temperature: float
    reference_reading: float
    logger_reading: float
    unit: str
    ref_uncertainty: Optional[float]
    allowed_tolerance: float
    error: float
    abs_error: float
    outcome: PointOutcome
    repeated_readings: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

# --- Calibration Record Schemas ---
class CalibrationDraftCreate(BaseModel):
    logger_id: int
    reference_instrument_id: int
    record_number: Optional[str] = None
    calibration_date: Optional[datetime] = None
    location: str = "Primary Metrology Calibration Lab"
    ambient_temperature: float = 22.5
    ambient_humidity: float = 45.0
    procedure_code: str = "SOP-CAL-001"
    equipment_used: str = "Stirred liquid precision bath & multi-channel reader"
    configured_tolerance: float = 0.50
    tolerance_source: str = "Manufacturer Spec ±0.5°C"
    calibration_interval_months: int = 12
    notes: Optional[str] = None
    measurement_points: List[MeasurementPointInput] = []

class CalibrationRecordResponse(BaseModel):
    id: int
    record_number: str
    logger_id: int
    reference_instrument_id: int
    technician_id: int
    calibration_date: datetime
    location: str
    ambient_temperature: float
    ambient_humidity: float
    procedure_code: str
    equipment_used: str
    configured_tolerance: float
    tolerance_source: str
    calibration_interval_months: int
    overall_outcome: OverallOutcome
    max_error: float
    state: RecordState
    version: int
    notes: Optional[str]
    provenance_hash: Optional[str]
    is_demo: bool
    created_at: datetime
    finalized_at: Optional[datetime]
    finalized_by_id: Optional[int]
    
    logger: Optional[LoggerResponse] = None
    reference_instrument: Optional[ReferenceInstrumentResponse] = None
    technician: Optional[UserResponse] = None
    measurement_points: List[MeasurementPointResponse] = []

    class Config:
        from_attributes = True

class AmendmentCreate(BaseModel):
    reason: str = Field(..., min_length=5, description="Reason for calibration record correction")
    corrected_points: List[MeasurementPointInput]
    notes: Optional[str] = None

class AmendmentResponse(BaseModel):
    id: int
    record_id: int
    user_id: int
    version: int
    reason: str
    previous_data: str
    new_data: str
    timestamp: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Audit Event Schemas ---
class AuditEventResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity_type: str
    entity_id: str
    details: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime
    previous_hash: Optional[str]
    current_hash: str
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    logger_id: Optional[int]
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime
    logger_identifier: Optional[str] = None

    class Config:
        from_attributes = True

# --- Dashboard Schemas ---
class DashboardMetrics(BaseModel):
    total_loggers: int
    valid_calibrations: int
    due_soon_calibrations: int
    overdue_calibrations: int
    failed_calibrations: int
    status_distribution: dict
    activity_timeline: List[dict]
    upcoming_calibrations: List[dict]
    recent_calibrations: List[dict]
    reference_instruments_count: int
    expired_reference_count: int
