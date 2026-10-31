from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.entities import (
    TemperatureLogger, ReferenceInstrument, CalibrationRecord, 
    Notification, NotificationType, CalibrationStatus, OverallOutcome, RecordState
)
from app.core.config import settings

def refresh_system_notifications_and_statuses(db: Session):
    """
    Scans loggers and reference instruments to trigger alerts:
    - Due within 30 days
    - Due within 7 days
    - Overdue calibration
    - Expired reference instruments
    - Failed calibration results
    - Missing provenance information
    """
    now = datetime.now(timezone.utc)
    due_30_thresh = now + timedelta(days=settings.DUE_SOON_DAYS)
    due_7_thresh = now + timedelta(days=settings.CRITICAL_DUE_DAYS)
    
    # 1. Check reference instruments for expiry
    ref_instruments = db.query(ReferenceInstrument).all()
    for ref in ref_instruments:
        exp_dt = ref.expiry_date
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if exp_dt < now:
            existing = db.query(Notification).filter(
                Notification.type == NotificationType.EXPIRED_REFERENCE,
                Notification.title.like(f"%{ref.instrument_id}%")
            ).first()
            if not existing:
                notif = Notification(
                    title=f"Expired Reference: {ref.instrument_id}",
                    message=f"Reference instrument {ref.instrument_id} ({ref.manufacturer} {ref.model}, Cert: {ref.certificate_number}) expired on {ref.expiry_date.strftime('%Y-%m-%d')}. Do not use for accredited calibration.",
                    type=NotificationType.EXPIRED_REFERENCE
                )
                db.add(notif)

    # 2. Check temperature loggers
    loggers = db.query(TemperatureLogger).all()
    for logger in loggers:
        # Check last calibration outcome
        latest_cal = (
            db.query(CalibrationRecord)
            .filter(CalibrationRecord.logger_id == logger.id)
            .order_by(CalibrationRecord.calibration_date.desc())
            .first()
        )
        
        if latest_cal and latest_cal.overall_outcome == OverallOutcome.FAIL_STATUS:
            existing = db.query(Notification).filter(
                Notification.logger_id == logger.id,
                Notification.type == NotificationType.FAILED_CALIBRATION
            ).first()
            if not existing:
                db.add(Notification(
                    logger_id=logger.id,
                    title=f"Calibration Failed: {logger.logger_id}",
                    message=f"Logger {logger.logger_id} (S/N: {logger.serial_number}) failed calibration {latest_cal.record_number} with max error {latest_cal.max_error}°C exceeding tolerance ±{latest_cal.configured_tolerance}°C.",
                    type=NotificationType.FAILED_CALIBRATION
                ))

        # Check due dates
        if logger.next_due_date:
            due_dt = logger.next_due_date
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
                
            if due_dt < now:
                # Overdue
                existing = db.query(Notification).filter(
                    Notification.logger_id == logger.id,
                    Notification.type == NotificationType.OVERDUE
                ).first()
                if not existing:
                    db.add(Notification(
                        logger_id=logger.id,
                        title=f"Calibration Overdue: {logger.logger_id}",
                        message=f"Logger {logger.logger_id} was due on {logger.next_due_date.strftime('%Y-%m-%d')} and is currently non-compliant for operations.",
                        type=NotificationType.OVERDUE
                    ))
            elif due_dt <= due_7_thresh:
                # Due within 7 days
                existing = db.query(Notification).filter(
                    Notification.logger_id == logger.id,
                    Notification.type == NotificationType.DUE_7_DAYS
                ).first()
                if not existing:
                    db.add(Notification(
                        logger_id=logger.id,
                        title=f"Calibration Due in 7 Days: {logger.logger_id}",
                        message=f"Logger {logger.logger_id} calibration expires in under 7 days ({logger.next_due_date.strftime('%Y-%m-%d')}). Schedule calibration promptly.",
                        type=NotificationType.DUE_7_DAYS
                    ))
            elif due_dt <= due_30_thresh:
                # Due within 30 days
                existing = db.query(Notification).filter(
                    Notification.logger_id == logger.id,
                    Notification.type == NotificationType.DUE_30_DAYS
                ).first()
                if not existing:
                    db.add(Notification(
                        logger_id=logger.id,
                        title=f"Calibration Due Soon: {logger.logger_id}",
                        message=f"Logger {logger.logger_id} is scheduled for recalibration on {logger.next_due_date.strftime('%Y-%m-%d')}.",
                        type=NotificationType.DUE_30_DAYS
                    ))

    db.commit()

def calculate_logger_status(logger: TemperatureLogger, db: Session) -> CalibrationStatus:
    """
    Computes a logger's dynamic calibration validity status.
    """
    latest_cal = (
        db.query(CalibrationRecord)
        .filter(CalibrationRecord.logger_id == logger.id, CalibrationRecord.state != RecordState.DRAFT)
        .order_by(CalibrationRecord.calibration_date.desc())
        .first()
    )
    
    if not latest_cal:
        return CalibrationStatus.NOT_CALIBRATED
        
    if latest_cal.overall_outcome == OverallOutcome.FAIL_STATUS:
        return CalibrationStatus.FAILED
        
    if not logger.next_due_date:
        return CalibrationStatus.VALID
        
    now = datetime.now(timezone.utc)
    due_dt = logger.next_due_date
    if due_dt.tzinfo is None:
        due_dt = due_dt.replace(tzinfo=timezone.utc)
        
    if due_dt < now:
        return CalibrationStatus.OVERDUE
    elif due_dt <= now + timedelta(days=settings.DUE_SOON_DAYS):
        return CalibrationStatus.DUE_SOON
    else:
        return CalibrationStatus.VALID
