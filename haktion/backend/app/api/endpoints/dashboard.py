from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from app.core.database import get_db
from app.models.entities import (
    TemperatureLogger, ReferenceInstrument, CalibrationRecord,
    AuditEvent, Notification, OverallOutcome, RecordState, LoggerStatus
)
from app.schemas.all_schemas import DashboardMetrics
from app.api.deps import get_current_user
from app.services.alert_service import refresh_system_notifications_and_statuses

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Ensure alerts are actively evaluated against current time
    refresh_system_notifications_and_statuses(db)
    
    now = datetime.now(timezone.utc)
    due_30_thresh = now + timedelta(days=30)
    
    total_loggers = db.query(TemperatureLogger).filter(TemperatureLogger.status != LoggerStatus.RETIRED).count()
    
    # Logger validity counts
    valid_count = 0
    due_soon_count = 0
    overdue_count = 0
    failed_count = 0
    
    active_loggers = db.query(TemperatureLogger).filter(TemperatureLogger.status != LoggerStatus.RETIRED).all()
    for l in active_loggers:
        latest = (
            db.query(CalibrationRecord)
            .filter(CalibrationRecord.logger_id == l.id, CalibrationRecord.state != RecordState.DRAFT)
            .order_by(CalibrationRecord.calibration_date.desc())
            .first()
        )
        if latest and latest.overall_outcome == OverallOutcome.FAIL_STATUS:
            failed_count += 1
        elif l.next_due_date:
            due_dt = l.next_due_date
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
            if due_dt < now:
                overdue_count += 1
            elif due_dt <= due_30_thresh:
                due_soon_count += 1
            else:
                valid_count += 1
        else:
            # Not yet calibrated
            pass
            
    # Status distribution
    status_distribution = {
        "Valid": valid_count,
        "Due Soon": due_soon_count,
        "Overdue": overdue_count,
        "Failed": failed_count,
        "Uncalibrated": max(0, total_loggers - (valid_count + due_soon_count + overdue_count + failed_count))
    }
    
    # Activity timeline (Calibrations per month for the last 6 months)
    activity_timeline = []
    for i in range(5, -1, -1):
        target_month_date = now - timedelta(days=i * 30)
        month_label = target_month_date.strftime("%b %Y")
        
        # Approximate month bounds
        start_of_month = datetime(target_month_date.year, target_month_date.month, 1, tzinfo=timezone.utc)
        if target_month_date.month == 12:
            end_of_month = datetime(target_month_date.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_of_month = datetime(target_month_date.year, target_month_date.month + 1, 1, tzinfo=timezone.utc)
            
        pass_cals = db.query(CalibrationRecord).filter(
            CalibrationRecord.calibration_date >= start_of_month,
            CalibrationRecord.calibration_date < end_of_month,
            CalibrationRecord.overall_outcome == OverallOutcome.PASS_STATUS
        ).count()
        
        fail_cals = db.query(CalibrationRecord).filter(
            CalibrationRecord.calibration_date >= start_of_month,
            CalibrationRecord.calibration_date < end_of_month,
            CalibrationRecord.overall_outcome == OverallOutcome.FAIL_STATUS
        ).count()
        
        activity_timeline.append({
            "month": month_label,
            "Passed": pass_cals,
            "Failed": fail_cals,
            "Total": pass_cals + fail_cals
        })
        
    # Upcoming calibration due dates table
    upcoming_records = (
        db.query(TemperatureLogger)
        .filter(TemperatureLogger.next_due_date != None, TemperatureLogger.status == LoggerStatus.ACTIVE)
        .order_by(TemperatureLogger.next_due_date.asc())
        .limit(8)
        .all()
    )
    upcoming_list = []
    for ul in upcoming_records:
        due_dt = ul.next_due_date
        if due_dt.tzinfo is None:
            due_dt = due_dt.replace(tzinfo=timezone.utc)
        days_remaining = (due_dt.date() - now.date()).days
        upcoming_list.append({
            "id": ul.id,
            "logger_id": ul.logger_id,
            "model": f"{ul.manufacturer} {ul.model}",
            "location": ul.location,
            "owner": ul.owner,
            "next_due_date": ul.next_due_date.strftime("%Y-%m-%d"),
            "days_remaining": days_remaining,
            "status": "Overdue" if days_remaining < 0 else ("Due Soon" if days_remaining <= 30 else "On Schedule")
        })
        
    # Recent calibrations
    recent_cals = (
        db.query(CalibrationRecord)
        .order_by(CalibrationRecord.calibration_date.desc())
        .limit(6)
        .all()
    )
    recent_list = []
    for rc in recent_cals:
        recent_list.append({
            "id": rc.id,
            "record_number": rc.record_number,
            "logger_id": rc.logger.logger_id if rc.logger else "N/A",
            "model": f"{rc.logger.manufacturer} {rc.logger.model}" if rc.logger else "N/A",
            "technician": rc.technician.full_name if rc.technician else "N/A",
            "date": rc.calibration_date.strftime("%Y-%m-%d"),
            "max_error": rc.max_error,
            "outcome": rc.overall_outcome.value,
            "state": rc.state.value
        })
        
    total_refs = db.query(ReferenceInstrument).count()
    expired_refs = 0
    all_refs = db.query(ReferenceInstrument).all()
    for r in all_refs:
        exp = r.expiry_date
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            expired_refs += 1
            
    return {
        "total_loggers": total_loggers,
        "valid_calibrations": valid_count,
        "due_soon_calibrations": due_soon_count,
        "overdue_calibrations": overdue_count,
        "failed_calibrations": failed_count,
        "status_distribution": status_distribution,
        "activity_timeline": activity_timeline,
        "upcoming_calibrations": upcoming_list,
        "recent_calibrations": recent_list,
        "reference_instruments_count": total_refs,
        "expired_reference_count": expired_refs
    }
