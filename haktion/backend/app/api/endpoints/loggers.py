from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.entities import TemperatureLogger, User, UserRole, LoggerStatus
from app.schemas.all_schemas import LoggerCreate, LoggerUpdate, LoggerResponse
from app.api.deps import get_current_user, require_technician_or_admin, require_admin
from app.services.audit_service import create_audit_event
from app.services.alert_service import calculate_logger_status

router = APIRouter(prefix="/loggers", tags=["Temperature Loggers"])

@router.get("", response_model=List[LoggerResponse])
def list_loggers(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TemperatureLogger)
    if status:
        query = query.filter(TemperatureLogger.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (TemperatureLogger.logger_id.like(search_pattern)) |
            (TemperatureLogger.serial_number.like(search_pattern)) |
            (TemperatureLogger.manufacturer.like(search_pattern)) |
            (TemperatureLogger.model.like(search_pattern)) |
            (TemperatureLogger.location.like(search_pattern))
        )
    loggers = query.order_by(TemperatureLogger.id.desc()).offset(skip).limit(limit).all()
    
    # Enrich with dynamic calibration status
    res = []
    for l in loggers:
        cal_status = calculate_logger_status(l, db)
        l_dict = {c.name: getattr(l, c.name) for c in l.__table__.columns}
        l_dict["calibration_status"] = cal_status
        res.append(l_dict)
    return res

@router.post("", response_model=LoggerResponse, status_code=status.HTTP_201_CREATED)
def create_logger(
    logger_in: LoggerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin)
):
    # Check duplicate logger_id
    if db.query(TemperatureLogger).filter(TemperatureLogger.logger_id == logger_in.logger_id).first():
        raise HTTPException(status_code=400, detail=f"Logger ID '{logger_in.logger_id}' already exists.")
    # Check duplicate serial_number
    if db.query(TemperatureLogger).filter(TemperatureLogger.serial_number == logger_in.serial_number).first():
        raise HTTPException(status_code=400, detail=f"Serial Number '{logger_in.serial_number}' is already registered.")
        
    db_logger = TemperatureLogger(**logger_in.model_dump())
    db.add(db_logger)
    db.flush()
    
    create_audit_event(
        db=db,
        action="LOGGER_CREATED",
        entity_type="TemperatureLogger",
        entity_id=str(db_logger.id),
        details={"logger_id": db_logger.logger_id, "serial_number": db_logger.serial_number},
        user_id=current_user.id
    )
    db.commit()
    db.refresh(db_logger)
    
    cal_status = calculate_logger_status(db_logger, db)
    l_dict = {c.name: getattr(db_logger, c.name) for c in db_logger.__table__.columns}
    l_dict["calibration_status"] = cal_status
    return l_dict

@router.get("/{logger_id}", response_model=LoggerResponse)
def get_logger_details(
    logger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logger = db.query(TemperatureLogger).filter(TemperatureLogger.id == logger_id).first()
    if not logger:
        raise HTTPException(status_code=404, detail="Temperature logger not found")
    cal_status = calculate_logger_status(logger, db)
    l_dict = {c.name: getattr(logger, c.name) for c in logger.__table__.columns}
    l_dict["calibration_status"] = cal_status
    return l_dict

@router.put("/{logger_id}", response_model=LoggerResponse)
def update_logger(
    logger_id: int,
    logger_in: LoggerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin)
):
    logger = db.query(TemperatureLogger).filter(TemperatureLogger.id == logger_id).first()
    if not logger:
        raise HTTPException(status_code=404, detail="Temperature logger not found")
        
    update_data = logger_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(logger, field, val)
        
    create_audit_event(
        db=db,
        action="LOGGER_UPDATED",
        entity_type="TemperatureLogger",
        entity_id=str(logger.id),
        details=update_data,
        user_id=current_user.id
    )
    db.commit()
    db.refresh(logger)
    
    cal_status = calculate_logger_status(logger, db)
    l_dict = {c.name: getattr(logger, c.name) for c in logger.__table__.columns}
    l_dict["calibration_status"] = cal_status
    return l_dict

@router.delete("/{logger_id}")
def delete_logger(
    logger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    logger = db.query(TemperatureLogger).filter(TemperatureLogger.id == logger_id).first()
    if not logger:
        raise HTTPException(status_code=404, detail="Temperature logger not found")
        
    create_audit_event(
        db=db,
        action="LOGGER_DELETED",
        entity_type="TemperatureLogger",
        entity_id=str(logger.id),
        details={"logger_id": logger.logger_id, "serial_number": logger.serial_number},
        user_id=current_user.id
    )
    db.delete(logger)
    db.commit()
    return {"message": f"Logger {logger.logger_id} deleted successfully."}
