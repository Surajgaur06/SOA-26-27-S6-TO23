from fastapi import APIRouter
from app.api.endpoints import auth, loggers, reference_instruments, calibrations, dashboard, audit_and_alerts

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(loggers.router)
api_router.include_router(reference_instruments.router)
api_router.include_router(calibrations.router)
api_router.include_router(dashboard.router)
api_router.include_router(audit_and_alerts.router)
