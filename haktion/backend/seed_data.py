import os
import sys
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta

# Append backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.entities import (
    User, UserRole, TemperatureLogger, LoggerStatus,
    ReferenceInstrument, CalibrationProcedure, CalibrationRecord,
    CalibrationMeasurementPoint, CalibrationAmendment, RecordState,
    PointOutcome, OverallOutcome
)
from app.services.calibration_engine import calculate_measurement_point, evaluate_overall_calibration
from app.services.audit_service import create_audit_event, compute_calibration_provenance_hash
from app.services.alert_service import refresh_system_notifications_and_statuses

def seed_database():
    print("[Seed] Creating all database tables if not present...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Users
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if not existing_admin:
            print("[Seed] Seeding default users (Admin, Technician, Auditor)...")
            admin_user = User(
                username="admin",
                email="admin@temptrace.lab",
                full_name="Sarah Jenkins (Lead Metrologist)",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            tech_user = User(
                username="tech",
                email="tech@temptrace.lab",
                full_name="David Patel (Calibration Technician)",
                hashed_password=get_password_hash("tech123"),
                role=UserRole.TECHNICIAN,
                is_active=True
            )
            auditor_user = User(
                username="auditor",
                email="auditor@temptrace.lab",
                full_name="Elena Vance (Quality Auditor)",
                hashed_password=get_password_hash("auditor123"),
                role=UserRole.AUDITOR,
                is_active=True
            )
            db.add_all([admin_user, tech_user, auditor_user])
            db.flush()
            
            create_audit_event(db, "INITIAL_SYSTEM_BOOTSTRAP", "System", "0", {"message": "Created default role accounts"}, admin_user.id)
            db.commit()
        else:
            admin_user = existing_admin
            tech_user = db.query(User).filter(User.username == "tech").first()
            
        # 2. Reference Instruments
        if db.query(ReferenceInstrument).count() == 0:
            print("[Seed] Seeding Reference Instruments (PRTs, Dry-wells, Reference Thermocouples)...")
            now = datetime.now(timezone.utc)
            ref_instruments = [
                ReferenceInstrument(
                    instrument_id="REF-PRT-001",
                    manufacturer="Fluke Metrology",
                    model="5628 Secondary Standard PRT",
                    serial_number="PRT-98214-FLK",
                    measurement_range="-200°C to +660°C",
                    certificate_number="NIST-CAL-2025-9921",
                    calibration_provider="National Metrology Institute / Hart Calibration Labs",
                    calibration_date=now - timedelta(days=120),
                    expiry_date=now + timedelta(days=245),
                    stated_uncertainty="U = 0.008°C (k=2, 95% CL)",
                    traceability_details="Direct chain traceable to ITS-90 fixed points (Argon, Mercury, Gallium, Tin, Zinc)",
                    certificate_file_ref="/certs/NIST_CAL_2025_9921.pdf",
                    is_active=True
                ),
                ReferenceInstrument(
                    instrument_id="REF-BATH-002",
                    manufacturer="Isotech Metrology",
                    model="915 Oceanus Liquid Calibration Bath",
                    serial_number="ISO-OCEAN-4412",
                    measurement_range="-45°C to +140°C",
                    certificate_number="DAKKS-ISO-2025-8812",
                    calibration_provider="DAkkS Accredited Calibration Center #419",
                    calibration_date=now - timedelta(days=200),
                    expiry_date=now + timedelta(days=165),
                    stated_uncertainty="Stability ±0.005°C, Axial Uniformity ±0.010°C",
                    traceability_details="Calibrated against standard SPRT #SPRT-012 under accredited DKD-R 5-1 guideline",
                    certificate_file_ref="/certs/DAKKS_ISO_2025_8812.pdf",
                    is_active=True
                ),
                ReferenceInstrument(
                    instrument_id="REF-DRY-003",
                    manufacturer="Ametek Mansfield & Green",
                    model="RTC-159 Ultra Cooler Dry Block",
                    serial_number="AMT-RTC-7721",
                    measurement_range="-100°C to +155°C",
                    certificate_number="EXP-AMT-2024-1102",
                    calibration_provider="Metrology Services Midwest Inc.",
                    calibration_date=now - timedelta(days=400),
                    expiry_date=now - timedelta(days=35), # Deliberately EXPIRED for alert & warning demonstration!
                    stated_uncertainty="U = 0.04°C (k=2)",
                    traceability_details="Traceable to NIST Standard Reference Material #1968 via Transfer Standard PRT",
                    certificate_file_ref="/certs/EXP_AMT_2024_1102.pdf",
                    is_active=False
                )
            ]
            db.add_all(ref_instruments)
            db.commit()

        # 3. Calibration Procedures
        if db.query(CalibrationProcedure).count() == 0:
            print("[Seed] Seeding Standard Operating Calibration Procedures...")
            procedures = [
                CalibrationProcedure(
                    code="SOP-CAL-001",
                    title="Standard Multi-Point Comparison for Liquid Nitrogen & Cold Chain Loggers",
                    version="3.2",
                    description="5-point comparison calibration across -80°C, -20°C, 0°C, 25°C, and 40°C in precision bath.",
                    standard_tolerance=0.50,
                    tolerance_source="WHO Cold Chain Equipment PQS E006 / USP <1079>"
                ),
                CalibrationProcedure(
                    code="SOP-CAL-002",
                    title="High-Precision Autoclave & Thermal Process Logger Verification",
                    version="2.0",
                    description="Testing points at 25°C, 100°C, 121°C, and 134°C against reference standard.",
                    standard_tolerance=0.30,
                    tolerance_source="ISO 11140-4 / EN 285 Sterilization Standard"
                ),
                CalibrationProcedure(
                    code="SOP-CAL-003",
                    title="Ambient Warehouse & Stability Chamber Multi-Sensor Audit",
                    version="1.5",
                    description="Comparison at 15°C, 25°C, and 37°C for environmental monitoring loggers.",
                    standard_tolerance=0.40,
                    tolerance_source="ICH Q1A(R2) Stability Testing Guideline"
                )
            ]
            db.add_all(procedures)
            db.commit()

        # 4. Temperature Loggers (At least 10 loggers covering all statuses)
        if db.query(TemperatureLogger).count() == 0:
            print("[Seed] Seeding 12 realistic Temperature Loggers with varied schedules...")
            now = datetime.now(timezone.utc)
            
            loggers_data = [
                {
                    "logger_id": "TL-001",
                    "manufacturer": "Elpro",
                    "model": "LIBERO Cx-BLE Multi-Use",
                    "serial_number": "ELP-LIB-90112",
                    "logger_type": "Wireless Bluetooth",
                    "measurement_range": "-30°C to +70°C",
                    "resolution": 0.01,
                    "accuracy_spec": "±0.30°C",
                    "location": "Cold Room B - Vaccine Reserve",
                    "owner": "Dr. Sarah Jenkins",
                    "commissioning_date": now - timedelta(days=450),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=60),
                    "next_due_date": now + timedelta(days=305), # Valid
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Primary logger for mRNA vaccine deep-storage depot."
                },
                {
                    "logger_id": "TL-002",
                    "manufacturer": "SenseAnywhere",
                    "model": "AiroSensor 20-20-43",
                    "serial_number": "SA-AIR-88201",
                    "logger_type": "Cloud IoT Wireless",
                    "measurement_range": "-40°C to +70°C",
                    "resolution": 0.01,
                    "accuracy_spec": "±0.25°C",
                    "location": "Stability Chamber #3 (25°C/60% RH)",
                    "owner": "Marcus Bell",
                    "commissioning_date": now - timedelta(days=600),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=345),
                    "next_due_date": now + timedelta(days=20), # Due soon (20 days!)
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Recalibration appointment required before month end."
                },
                {
                    "logger_id": "TL-003",
                    "manufacturer": "Testo",
                    "model": "176 T4 High-Precision Thermocouple",
                    "serial_number": "TST-176-55410",
                    "logger_type": "4-Channel Thermocouple",
                    "measurement_range": "-100°C to +400°C",
                    "resolution": 0.05,
                    "accuracy_spec": "±0.30°C",
                    "location": "Lyophilization Bay 1",
                    "owner": "Elena Vance",
                    "commissioning_date": now - timedelta(days=750),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=380),
                    "next_due_date": now - timedelta(days=15), # OVERDUE!
                    "status": LoggerStatus.ACTIVE,
                    "notes": "FLAGGED OVERDUE. Non-compliant for pharmaceutical release."
                },
                {
                    "logger_id": "TL-004",
                    "manufacturer": "MadgeTech",
                    "model": "HiTemp140 Submersible Autoclave",
                    "serial_number": "MT-HI-140-9943",
                    "logger_type": "Submersible RTD",
                    "measurement_range": "-40°C to +140°C",
                    "resolution": 0.01,
                    "accuracy_spec": "±0.10°C",
                    "location": "Sterilization Facility - Autoclave 2",
                    "owner": "David Patel",
                    "commissioning_date": now - timedelta(days=300),
                    "calibration_interval_months": 6,
                    "last_calibration_date": now - timedelta(days=30),
                    "next_due_date": now + timedelta(days=150), # Valid
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Cleanroom food and drug grade certified casing."
                },
                {
                    "logger_id": "TL-005",
                    "manufacturer": "Omega Engineering",
                    "model": "OM-CP-OCTTEMP-A",
                    "serial_number": "OMG-CP-8CH-3321",
                    "logger_type": "8-Channel RTD Data Recorder",
                    "measurement_range": "-200°C to +850°C",
                    "resolution": 0.01,
                    "accuracy_spec": "±0.50°C",
                    "location": "Calibration Workshop Bench 4",
                    "owner": "David Patel",
                    "commissioning_date": now - timedelta(days=500),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=15),
                    "next_due_date": now + timedelta(days=350), # Failed calibration history
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Failed point at 50°C during latest test. Out of tolerance."
                },
                {
                    "logger_id": "TL-006",
                    "manufacturer": "TandD Corporation",
                    "model": "TR-71nw LAN Connected",
                    "serial_number": "TND-71-44120",
                    "logger_type": "Ethernet Temperature",
                    "measurement_range": "-40°C to +110°C",
                    "resolution": 0.1,
                    "accuracy_spec": "±0.30°C",
                    "location": "Reagent Refrigerator R-04",
                    "owner": "Karen Brooks",
                    "commissioning_date": now - timedelta(days=400),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=360),
                    "next_due_date": now + timedelta(days=5), # Critical Due in 5 days!
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Due in under 7 days alert threshold."
                },
                {
                    "logger_id": "TL-007",
                    "manufacturer": "Vaisala",
                    "model": "RFL100 Wireless Transmitter",
                    "serial_number": "VAI-RFL-11984",
                    "logger_type": "Wireless VaiNet Sub-GHz",
                    "measurement_range": "-196°C to +90°C",
                    "resolution": 0.01,
                    "accuracy_spec": "±0.15°C",
                    "location": "Cryogenic Tank Cryo-A",
                    "owner": "Dr. Sarah Jenkins",
                    "commissioning_date": now - timedelta(days=200),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=90),
                    "next_due_date": now + timedelta(days=275), # Valid
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Liquid nitrogen cryo monitoring."
                },
                {
                    "logger_id": "TL-008",
                    "manufacturer": "Onset HOBO",
                    "model": "MX1101 Data Logger",
                    "serial_number": "HBO-MX-77299",
                    "logger_type": "Bluetooth Low Energy",
                    "measurement_range": "-20°C to +70°C",
                    "resolution": 0.02,
                    "accuracy_spec": "±0.21°C",
                    "location": "Finished Goods Shipping Dock",
                    "owner": "Logistics Operations",
                    "commissioning_date": now - timedelta(days=180),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=110),
                    "next_due_date": now + timedelta(days=255), # Valid
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Ambient pallet conditioning monitor."
                },
                {
                    "logger_id": "TL-009",
                    "manufacturer": "Dickson",
                    "model": "Touchscreen OCEAView",
                    "serial_number": "DKS-TS-66120",
                    "logger_type": "Display WiFi Logger",
                    "measurement_range": "-30°C to +50°C",
                    "resolution": 0.1,
                    "accuracy_spec": "±0.50°C",
                    "location": "Plasma Freezer P-12",
                    "owner": "Elena Vance",
                    "commissioning_date": now - timedelta(days=900),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=420),
                    "next_due_date": now - timedelta(days=55), # Overdue
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Severely overdue calibration."
                },
                {
                    "logger_id": "TL-010",
                    "manufacturer": "Lascar Electronics",
                    "model": "EL-USB-1 Direct USB",
                    "serial_number": "LSC-USB-33012",
                    "logger_type": "Direct USB Flash",
                    "measurement_range": "-35°C to +80°C",
                    "resolution": 0.5,
                    "accuracy_spec": "±0.50°C",
                    "location": "Sample Archive Room 102",
                    "owner": "Dr. Sarah Jenkins",
                    "commissioning_date": now - timedelta(days=100),
                    "calibration_interval_months": 12,
                    "last_calibration_date": None, # Never calibrated
                    "next_due_date": None,
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Newly commissioned unit awaiting initial baseline calibration."
                },
                {
                    "logger_id": "TL-011",
                    "manufacturer": "Rotronic",
                    "model": "HygroLog HL-1D Compact",
                    "serial_number": "ROT-HL-88319",
                    "logger_type": "Compact Autonomous",
                    "measurement_range": "-20°C to +70°C",
                    "resolution": 0.1,
                    "accuracy_spec": "±0.30°C",
                    "location": "Incubator Suite 4",
                    "owner": "Marcus Bell",
                    "commissioning_date": now - timedelta(days=1200),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=500),
                    "next_due_date": now - timedelta(days=135),
                    "status": LoggerStatus.RETIRED,
                    "notes": "Retired due to damaged USB connector pin."
                },
                {
                    "logger_id": "TL-012",
                    "manufacturer": "Sensitech",
                    "model": "TempTale Ultra Real-Time",
                    "serial_number": "SNS-TTU-55018",
                    "logger_type": "Cellular IoT Real-Time",
                    "measurement_range": "-30°C to +70°C",
                    "resolution": 0.1,
                    "accuracy_spec": "±0.50°C",
                    "location": "Global Cold Chain Transport 9",
                    "owner": "Logistics Operations",
                    "commissioning_date": now - timedelta(days=150),
                    "calibration_interval_months": 12,
                    "last_calibration_date": now - timedelta(days=70),
                    "next_due_date": now + timedelta(days=295),
                    "status": LoggerStatus.ACTIVE,
                    "notes": "Active transit unit with cellular telemetry."
                }
            ]
            
            for ld in loggers_data:
                logger_obj = TemperatureLogger(**ld)
                db.add(logger_obj)
            db.commit()

        # 5. Calibration Records (At least 20 historical calibrations)
        if db.query(CalibrationRecord).count() == 0:
            print("[Seed] Seeding 20 realistic Calibration Records with detailed multi-point measurements...")
            all_loggers = db.query(TemperatureLogger).all()
            logger_map = {l.logger_id: l for l in all_loggers}
            ref_prt = db.query(ReferenceInstrument).filter(ReferenceInstrument.instrument_id == "REF-PRT-001").first()
            ref_bath = db.query(ReferenceInstrument).filter(ReferenceInstrument.instrument_id == "REF-BATH-002").first()
            
            # Historical calibration templates
            cal_specs = [
                # TL-001 Pass calibrations
                {"rec": "CAL-2025-0014", "lid": "TL-001", "days_ago": 420, "points": [(-20, -20.012, -20.08), (0, 0.005, 0.04), (25, 24.992, 25.10)], "tol": 0.30, "fail": False},
                {"rec": "CAL-2026-0001", "lid": "TL-001", "days_ago": 60, "points": [(-20, -20.008, -19.92), (0, 0.003, 0.08), (25, 25.002, 25.05), (50, 49.998, 50.12)], "tol": 0.30, "fail": False},
                
                # TL-002 calibrations
                {"rec": "CAL-2025-0008", "lid": "TL-002", "days_ago": 345, "points": [(-20, -20.002, -20.12), (0, 0.001, 0.09), (25, 24.998, 25.15)], "tol": 0.30, "fail": False},
                
                # TL-003 Overdue logger past calibration
                {"rec": "CAL-2025-0004", "lid": "TL-003", "days_ago": 380, "points": [(0, 0.004, 0.12), (100, 99.982, 100.22), (200, 199.970, 200.28)], "tol": 0.40, "fail": False},
                
                # TL-004 Autoclave logger
                {"rec": "CAL-2025-0022", "lid": "TL-004", "days_ago": 210, "points": [(25, 25.001, 25.04), (100, 100.002, 100.06), (121, 121.000, 121.05)], "tol": 0.20, "fail": False},
                {"rec": "CAL-2026-0004", "lid": "TL-004", "days_ago": 30, "points": [(25, 25.000, 25.03), (100, 100.001, 100.04), (121, 121.002, 121.06), (134, 134.001, 134.08)], "tol": 0.20, "fail": False},
                
                # TL-005 FAILING calibration
                {"rec": "CAL-2026-0007", "lid": "TL-005", "days_ago": 15, "points": [(-20, -20.005, -20.15), (0, 0.002, 0.22), (25, 25.001, 25.38), (50, 49.992, 50.78)], "tol": 0.50, "fail": True},
                
                # TL-006 calibrations
                {"rec": "CAL-2025-0009", "lid": "TL-006", "days_ago": 360, "points": [(-20, -19.998, -20.10), (0, 0.004, 0.11), (25, 25.002, 25.14)], "tol": 0.40, "fail": False},
                
                # TL-007 Cryo logger
                {"rec": "CAL-2025-0025", "lid": "TL-007", "days_ago": 90, "points": [(-80, -80.005, -80.08), (-20, -20.001, -20.06), (0, 0.002, 0.05), (25, 25.001, 25.07)], "tol": 0.25, "fail": False},
                
                # TL-008 Warehouse logger
                {"rec": "CAL-2025-0019", "lid": "TL-008", "days_ago": 110, "points": [(5, 5.002, 5.09), (15, 15.001, 15.08), (25, 25.003, 25.11)], "tol": 0.30, "fail": False},
                
                # TL-009 Overdue logger
                {"rec": "CAL-2025-0002", "lid": "TL-009", "days_ago": 420, "points": [(-30, -30.010, -29.80), (0, 0.005, 0.22), (25, 25.002, 25.29)], "tol": 0.50, "fail": False},
                
                # TL-012 Transit logger
                {"rec": "CAL-2025-0030", "lid": "TL-012", "days_ago": 70, "points": [(-20, -20.003, -20.18), (0, 0.002, 0.15), (25, 25.001, 25.19)], "tol": 0.50, "fail": False},
                
                # Additional historical records for trends and depth
                {"rec": "CAL-2024-0010", "lid": "TL-001", "days_ago": 780, "points": [(-20, -20.015, -20.11), (0, 0.002, 0.06), (25, 25.005, 25.09)], "tol": 0.30, "fail": False},
                {"rec": "CAL-2024-0018", "lid": "TL-002", "days_ago": 710, "points": [(-20, -20.008, -20.09), (0, 0.003, 0.07), (25, 25.001, 25.12)], "tol": 0.30, "fail": False},
                {"rec": "CAL-2024-0025", "lid": "TL-003", "days_ago": 745, "points": [(0, 0.002, 0.10), (100, 99.990, 100.18)], "tol": 0.40, "fail": False},
                {"rec": "CAL-2025-0005", "lid": "TL-004", "days_ago": 390, "points": [(25, 25.001, 25.02), (100, 100.000, 100.05), (121, 121.001, 121.07)], "tol": 0.20, "fail": False},
                {"rec": "CAL-2025-0011", "lid": "TL-005", "days_ago": 380, "points": [(-20, -20.001, -20.08), (0, 0.001, 0.10), (25, 25.002, 25.15)], "tol": 0.50, "fail": False},
                {"rec": "CAL-2024-0033", "lid": "TL-006", "days_ago": 725, "points": [(-20, -20.004, -20.12), (0, 0.001, 0.08), (25, 25.003, 25.11)], "tol": 0.40, "fail": False},
                {"rec": "CAL-2024-0040", "lid": "TL-009", "days_ago": 785, "points": [(-30, -30.012, -29.85), (0, 0.003, 0.18), (25, 25.004, 25.22)], "tol": 0.50, "fail": False},
                {"rec": "CAL-2026-0009", "lid": "TL-008", "days_ago": 12, "points": [(5, 5.001, 5.08), (15, 15.002, 15.07), (25, 25.001, 25.09), (35, 34.998, 35.12)], "tol": 0.30, "fail": False},
            ]
            
            for spec in cal_specs:
                target_logger = logger_map.get(spec["lid"])
                if not target_logger:
                    continue
                    
                cal_time = datetime.now(timezone.utc) - timedelta(days=spec["days_ago"])
                eval_points = []
                for idx, (nom, r_val, l_val) in enumerate(spec["points"], start=1):
                    res = calculate_measurement_point(
                        nominal_temperature=float(nom),
                        reference_reading=float(r_val),
                        logger_reading=float(l_val),
                        allowed_tolerance=float(spec["tol"]),
                        ref_uncertainty=0.008
                    )
                    res["sequence"] = idx
                    res["unit"] = "°C"
                    eval_points.append(res)
                    
                overall_out, max_e = evaluate_overall_calibration(eval_points)
                
                cal_rec = CalibrationRecord(
                    record_number=spec["rec"],
                    logger_id=target_logger.id,
                    reference_instrument_id=ref_prt.id if idx % 2 == 0 else ref_bath.id,
                    technician_id=tech_user.id,
                    calibration_date=cal_time,
                    location="Primary Standards Calibration Laboratory",
                    ambient_temperature=22.4,
                    ambient_humidity=46.2,
                    procedure_code="SOP-CAL-001",
                    equipment_used="Fluke 5628 PRT & Isotech Oceanus stirred precision bath",
                    configured_tolerance=spec["tol"],
                    tolerance_source="Manufacturer Spec & ISO/IEC 17025 Demo standard",
                    calibration_interval_months=target_logger.calibration_interval_months,
                    overall_outcome=overall_out,
                    max_error=max_e,
                    state=RecordState.FINALIZED,
                    version=1,
                    notes="Baseline periodic calibration record completed in accordance with lab SOP.",
                    is_demo=True,
                    finalized_at=cal_time + timedelta(minutes=45),
                    finalized_by_id=admin_user.id
                )
                db.add(cal_rec)
                db.flush()
                
                pts_for_hash = []
                for ep in eval_points:
                    pt_obj = CalibrationMeasurementPoint(
                        record_id=cal_rec.id,
                        sequence=ep["sequence"],
                        nominal_temperature=ep["nominal_temperature"],
                        reference_reading=ep["reference_reading"],
                        logger_reading=ep["logger_reading"],
                        unit=ep["unit"],
                        ref_uncertainty=ep["ref_uncertainty"],
                        allowed_tolerance=ep["allowed_tolerance"],
                        error=ep["error"],
                        abs_error=ep["abs_error"],
                        outcome=ep["outcome"]
                    )
                    db.add(pt_obj)
                    pts_for_hash.append(pt_obj)
                    
                # Compute SHA-256 provenance fingerprint
                cal_rec.provenance_hash = compute_calibration_provenance_hash(
                    record_number=cal_rec.record_number,
                    logger_id=cal_rec.logger_id,
                    ref_instrument_id=cal_rec.reference_instrument_id,
                    cal_date=cal_rec.calibration_date,
                    technician_id=cal_rec.technician_id,
                    measurement_points=pts_for_hash
                )
                
                create_audit_event(
                    db=db,
                    action="CALIBRATION_FINALIZED",
                    entity_type="CalibrationRecord",
                    entity_id=str(cal_rec.id),
                    details={"record_number": cal_rec.record_number, "outcome": overall_out.value, "points": len(eval_points)},
                    user_id=tech_user.id
                )
                
            db.commit()
            print("[Seed] Successfully seeded 20 calibration records.")

        # 6. Trigger initial notification evaluation
        print("[Seed] Running notification and alerts engine...")
        refresh_system_notifications_and_statuses(db)
        
        print("[Seed] Database initialization and seed completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
