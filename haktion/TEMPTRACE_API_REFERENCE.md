# TempTrace – Complete API Reference Specification

## 1. Specification Overview

The TempTrace REST API is designed according to OpenAPI 3.1 standards.
- **Base URL**: `http://localhost:8000/api/v1` (or `http://127.0.0.1:8000/api/v1`)
- **Documentation**: Swagger UI at `/api/v1/docs`, ReDoc at `/api/v1/redoc`
- **Default Authentication Scheme**: HTTP Authorization header with Bearer JWT:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Standard Content-Type**: `application/json` (except `/pdf` which yields `application/pdf` and `/csv` which yields `text/csv`).

---

## 2. API Endpoint Directory

| Category | Method | Path | Required Role | Summary |
| :--- | :---: | :--- | :--- | :--- |
| **System** | `GET` | `/` | Public | System status and API metadata |
| **System** | `GET` | `/health` | Public | Automated health check probe |
| **Authentication**| `POST`| `/api/v1/auth/login` | Public | Authenticate user & issue JWT |
| **Authentication**| `GET` | `/api/v1/auth/me` | Authenticated | Fetch current authenticated user |
| **Loggers** | `GET` | `/api/v1/loggers` | Authenticated | List all loggers with dynamic validity |
| **Loggers** | `POST`| `/api/v1/loggers` | Tech / Admin | Register new temperature logger |
| **Loggers** | `GET` | `/api/v1/loggers/{id}` | Authenticated | Retrieve details of specific logger |
| **Loggers** | `PUT` | `/api/v1/loggers/{id}` | Tech / Admin | Update existing logger specifications |
| **Loggers** | `DELETE`| `/api/v1/loggers/{id}` | Admin Only | Delete logger from inventory |
| **Standards** | `GET` | `/api/v1/reference-instruments` | Authenticated | List reference instruments & check expiry |
| **Standards** | `POST`| `/api/v1/reference-instruments` | Tech / Admin | Register new reference standard |
| **Standards** | `GET` | `/api/v1/reference-instruments/{id}` | Authenticated | Fetch specific reference standard |
| **Standards** | `PUT` | `/api/v1/reference-instruments/{id}` | Tech / Admin | Update reference standard certificate |
| **Calibrations** | `GET` | `/api/v1/calibrations` | Authenticated | Filter and search calibration records |
| **Calibrations** | `POST`| `/api/v1/calibrations/draft` | Tech / Admin | Calculate and save calibration draft |
| **Calibrations** | `POST`| `/api/v1/calibrations/{id}/finalize` | Tech / Admin | Finalize record & seal provenance hash |
| **Calibrations** | `GET` | `/api/v1/calibrations/{id}` | Authenticated | Get complete calibration record |
| **Calibrations** | `POST`| `/api/v1/calibrations/{id}/amend` | Tech / Admin | Submit formal post-finalization amendment |
| **Calibrations** | `GET` | `/api/v1/calibrations/{id}/pdf` | Authenticated | Download publication-grade PDF report |
| **Calibrations** | `GET` | `/api/v1/calibrations/{id}/csv` | Authenticated | Export raw measurement points to CSV |
| **Calibrations** | `GET` | `/api/v1/calibrations/{id}/amendments` | Authenticated | Retrieve amendment audit history |
| **Dashboard** | `GET` | `/api/v1/dashboard/metrics` | Authenticated | Aggregate telemetry, trends & run alert scanner |
| **Audit & Alerts** | `GET` | `/api/v1/audit-events` | Authenticated | Retrieve append-only SHA-256 audit ledger |
| **Audit & Alerts** | `GET` | `/api/v1/notifications` | Authenticated | Fetch active system alerts |
| **Audit & Alerts** | `POST`| `/api/v1/notifications/{id}/read`| Authenticated | Mark specific notification as read |
| **Audit & Alerts** | `POST`| `/api/v1/notifications/mark-all-read`| Authenticated | Bulk mark all notifications as read |

---

## 3. Detailed Endpoint Reference

### 3.1 Authentication & Profile

#### `POST /api/v1/auth/login`
- **Purpose**: Authenticates credentials, validates active status, writes a `USER_LOGIN` audit event, and returns a signed HS256 JWT access token.
- **Auth**: Public.
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": 1,
    "username": "admin",
    "full_name": "Sarah Jenkins (Lead Metrologist)",
    "role": "admin"
  }
  ```
- **Errors**: `401 Unauthorized` (Incorrect username or password), `400 Bad Request` (User account is inactive).
- **Database Operations**:
  - `SELECT * FROM users WHERE username = :username`
  - `INSERT INTO audit_events (action="USER_LOGIN", entity_type="User", ...)`

#### `GET /api/v1/auth/me`
- **Purpose**: Returns the authenticated user's profile.
- **Auth**: Authenticated (`get_current_user`).
- **Response `200 OK`**:
  ```json
  {
    "id": 1,
    "username": "admin",
    "email": "admin@temptrace.lab",
    "full_name": "Sarah Jenkins (Lead Metrologist)",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-10-29T08:44:00"
  }
  ```

---

### 3.2 Temperature Loggers Management

#### `GET /api/v1/loggers`
- **Purpose**: Retrieves all temperature loggers with query filters and dynamically computes current calibration validity (`valid`, `due_soon`, `overdue`, `failed`, `not_calibrated`).
- **Auth**: Authenticated.
- **Query Parameters**:
  - `skip` (integer, default: 0)
  - `limit` (integer, default: 100)
  - `status` (string, optional: `active`, `inactive`, `retired`)
  - `search` (string, optional: searches `logger_id`, `serial_number`, `manufacturer`, `model`, `location`)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "logger_id": "TL-001",
      "manufacturer": "MadgeTech",
      "model": "HiTemp140-FP",
      "serial_number": "MT-89210-A",
      "logger_type": "Flexible RTD Probe",
      "measurement_range": "-40°C to +140°C",
      "resolution": 0.01,
      "accuracy_spec": "±0.10°C",
      "location": "Vaccine Storage Ultra-Low Depo A",
      "owner": "Dr. Sarah Jenkins",
      "commissioning_date": "2024-03-15T00:00:00",
      "calibration_interval_months": 12,
      "last_calibration_date": "2026-04-10T10:00:00",
      "next_due_date": "2027-04-10T10:00:00",
      "status": "active",
      "calibration_status": "valid",
      "notes": "Primary cold chain monitor.",
      "created_at": "2026-10-29T08:44:00",
      "updated_at": "2026-10-29T08:44:00"
    }
  ]
  ```

#### `POST /api/v1/loggers`
- **Purpose**: Creates a new logger. Validates that both `logger_id` and `serial_number` are globally unique. Records a `LOGGER_CREATED` audit event.
- **Auth**: Required role: `technician` or `admin`.
- **Request Body**:
  ```json
  {
    "logger_id": "TL-015",
    "manufacturer": "Testo",
    "model": "176 T4 Quad Thermocouple",
    "serial_number": "TST-99412-K",
    "logger_type": "Multi-Channel Thermocouple",
    "measurement_range": "-200°C to +400°C",
    "resolution": 0.01,
    "accuracy_spec": "±0.30°C",
    "location": "Cryogenic Cryo-Freezer 04",
    "owner": "David Patel",
    "commissioning_date": "2026-10-30T00:00:00",
    "calibration_interval_months": 12,
    "status": "active",
    "notes": "Cryogenic storage logger"
  }
  ```
- **Response `201 Created`**: Returns created `LoggerResponse` schema.
- **Errors**: `400 Bad Request` ("Logger ID already exists" or "Serial Number is already registered").

#### `DELETE /api/v1/loggers/{logger_id}`
- **Purpose**: Deletes a logger and cascades deletion to linked calibration records. Records `LOGGER_DELETED` audit event.
- **Auth**: Required role: `admin` only.
- **Errors**: `403 Forbidden` (if accessed by Technician or Auditor), `404 Not Found`.

---

### 3.3 Reference Instruments

#### `GET /api/v1/reference-instruments`
- **Purpose**: Lists all metrology standards (PRTs, Dry-wells, Baths) and evaluates whether their external accreditation certificate has expired (`is_expired: true/false`).
- **Auth**: Authenticated.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "instrument_id": "REF-PRT-001",
      "manufacturer": "Fluke Metrology",
      "model": "5628 Secondary Standard PRT",
      "serial_number": "PRT-98214-FLK",
      "measurement_range": "-200°C to +660°C",
      "certificate_number": "NIST-CAL-2025-9921",
      "calibration_provider": "National Metrology Institute / Hart Calibration Labs",
      "calibration_date": "2026-06-30T08:44:00",
      "expiry_date": "2027-06-30T08:44:00",
      "stated_uncertainty": "U = 0.008°C (k=2, 95% CL)",
      "traceability_details": "Direct chain traceable to ITS-90 fixed points",
      "certificate_file_ref": "/certs/NIST_CAL_2025_9921.pdf",
      "is_active": true,
      "is_expired": false,
      "created_at": "2026-10-29T08:44:00"
    }
  ]
  ```

---

### 3.4 Calibration Lifecycle & Workflow

#### `POST /api/v1/calibrations/draft`
- **Purpose**: Executes the Metrology Engine to calculate individual errors and overall pass/fail, saves the record in state `draft`, stores measurement points, and appends a `CALIBRATION_DRAFT_SAVED` audit event.
- **Auth**: Required role: `technician` or `admin`.
- **Request Body**:
  ```json
  {
    "logger_id": 1,
    "reference_instrument_id": 1,
    "record_number": "CAL-2026-0045",
    "location": "Primary Environmental Calibration Lab #2",
    "ambient_temperature": 22.4,
    "ambient_humidity": 45.0,
    "procedure_code": "SOP-CAL-001",
    "equipment_used": "Fluke 5628 PRT & Isotech Oceanus Liquid Bath",
    "configured_tolerance": 0.50,
    "tolerance_source": "Manufacturer Standard Spec ±0.5°C",
    "calibration_interval_months": 12,
    "notes": "Routine annual calibration test.",
    "measurement_points": [
      {
        "sequence": 1,
        "nominal_temperature": -20.0,
        "reference_reading": -20.005,
        "logger_reading": -20.080,
        "unit": "°C",
        "allowed_tolerance": 0.50,
        "ref_uncertainty": 0.01
      },
      {
        "sequence": 2,
        "nominal_temperature": 0.0,
        "reference_reading": 0.002,
        "logger_reading": 0.040,
        "unit": "°C",
        "allowed_tolerance": 0.50,
        "ref_uncertainty": 0.01
      },
      {
        "sequence": 3,
        "nominal_temperature": 25.0,
        "reference_reading": 25.001,
        "logger_reading": 25.120,
        "unit": "°C",
        "allowed_tolerance": 0.50,
        "ref_uncertainty": 0.01
      }
    ]
  }
  ```
- **Response `201 Created`**: Returns `CalibrationRecordResponse` including calculated `error`, `abs_error`, and `outcome` for every point, plus `overall_outcome` and `max_error`.

#### `POST /api/v1/calibrations/{record_id}/finalize`
- **Purpose**: Transitions a draft record to `finalized`. Computes the 64-character SHA-256 cryptographic provenance hash over the record's inputs and results, updates the logger's `last_calibration_date` and `next_due_date`, records a `CALIBRATION_FINALIZED` audit block, and triggers the alert scanning engine.
- **Auth**: Required role: `technician` or `admin`.
- **Response `200 OK`**: Returns finalized `CalibrationRecordResponse` containing `provenance_hash` and `finalized_at`.
- **Errors**: `400 Bad Request` ("Record is already finalized. Modifications must be recorded via amendment." or "Cannot finalize without measurement points").

#### `POST /api/v1/calibrations/{record_id}/amend`
- **Purpose**: Formal post-finalization amendment workflow. Modifying a completed record preserves the previous data snapshot in JSON, stores corrected measurement points, increments the record's `version` counter, recalculates the SHA-256 provenance hash, creates a `calibration_amendments` audit row, and records a `CALIBRATION_AMENDED` audit event.
- **Auth**: Required role: `technician` or `admin`.
- **Request Body**:
  ```json
  {
    "reason": "Corrected reference thermometer offset due to calibration certificate typo.",
    "corrected_points": [
      {
        "sequence": 1,
        "nominal_temperature": -20.0,
        "reference_reading": -20.002,
        "logger_reading": -20.080,
        "allowed_tolerance": 0.50,
        "unit": "°C"
      }
    ],
    "notes": "Correction verified with Metrology Lead"
  }
  ```
- **Response `200 OK`**: Returns updated record with incremented version (e.g. `version: 2`), state `amended`, and refreshed provenance hash.

#### `GET /api/v1/calibrations/{record_id}/pdf`
- **Purpose**: Dynamically renders an official ReportLab PDF calibration report.
- **Auth**: Authenticated.
- **Response `200 OK`**:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename=Calibration_Report_CAL-2026-0001.pdf`

#### `GET /api/v1/calibrations/{record_id}/csv`
- **Purpose**: Generates and downloads raw comma-separated tabular calibration data.
- **Auth**: Authenticated.
- **Response `200 OK`**:
  - `Content-Type: text/csv`
  - `Content-Disposition: attachment; filename=Calibration_Data_CAL-2026-0001.csv`

---

### 3.5 Dashboard Telemetry

#### `GET /api/v1/dashboard/metrics`
- **Purpose**: Executes the background alert scanner, calculates fleet compliance KPIs, computes 6-month monthly verification totals, extracts upcoming calibration due dates, and returns recent activity.
- **Auth**: Authenticated.
- **Response `200 OK`**:
  ```json
  {
    "total_loggers": 12,
    "valid_calibrations": 8,
    "due_soon_calibrations": 2,
    "overdue_calibrations": 1,
    "failed_calibrations": 1,
    "status_distribution": {
      "Valid": 8,
      "Due Soon": 2,
      "Overdue": 1,
      "Failed": 1,
      "Uncalibrated": 0
    },
    "activity_timeline": [
      { "month": "May 2026", "Passed": 3, "Failed": 0, "Total": 3 },
      { "month": "Jun 2026", "Passed": 4, "Failed": 1, "Total": 5 }
    ],
    "upcoming_calibrations": [
      {
        "id": 4,
        "logger_id": "TL-004",
        "model": "Onset Computer HOBO UX100-014M",
        "location": "Cold Room B - Shelf 02",
        "owner": "David Patel",
        "next_due_date": "2026-11-05",
        "days_remaining": 6,
        "status": "Due Soon"
      }
    ],
    "recent_calibrations": [
      {
        "id": 20,
        "record_number": "CAL-2026-0020",
        "logger_id": "TL-001",
        "model": "MadgeTech HiTemp140-FP",
        "technician": "David Patel (Calibration Technician)",
        "date": "2026-10-20",
        "max_error": 0.119,
        "outcome": "pass",
        "state": "finalized"
      }
    ],
    "reference_instruments_count": 3,
    "expired_reference_count": 0
  }
  ```

---

### 3.6 Audit Trail & Notifications

#### `GET /api/v1/audit-events`
- **Purpose**: Retrieves the append-only cryptographic audit event chain.
- **Query Parameters**: `skip`, `limit`, `entity_type`, `action`.
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 45,
      "user_id": 2,
      "action": "CALIBRATION_FINALIZED",
      "entity_type": "CalibrationRecord",
      "entity_id": "20",
      "details": "{\"record_number\": \"CAL-2026-0020\", \"overall_outcome\": \"pass\", \"provenance_hash\": \"6c3a1b...\"}",
      "ip_address": null,
      "timestamp": "2026-10-30T03:08:00",
      "previous_hash": "4f9d2a01...",
      "current_hash": "8e71b29a...",
      "user_name": "David Patel (Calibration Technician)"
    }
  ]
  ```

#### `GET /api/v1/notifications`
- **Purpose**: Fetches system alerts.
- **Query Parameters**: `unread_only` (boolean, default: `false`).
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "logger_id": 4,
      "title": "Calibration Due in 7 Days: TL-004",
      "message": "Logger TL-004 calibration expires in under 7 days (2026-11-05). Schedule calibration promptly.",
      "type": "due_7_days",
      "is_read": false,
      "created_at": "2026-10-30T03:00:00",
      "logger_identifier": "TL-004"
    }
  ]
  ```

#### `POST /api/v1/notifications/{notif_id}/read`
- **Purpose**: Sets `is_read = true` for the designated notification ID.
- **Response `200 OK`**: `{"message": "Notification marked as read"}`.

#### `POST /api/v1/notifications/mark-all-read`
- **Purpose**: Bulk updates all notifications to `is_read = true`.
- **Response `200 OK`**: `{"message": "All notifications marked as read"}`.

