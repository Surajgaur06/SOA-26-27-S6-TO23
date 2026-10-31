import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.entities import AuditEvent, User

def calculate_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def create_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    details: Optional[dict] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None
) -> AuditEvent:
    """
    Creates an append-only audit event linked with a SHA-256 hash chain.
    Note on security limitations:
    A hash chain provides tamper-evidence within the append-only stream.
    If an adversary obtains root database access, they could theoretically recalculate
    the chain from a modified point onwards. In production environments, external
    immutable ledger anchoring or write-once remote logging complements local hash chaining.
    """
    # Fetch last audit event to get previous hash
    last_event = db.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
    prev_hash = last_event.current_hash if last_event else "GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000"
    
    timestamp = datetime.now(timezone.utc)
    details_str = json.dumps(details, default=str) if details else "{}"
    
    # Calculate hash of (prev_hash + timestamp + action + entity_type + entity_id + details + user_id)
    raw_payload = f"{prev_hash}|{timestamp.isoformat()}|{action}|{entity_type}|{entity_id}|{details_str}|{user_id}"
    curr_hash = calculate_sha256(raw_payload)
    
    event = AuditEvent(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details_str,
        ip_address=ip_address,
        timestamp=timestamp,
        previous_hash=prev_hash,
        current_hash=curr_hash
    )
    db.add(event)
    return event

def compute_calibration_provenance_hash(
    record_number: str,
    logger_id: int,
    ref_instrument_id: int,
    cal_date: datetime,
    technician_id: int,
    measurement_points: list
) -> str:
    """
    Computes a cryptographic SHA-256 fingerprint of the calibration inputs and measurement results.
    """
    payload = {
        "record_number": record_number,
        "logger_id": logger_id,
        "ref_instrument_id": ref_instrument_id,
        "cal_date": cal_date.isoformat(),
        "technician_id": technician_id,
        "points": [
            {
                "nominal": p.nominal_temperature,
                "ref": p.reference_reading,
                "logger": p.logger_reading,
                "error": p.error,
                "allowed_tol": p.allowed_tolerance,
                "outcome": str(p.outcome)
            }
            for p in measurement_points
        ]
    }
    return calculate_sha256(json.dumps(payload, sort_keys=True))
