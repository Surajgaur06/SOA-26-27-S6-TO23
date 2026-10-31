# TempTrace – Temperature Logger Calibration Provenance & Traceability System

A full-stack, metrology-grade web application for laboratory temperature logger calibration lifecycle management, measurement error calculation, provenance tracking via cryptographic hash chaining, validity monitoring, and automated PDF report generation.

---

## 1. System Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    REACT FRONTEND                                     |
|               Vite + TypeScript + Tailwind CSS + Recharts + Lucide React              |
|  - Dashboard View (Live KPIs & Recharts Volume/Donut Charts)                         |
|  - Loggers Management (Full CRUD, Duplicate S/N Validation)                           |
|  - 5-Step Guided Calibration Workflow                                                 |
|  - Calibration Records Repository & PDF/CSV Download                                  |
|  - Longitudinal Drift Trends & Tolerance Margins                                      |
|  - Reference Instruments & Expiry Monitoring                                          |
|  - Append-Only Hash-Chained Audit Trail                                               |
|  - Dynamic Notifications & Alert Threshold Engine                                     |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            | REST API calls (JWT Bearer Token)
                                            v
+---------------------------------------------------------------------------------------+
|                                    FASTAPI BACKEND                                    |
|                       Python 3.13 + FastAPI + Pydantic + ReportLab                    |
|  - Auth & RBAC (Admin, Technician, Auditor)                                           |
|  - Metrology Engine (Error = Logger - Ref, Absolute Error, Tolerance Boundary Passes)  |
|  - Provenance Fingerprinting (SHA-256 Digest of inputs, results, and technician)      |
|  - Tamper-Evident Hash-Chained Audit Service                                          |
|  - ReportLab PDF Certificate Generator (with Educational/Demo Watermarks)             |
|  - Alerts & Recalibration Validity Lifecycle Worker                                   |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            | SQLAlchemy 2.0 ORM (PyMySQL / SQLite)
                                            v
+---------------------------------------------------------------------------------------+
|                                  DATABASE STORAGE                                     |
|                                MySQL 8.0 / SQLite                                     |
|  - users                     - temperature_loggers     - reference_instruments         |
|  - calibration_records       - measurement_points      - calibration_amendments       |
|  - calibration_procedures    - audit_events (append)   - notifications                |
+---------------------------------------------------------------------------------------+
```

---

## 2. Database ER Diagram

```
       +-----------------------+                    +-----------------------------+
       |         users         |                    |    reference_instruments    |
       +-----------------------+                    +-----------------------------+
       | id (PK)               |                    | id (PK)                     |
       | username (UQ)         |                    | instrument_id (UQ)          |
       | email (UQ)            |                    | certificate_number          |
       | hashed_password       |                    | calibration_date            |
       | role [admin/tech/aud] |                    | expiry_date                 |
       +-----------+-----------+                    | stated_uncertainty          |
                   |                                | traceability_details        |
                   | 1                              +--------------+--------------+
                   |                                               | 1
                   |                                               |
                   v N                                             v N
       +-----------+-----------------------------------------------+-----------+
       |                          calibration_records                          |
       +-----------------------------------------------------------------------+
       | id (PK)                                                               |
       | record_number (UQ)                                                    |
       | logger_id (FK -> temperature_loggers.id)                              |
       | reference_instrument_id (FK -> reference_instruments.id)              |
       | technician_id (FK -> users.id)                                        |
       | calibration_date                                                      |
       | configured_tolerance, tolerance_source                                |
       | overall_outcome [pass/fail/conditional]                               |
       | max_error                                                             |
       | state [draft/finalized/amended], version                              |
       | provenance_hash (SHA-256 cryptographic digest)                        |
       | finalized_at, finalized_by_id (FK -> users.id)                        |
       +-------------------+-------------------------------+-------------------+
                           | 1                             | 1
                           |                               |
                           v N                             v N
+--------------------------+----------+       +------------+--------------+
|   calibration_measurement_points    |       |   calibration_amendments  |
+-------------------------------------+       +---------------------------+
| id (PK)                             |       | id (PK)                   |
| record_id (FK)                      |       | record_id (FK)            |
| sequence                            |       | user_id (FK -> users.id)  |
| nominal_temperature                 |       | version                   |
| reference_reading                   |       | reason                    |
| logger_reading                      |       | previous_data (JSON)      |
| error (Logger - Ref)                |       | new_data (JSON)           |
| abs_error                           |       | timestamp                 |
| allowed_tolerance                   |       +---------------------------+
| outcome [pass/fail]                 |
+-------------------------------------+

       +-----------------------+                    +-----------------------------+
       |  temperature_loggers  |                    |        audit_events         |
       +-----------------------+                    +-----------------------------+
       | id (PK)               |                    | id (PK)                     |
       | logger_id (UQ)        |                    | user_id (FK)                |
       | serial_number (UQ)    |                    | action, entity_type, id     |
       | manufacturer, model   |                    | timestamp                   |
       | measurement_range     |                    | previous_hash (SHA-256)     |
       | accuracy_spec         |                    | current_hash (SHA-256)      |
       | next_due_date         |                    +-----------------------------+
       | status                |
       +-----------+-----------+
                   | 1
                   v N
       +-----------+-----------+
       |     notifications     |
       +-----------------------+
       | id (PK)               |
       | logger_id (FK)        |
       | title, message, type  |
       | is_read, created_at   |
       +-----------------------+
```

---

## 3. Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React, Axios, date-fns.
- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic 2.10, PyMySQL, ReportLab, Pytest, python-jose, passlib.
- **Database**: MySQL 8.0 / SQLite (configurable via `.env`).
- **Reports**: ReportLab Metrology-Grade PDF Generator with watermarked educational & demo disclaimers.

---

## 4. Quick Start (Windows PowerShell)

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm
- MySQL Server 8.0 (Optional; defaults to preconfigured SQLite for zero-setup execution)

### 1. Setup Backend
Open a PowerShell terminal in the project root:

```powershell
cd "d:\3rd year odd sem\SOA\soa hakton\backend"

# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. Seed sample data (12 loggers, 3 standards, 20 historical calibrations, 3 user personas)
python seed_data.py

# 4. Run automated tests (13 test cases)
pytest -v

# 5. Start FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend Swagger Docs will be available at:* `http://127.0.0.1:8000/api/v1/docs`

### 2. Setup Frontend
Open a separate PowerShell terminal:

```powershell
cd "d:\3rd year odd sem\SOA\soa hakton\frontend"

# 1. Install dependencies
npm install

# 2. Verify TypeScript build
npm run build

# 3. Launch Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```
*Frontend Application will be available at:* `http://127.0.0.1:5173`

---

## 5. Demo Credentials

The login modal contains one-click buttons to sign in as any persona:

| Role | Username | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Lead Administrator** | `admin` | `admin123` | Full CRUD, user management, logger deletion, calibration approval |
| **Calibration Technician** | `tech` | `tech123` | Create loggers, perform calibrations, submit drafts, record formal amendments |
| **Quality Auditor** | `auditor` | `auditor123` | Read-only compliance access to audit trails, history, certificates, and alerts |

---

## 6. Verification of Acceptance Criteria

1. **Calculations**:
   - `Error = Logger Reading - Reference Reading`
   - `Absolute Error = |Error|`
   - `Pass: Absolute Error <= Allowed Tolerance; else Fail`
   - Overall Outcome is `PASS` only if **all** test points pass tolerance.
2. **Provenance & Audit**:
   - Each finalized record receives a SHA-256 cryptographic digest of its inputs, setpoints, readings, and technician identifier.
   - All events append to an audit table chaining `previous_hash` with `current_hash`.
3. **Formal Amendments**:
   - Finalized records cannot be silently altered. Modifying a completed record creates a formal amendment preserving original readings, amended readings, user, timestamp, and amendment justification.
4. **PDF Reports & Disclaimers**:
   - Downloadable via `/api/v1/calibrations/{id}/pdf`.
   - Prominently labels documents as **EDUCATIONAL & DEMONSTRATION CALIBRATION REPORTS** without falsely claiming ISO/IEC 17025 accredited laboratory authority.
