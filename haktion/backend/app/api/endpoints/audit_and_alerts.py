from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.entities import AuditEvent, Notification, User
from app.schemas.all_schemas import AuditEventResponse, NotificationResponse
from app.api.deps import get_current_user, require_admin

router = APIRouter(tags=["Audit & Notifications"])

@router.get("/audit-events", response_model=List[AuditEventResponse])
def get_audit_events(
    skip: int = 0,
    limit: int = 100,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AuditEvent)
    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type)
    if action:
        query = query.filter(AuditEvent.action == action)
        
    events = query.order_by(AuditEvent.id.desc()).offset(skip).limit(limit).all()
    res = []
    for e in events:
        d = {c.name: getattr(e, c.name) for c in e.__table__.columns}
        d["user_name"] = e.user.full_name if e.user else "System"
        res.append(d)
    return res

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    notifs = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    res = []
    for n in notifs:
        d = {c.name: getattr(n, c.name) for c in n.__table__.columns}
        d["logger_identifier"] = n.logger.logger_id if n.logger else None
        res.append(d)
    return res

@router.post("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/notifications/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).update({Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read"}
