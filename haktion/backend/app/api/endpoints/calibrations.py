from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
import json

from app.core.database import get_db
from app.models.entities import (
    CalibrationRecord, CalibrationMeasurementPoint, CalibrationAmendment,
    TemperatureLogger, ReferenceInstrument, User, RecordState, PointOutcome, OverallOutcome
)
from app.schemas.all_schemas import (
    CalibrationDraftCreate, CalibrationRecordResponse, MeasurementPointInput,
    AmendmentCreate, AmendmentResponse
)
from app.api.deps import get_current_user, require_technician_or_admin
from app.services.calibration_engine import calculate_measurement_point, evaluate_overall_calibration
from app.services.audit_service import create_audit_event, compute_calibration_provenance_hash
from app.services.report_service import generate_calibration_pdf, generate_calibration_csv
from app.services.alert_service import refresh_system_notifications_and_statuses

router = APIRouter(prefix="/calibrations", tags=["Calibrations"])

@router.get("", response_model=List[CalibrationRecordResponse])
def list_calibrations(
    skip: int = 0,
    limit: int = 50,
    state: Optional[str] = None,
    logger_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CalibrationRecord)
    if state:
        query = query.filter(CalibrationRecord.state == state)
    if logger_id:
        query = query.filter(CalibrationRecord.logger_id == logger_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.join(CalibrationRecord.logger).filter(
            (CalibrationRecord.record_number.like(search_pattern)) |
            (TemperatureLogger.logger_id.like(search_pattern)) |
            (TemperatureLogger.serial_number.like(search_pattern))
        )
    return query.order_by(CalibrationRecord.calibration_date.desc()).offset(skip).limit(limit).all()

@router.post("/draft", response_model=CalibrationRecordResponse, status_code=status.HTTP_201_CREATED)
def save_calibration_draft(
    draft_in: CalibrationDraftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin)
):
    logger = db.query(TemperatureLogger).filter(TemperatureLogger.id == draft_in.logger_id).first()
    if not logger:
        raise HTTPException(status_code=404, detail="Temperature logger not found")
        
    ref_inst = db.query(ReferenceInstrument).filter(ReferenceInstrument.id == draft_in.reference_instrument_id).first()
    if not ref_inst:
        raise HTTPException(status_code=404, detail="Reference instrument not found")
        
    # Generate record number if omitted
    rec_num = draft_in.record_number
    if not rec_num:
        count = db.query(CalibrationRecord).count() + 1
        rec_num = f"CAL-2026-{count:04d}"
        
    # Evaluate points
    evaluated_pts = []
    for pt in draft_in.measurement_points:
        res = calculate_measurement_point(
            nominal_temperature=pt.nominal_temperature,
            reference_reading=pt.reference_reading,
            logger_reading=pt.logger_reading,
            allowed_tolerance=pt.allowed_tolerance or draft_in.configured_tolerance,
            ref_uncertainty=pt.ref_uncertainty
        )
        res["sequence"] = pt.sequence
        res["unit"] = pt.unit
        res["repeated_readings"] = pt.repeated_readings
        evaluated_pts.append(res)
        
    overall_outcome, max_err = evaluate_overall_calibration(evaluated_pts)
    
    cal_record = CalibrationRecord(
        record_number=rec_num,
        logger_id=logger.id,
        reference_instrument_id=ref_inst.id,
        technician_id=current_user.id,
        calibration_date=draft_in.calibration_date or datetime.now(timezone.utc),
        location=draft_in.location,
        ambient_temperature=draft_in.ambient_temperature,
        ambient_humidity=draft_in.ambient_humidity,
        procedure_code=draft_in.procedure_code,
        equipment_used=draft_in.equipment_used,
        configured_tolerance=draft_in.configured_tolerance,
        tolerance_source=draft_in.tolerance_source,
        calibration_interval_months=draft_in.calibration_interval_months,
        overall_outcome=overall_outcome,
        max_error=max_err,
        state=RecordState.DRAFT,
        version=1,
        notes=draft_in.notes,
        is_demo=True
    )
    db.add(cal_record)
    db.flush()
    
    for pt in evaluated_pts:
        mp = CalibrationMeasurementPoint(
            record_id=cal_record.id,
            sequence=pt["sequence"],
            nominal_temperature=pt["nominal_temperature"],
            reference_reading=pt["reference_reading"],
            logger_reading=pt["logger_reading"],
            unit=pt["unit"],
            ref_uncertainty=pt["ref_uncertainty"],
            allowed_tolerance=pt["allowed_tolerance"],
            error=pt["error"],
            abs_error=pt["abs_error"],
            outcome=pt["outcome"],
            repeated_readings=pt["repeated_readings"]
        )
        db.add(mp)
        
    create_audit_event(
        db=db,
        action="CALIBRATION_DRAFT_SAVED",
        entity_type="CalibrationRecord",
        entity_id=str(cal_record.id),
        details={"record_number": rec_num, "logger_id": logger.logger_id, "points_count": len(evaluated_pts)},
        user_id=current_user.id
    )
    
    db.commit()
    db.refresh(cal_record)
    return cal_record

@router.post("/{record_id}/finalize", response_model=CalibrationRecordResponse)
def finalize_calibration(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin)
):
    record = db.query(CalibrationRecord).filter(CalibrationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Calibration record not found")
        
    if record.state == RecordState.FINALIZED:
        raise HTTPException(status_code=400, detail="Record is already finalized. Modifications must be recorded via amendment.")
        
    if not record.measurement_points:
        raise HTTPException(status_code=400, detail="Cannot finalize a calibration record without measurement points.")
        
    # Transactional finalization
    record.state = RecordState.FINALIZED
    record.finalized_at = datetime.now(timezone.utc)
    record.finalized_by_id = current_user.id
    
    # Calculate cryptographic provenance fingerprint
    prov_hash = compute_calibration_provenance_hash(
        record_number=record.record_number,
        logger_id=record.logger_id,
        ref_instrument_id=record.reference_instrument_id,
        cal_date=record.calibration_date,
        technician_id=record.technician_id,
        measurement_points=record.measurement_points
    )
    record.provenance_hash = prov_hash
    
    # Update logger calibration validity timestamps
    logger = record.logger
    logger.last_calibration_date = record.calibration_date
    logger.next_due_date = record.calibration_date + relativedelta(months=record.calibration_interval_months)
    
    create_audit_event(
        db=db,
        action="CALIBRATION_FINALIZED",
        entity_type="CalibrationRecord",
        entity_id=str(record.id),
        details={
            "record_number": record.record_number,
            "overall_outcome": record.overall_outcome.value,
            "provenance_hash": prov_hash,
            "next_due_date": logger.next_due_date.isoformat()
        },
        user_id=current_user.id
    )
    
    db.commit()
    db.refresh(record)
    
    # Refresh alerts
    refresh_system_notifications_and_statuses(db)
    
    return record

@router.get("/{record_id}", response_model=CalibrationRecordResponse)
def get_calibration_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(CalibrationRecord).filter(CalibrationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Calibration record not found")
    return record

@router.post("/{record_id}/amend", response_model=CalibrationRecordResponse)
def amend_finalized_calibration(
    record_id: int,
    amendment_in: AmendmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin)
):
    record = db.query(CalibrationRecord).filter(CalibrationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Calibration record not found")
        
    if record.state != RecordState.FINALIZED and record.state != RecordState.AMENDED:
        raise HTTPException(status_code=400, detail="Only finalized or amended records require formal amendment workflow.")
        
    # Serialize previous data
    prev_snapshot = {
        "record_number": record.record_number,
        "max_error": record.max_error,
        "overall_outcome": record.overall_outcome.value,
        "provenance_hash": record.provenance_hash,
        "points": [
            {
                "nominal": p.nominal_temperature,
                "ref": p.reference_reading,
                "logger": p.logger_reading,
                "error": p.error,
                "outcome": p.outcome.value
            }
            for p in record.measurement_points
        ]
    }
    
    # Recalculate with corrected points
    evaluated_pts = []
    for pt in amendment_in.corrected_points:
        res = calculate_measurement_point(
            nominal_temperature=pt.nominal_temperature,
            reference_reading=pt.reference_reading,
            logger_reading=pt.logger_reading,
            allowed_tolerance=pt.allowed_tolerance or record.configured_tolerance,
            ref_uncertainty=pt.ref_uncertainty
        )
        res["sequence"] = pt.sequence
        res["unit"] = pt.unit
        res["repeated_readings"] = pt.repeated_readings
        evaluated_pts.append(res)
        
    new_outcome, new_max_err = evaluate_overall_calibration(evaluated_pts)
    
    # Clear old points and replace with corrected
    for old_p in list(record.measurement_points):
        db.delete(old_p)
    db.flush()
    
    for pt in evaluated_pts:
        mp = CalibrationMeasurementPoint(
            record_id=record.id,
            sequence=pt["sequence"],
            nominal_temperature=pt["nominal_temperature"],
            reference_reading=pt["reference_reading"],
            logger_reading=pt["logger_reading"],
            unit=pt["unit"],
            ref_uncertainty=pt["ref_uncertainty"],
            allowed_tolerance=pt["allowed_tolerance"],
            error=pt["error"],
            abs_error=pt["abs_error"],
            outcome=pt["outcome"],
            repeated_readings=pt["repeated_readings"]
        )
        db.add(mp)
        
    record.version += 1
    record.state = RecordState.AMENDED
    record.overall_outcome = new_outcome
    record.max_error = new_max_err
    if amendment_in.notes:
        record.notes = f"{record.notes or ''} [Amendment v{record.version}: {amendment_in.notes}]".strip()
        
    # Recompute cryptographic provenance hash for the new version
    db.flush()
    db.refresh(record)
    new_prov_hash = compute_calibration_provenance_hash(
        record_number=record.record_number,
        logger_id=record.logger_id,
        ref_instrument_id=record.reference_instrument_id,
        cal_date=record.calibration_date,
        technician_id=record.technician_id,
        measurement_points=record.measurement_points
    )
    record.provenance_hash = new_prov_hash
    
    new_snapshot = {
        "version": record.version,
        "max_error": record.max_error,
        "overall_outcome": record.overall_outcome.value,
        "provenance_hash": new_prov_hash,
        "amendment_reason": amendment_in.reason,
        "points": [
            {
                "nominal": p.nominal_temperature,
                "ref": p.reference_reading,
                "logger": p.logger_reading,
                "error": p.error,
                "outcome": p.outcome.value
            }
            for p in record.measurement_points
        ]
    }
    
    amendment = CalibrationAmendment(
        record_id=record.id,
        user_id=current_user.id,
        version=record.version,
        reason=amendment_in.reason,
        previous_data=json.dumps(prev_snapshot),
        new_data=json.dumps(new_snapshot),
        timestamp=datetime.now(timezone.utc)
    )
    db.add(amendment)
    
    create_audit_event(
        db=db,
        action="CALIBRATION_AMENDED",
        entity_type="CalibrationRecord",
        entity_id=str(record.id),
        details={
            "version": record.version,
            "reason": amendment_in.reason,
            "previous_outcome": prev_snapshot["overall_outcome"],
            "new_outcome": new_outcome.value
        },
        user_id=current_user.id
    )
    
    db.commit()
    db.refresh(record)
    return record

@router.get("/{record_id}/pdf")
def download_pdf_report(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(CalibrationRecord).filter(CalibrationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Calibration record not found")
        
    pdf_bytes = generate_calibration_pdf(record)
    filename = f"Calibration_Report_{record.record_number}.pdf"
    
    create_audit_event(
        db=db,
        action="REPORT_DOWNLOADED_PDF",
        entity_type="CalibrationRecord",
        entity_id=str(record.id),
        details={"filename": filename},
        user_id=current_user.id
    )
    db.commit()
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{record_id}/csv")
def download_csv_export(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(CalibrationRecord).filter(CalibrationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Calibration record not found")
        
    csv_str = generate_calibration_csv(record)
    filename = f"Calibration_Data_{record.record_number}.csv"
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{record_id}/amendments", response_model=List[AmendmentResponse])
def get_amendments(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    amends = db.query(CalibrationAmendment).filter(CalibrationAmendment.record_id == record_id).order_by(CalibrationAmendment.version.asc()).all()
    res = []
    for a in amends:
        d = {c.name: getattr(a, c.name) for c in a.__table__.columns}
        d["user_name"] = a.user.full_name if a.user else "System"
        res.append(d)
    return res
