from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.entities import ReferenceInstrument, User
from app.schemas.all_schemas import ReferenceInstrumentCreate, ReferenceInstrumentUpdate, ReferenceInstrumentResponse
from app.api.deps import get_current_user, require_technician_or_admin, require_admin
from app.services.audit_service import create_audit_event

router = APIRouter(prefix="/reference-instruments", tags=["Reference Instruments"])

@router.get("", response_model=List[ReferenceInstrumentResponse])
def list_reference_instruments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    instruments = db.query(ReferenceInstrument).order_by(ReferenceInstrument.id.asc()).all()
    
    res = []
    for inst in instruments:
        exp_dt = inst.expiry_date
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        is_expired = exp_dt < now
        inst_dict = {c.name: getattr(inst, c.name) for c in inst.__table__.columns}
        inst_dict["is_expired"] = is_expired
        res.append(inst_dict)
    return res

@router.post("", response_model=ReferenceInstrumentResponse, status_code=status.HTTP_201_CREATED)
def create_reference_instrument(
    inst_in: ReferenceInstrumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin)
):
    if db.query(ReferenceInstrument).filter(ReferenceInstrument.instrument_id == inst_in.instrument_id).first():
        raise HTTPException(status_code=400, detail=f"Reference Instrument ID '{inst_in.instrument_id}' already exists.")
    if db.query(ReferenceInstrument).filter(ReferenceInstrument.serial_number == inst_in.serial_number).first():
        raise HTTPException(status_code=400, detail=f"Serial Number '{inst_in.serial_number}' is already registered.")
        
    db_inst = ReferenceInstrument(**inst_in.model_dump())
    db.add(db_inst)
    db.flush()
    
    create_audit_event(
        db=db,
        action="REFERENCE_INSTRUMENT_CREATED",
        entity_type="ReferenceInstrument",
        entity_id=str(db_inst.id),
        details={"instrument_id": db_inst.instrument_id, "cert_no": db_inst.certificate_number},
        user_id=current_user.id
    )
    db.commit()
    db.refresh(db_inst)
    
    now = datetime.now(timezone.utc)
    exp_dt = db_inst.expiry_date
    if exp_dt.tzinfo is None:
        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
    inst_dict = {c.name: getattr(db_inst, c.name) for c in db_inst.__table__.columns}
    inst_dict["is_expired"] = exp_dt < now
    return inst_dict

@router.get("/{inst_id}", response_model=ReferenceInstrumentResponse)
def get_reference_instrument(
    inst_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inst = db.query(ReferenceInstrument).filter(ReferenceInstrument.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Reference instrument not found")
        
    now = datetime.now(timezone.utc)
    exp_dt = inst.expiry_date
    if exp_dt.tzinfo is None:
        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
    inst_dict = {c.name: getattr(inst, c.name) for c in inst.__table__.columns}
    inst_dict["is_expired"] = exp_dt < now
    return inst_dict

@router.put("/{inst_id}", response_model=ReferenceInstrumentResponse)
def update_reference_instrument(
    inst_id: int,
    inst_in: ReferenceInstrumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin)
):
    inst = db.query(ReferenceInstrument).filter(ReferenceInstrument.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Reference instrument not found")
        
    update_data = inst_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(inst, field, val)
        
    create_audit_event(
        db=db,
        action="REFERENCE_INSTRUMENT_UPDATED",
        entity_type="ReferenceInstrument",
        entity_id=str(inst.id),
        details=update_data,
        user_id=current_user.id
    )
    db.commit()
    db.refresh(inst)
    
    now = datetime.now(timezone.utc)
    exp_dt = inst.expiry_date
    if exp_dt.tzinfo is None:
        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
    inst_dict = {c.name: getattr(inst, c.name) for c in inst.__table__.columns}
    inst_dict["is_expired"] = exp_dt < now
    return inst_dict
