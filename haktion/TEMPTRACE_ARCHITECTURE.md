# TempTrace – Complete System Architecture Document

## 1. System Overview & Architectural Philosophy

**TempTrace** is a metrology-grade, full-stack laboratory calibration provenance and traceability management platform. It addresses the operational and regulatory need to track temperature data logger calibration lifecycles, verify measurement accuracy against calibrated laboratory standards, enforce strict acceptance limits, generate tamper-evident audit trails via cryptographic hash chaining, and export publication-ready calibration certificates in PDF and CSV formats.

The architecture strictly adheres to standard software engineering principles:
- **Separation of Concerns**: Decoupled React frontend (Single-Page Application), asynchronous FastAPI REST API backend, domain-specific metrology calculation engine, and relational persistence layer (MySQL / SQLite).
- **Defense in Depth**: JWT bearer token authentication, bcrypt password hashing, role-based access control (RBAC), parameter validation via Pydantic v2 schemas, and parameterized queries via SQLAlchemy 2.0 ORM.
- **Data Integrity & Traceability**: Append-only cryptographic hash chaining (SHA-256) for audit logging and deterministic record fingerprinting.
- **Fail-Safe Metrology Logic**: Deterministic floating-point error evaluation with four-decimal precision rounding to avoid IEEE 754 rounding artifacts.

---

## 2. End-to-End System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Presentation Layer (React 19 + Vite + Tailwind CSS)"]
        UI_Dash["DashboardView (KPIs, Donut & Bar Charts)"]
        UI_Loggers["LoggersView (Inventory & Lifecycle)"]
        UI_Refs["ReferenceInstrumentsView (Standards & Expiry)"]
        UI_Workflow["NewCalibrationWorkflow (5-Step Guided Wizard)"]
        UI_Records["CalibrationRecordsView (Repository & Amendments)"]
        UI_History["CalibrationHistoryView (Sensor Drift Trends)"]
        UI_Certs["CertificatesView (PDF & CSV Downloads)"]
        UI_Audit["AuditTrailView (Cryptographic Hash Explorer)"]
        UI_Notifs["NotificationsView (Threshold Alerts)"]
        UI_Settings["SettingsView (Tolerances & Thresholds)"]
        AxiosClient["Axios Interceptor Layer (Bearer JWT & Error Catching)"]
    end

    subgraph ApiGateway ["API Routing & Security Layer (FastAPI)"]
        AuthRouter["/api/v1/auth (Login, Token Exchange, /me)"]
        LoggersRouter["/api/v1/loggers (CRUD, Serial Check, Status Calculation)"]
        RefsRouter["/api/v1/reference-instruments (Standards Tracking)"]
        CalRouter["/api/v1/calibrations (Draft, Finalize, Amend, PDF, CSV)"]
        DashRouter["/api/v1/dashboard/metrics (Telemetry, Activity, Recalibration Scan)"]
        AuditRouter["/api/v1/audit-events & /notifications"]
        JWTSecurity["deps.py: get_current_user & require_role (RBAC)"]
    end

    subgraph ServiceEngine ["Core Metrology & Business Logic Services"]
        MetrologyEngine["calibration_engine.py\nError = Logger - Ref\nAbsolute Error = |Error|\nBoundary Pass/Fail Evaluation"]
        AuditEngine["audit_service.py\nSHA-256 Block Chaining\nDeterministic Record Fingerprinting"]
        ReportEngine["report_service.py\nReportLab Metrology PDF Generator\nWatermarked Educational Disclaimers\nCSV Export Engine"]
        AlertEngine["alert_service.py\n30-Day & 7-Day Expiry Scanner\nOverdue & Out-of-Tolerance Alerts"]
    end

    subgraph PersistenceLayer ["Data Storage & Relational Persistence (SQLAlchemy 2.0)"]
        ORM["SQLAlchemy ORM Entities (entities.py)"]
        Database[("MySQL 8.0 / SQLite (temptrace.db)\nInnoDB, Foreign Keys, UTF-8")]
    end

    UI_Dash & UI_Loggers & UI_Refs & UI_Workflow & UI_Records & UI_History & UI_Certs & UI_Audit & UI_Notifs & UI_Settings --> AxiosClient
    AxiosClient -->|"HTTP REST + JSON (Bearer Token)"| ApiGateway
    AuthRouter & LoggersRouter & RefsRouter & CalRouter & DashRouter & AuditRouter --> JWTSecurity
    JWTSecurity --> ServiceEngine
    CalRouter --> MetrologyEngine
    CalRouter & LoggersRouter & RefsRouter & AuthRouter --> AuditEngine
    CalRouter --> ReportEngine
    DashRouter & CalRouter --> AlertEngine
    ServiceEngine --> ORM
    ORM --> Database
```

---

## 3. Frontend Architecture

### 3.1 Technology Stack & Tooling
- **Core Library**: React 19 (`react`, `react-dom`) using functional components and React Hooks (`useState`, `useEffect`, `useContext`, `useMemo`).
- **Build System**: Vite 8 with TypeScript (`@vitejs/plugin-react`) delivering instant HMR (Hot Module Replacement) and optimized tree-shaken static production bundles.
- **Styling**: Tailwind CSS v4 utilizing Utility-First classes for responsive, modern, laboratory-grade UI aesthetics with high contrast and dark mode neutral slates.
- **Data Visualizations**: Recharts (`ResponsiveContainer`, `BarChart`, `PieChart`, `LineChart`, `Cell`, `Tooltip`, `Legend`, `ReferenceLine`).
- **Icons**: Lucide React (`ShieldCheck`, `Scale`, `Activity`, `Clock`, `AlertTriangle`, `CheckCircle2`, `XCircle`, `FileText`, `Download`).
- **HTTP Client**: Axios configured with request/response interceptors.

### 3.2 State Management & Authentication Flow
State management is organized hierarchically:
1. **Global Auth State (`AuthContext.tsx`)**:
   - Manages `token` (JWT string) and `user` profile (`id`, `username`, `email`, `full_name`, `role`).
   - Persists credentials in `localStorage` under keys `temptrace_token` and `temptrace_user`.
   - Exposes `login()`, `logout()`, and `isAuthenticated` boolean flag.
   - Listens to global window custom event `auth_logout` dispatched by Axios interceptors upon receiving HTTP 401 responses.
2. **Local Component State**:
   - Manages table pagination, search query strings, modal view visibility, multi-step wizard state, form inputs, and inline calculation feedback.
3. **API Interceptor Architecture (`services/api.ts`)**:
   - Outgoing requests automatically inject `Authorization: Bearer <token>`.
   - Incoming responses intercept 401 Unauthorized status, clear cached credentials, and trigger seamless redirection to the authentication modal.

### 3.3 Component Hierarchy & Navigation
The application employs a Single-Page Application (SPA) layout controlled via conditional tab rendering in [App.tsx](file:///d:/3rd%20year%20odd%20sem/SOA/soa%20hakton/frontend/src/App.tsx):
- `Sidebar.tsx`: Persistent collapsible navigation drawer showing navigation items, live unread badge count, and user persona sign-out.
- Dynamic Main Viewport:
  - `DashboardView`: Operational metrology overview, KPI widgets, 6-month calibration verification bar chart, validity donut chart, upcoming recalibration schedule.
  - `LoggersView`: Fleet inventory grid, duplicate serial checking, status badges, calibration interval tracking, details drawer.
  - `ReferenceInstrumentsView`: Metrology reference standards, manufacturer certificates, stated uncertainties, expiry monitoring.
  - `NewCalibrationWorkflow`: 5-step interactive calibration wizard with real-time metrology error calculation.
  - `CalibrationRecordsView`: Historical calibration repository, certificate viewing, formal amendment authoring modal.
  - `CalibrationHistoryView`: Longitudinal sensor drift charts plotting error progression against ±tolerance boundaries over time.
  - `CertificatesView`: Formal certificate repository, direct PDF download, raw data CSV export.
  - `AuditTrailView`: Cryptographic append-only hash chain inspector with SHA-256 block verification.
  - `NotificationsView`: Filterable alerts for overdue, due-soon, and failed calibrations.
  - `SettingsView`: User profile inspection, acceptance limit defaults, and alert threshold configuration.

---

## 4. Backend Architecture

### 4.1 Framework & Core Modules
- **Framework**: FastAPI on Python 3.13 utilizing Starlette for ASGI routing and Pydantic v2 for JSON serialization and schema validation.
- **ASGI Server**: Uvicorn running with asynchronous event loops.
- **ORM & Database Abstraction**: SQLAlchemy 2.0 Declarative ORM supporting dialect swapping between SQLite (`sqlite:///./temptrace.db`) and MySQL 8.0 (`mysql+pymysql://...`).
- **Password Security**: Passlib with Bcrypt algorithm (`pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")`).
- **Token Security**: Python-Jose generating signed JWTs with HMAC-SHA256 (`HS256`) algorithms.

### 4.2 Layered Directory Layout
```
backend/
├── app/
│   ├── api/
│   │   ├── api.py                    # Top-level API router aggregation
│   │   ├── deps.py                   # Dependency injection (Auth, Roles, DB Session)
│   │   └── endpoints/
│   │       ├── auth.py               # Authentication & identity endpoints
│   │       ├── loggers.py            # Logger fleet CRUD & status evaluation
│   │       ├── reference_instruments.py # Reference standards management
│   │       ├── calibrations.py       # Calibration lifecycle & amendment endpoints
│   │       ├── dashboard.py          # Dashboard KPIs & timeline aggregations
│   │       └── audit_and_alerts.py   # Cryptographic audit events & notifications
│   ├── core/
│   │   ├── config.py                 # Pydantic BaseSettings configuration
│   │   ├── database.py               # Engine creation & SessionLocal generator
│   │   └── security.py               # Password hashing & JWT encoding/decoding
│   ├── models/
│   │   └── entities.py               # SQLAlchemy ORM entity definitions
│   ├── schemas/
│   │   └── all_schemas.py            # Pydantic request & response models
│   └── services/
│       ├── calibration_engine.py     # Deterministic metrology error calculation
│       ├── audit_service.py          # SHA-256 hash chaining & record fingerprinting
│       ├── alert_service.py          # Recalibration & expiry scanning logic
│       └── report_service.py         # ReportLab PDF & CSV generation engine
├── main.py                           # Application factory & CORS initialization
├── seed_data.py                      # Realistic laboratory demo data seeder
└── tests/
    ├── test_api_integration.py       # Full-flow endpoint integration tests
    └── test_calibration_engine.py    # Unit tests for metrology math & boundary conditions
```

---

## 5. End-to-End Data Flow Architecture

The following sequence illustrates the complete data flow across layers when a calibration is performed, calculated, validated, cryptographically fingerprinted, committed to the database, and downloaded as a PDF report:

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Calibration Technician
    participant UI as React Frontend (NewCalibrationWorkflow)
    participant API as FastAPI Router (calibrations.py)
    participant Dep as Auth & RBAC (deps.py)
    participant Math as Metrology Engine (calibration_engine.py)
    participant Audit as Audit Service (audit_service.py)
    participant DB as MySQL / SQLite Database
    participant Rep as Report Service (report_service.py)

    Tech->>UI: Enters setpoints, reference readings & logger readings
    UI->>UI: Computes live preview: Error = Logger - Ref, compares to Tolerance
    Tech->>UI: Clicks "Save Calibration Draft"
    UI->>API: POST /api/v1/calibrations/draft (JSON Payload + JWT Token)
    API->>Dep: get_current_user & require_technician_or_admin
    Dep-->>API: Validated User Object (David Patel, Tech)
    API->>Math: calculate_measurement_point() for each setpoint
    Math-->>API: Returns error, abs_error, pass/fail per point
    API->>Math: evaluate_overall_calibration(evaluated_points)
    Math-->>API: Returns overall_outcome (PASS/FAIL) and max_error
    API->>DB: INSERT INTO calibration_records (state='draft', overall_outcome, max_error)
    API->>DB: INSERT INTO calibration_measurement_points (...)
    API->>Audit: create_audit_event("CALIBRATION_DRAFT_SAVED")
    Audit->>DB: Query last audit block -> Compute SHA-256 -> INSERT audit_events
    DB-->>API: Transaction Committed
    API-->>UI: HTTP 201 Created (Draft CalibrationRecord JSON)

    Tech->>UI: Reviews draft and clicks "Finalize & Sign Certificate"
    UI->>API: POST /api/v1/calibrations/{id}/finalize
    API->>Audit: compute_calibration_provenance_hash(record, points, tech)
    Audit-->>API: Returns 64-char SHA-256 Provenance Fingerprint
    API->>DB: UPDATE calibration_records SET state='finalized', provenance_hash, finalized_at
    API->>DB: UPDATE temperature_loggers SET last_calibration_date, next_due_date
    API->>Audit: create_audit_event("CALIBRATION_FINALIZED")
    Audit->>DB: INSERT audit_events (Chained Hash)
    DB-->>API: Transaction Committed
    API-->>UI: HTTP 200 OK (Finalized CalibrationRecord JSON)

    Tech->>UI: Clicks "Download PDF Certificate"
    UI->>API: GET /api/v1/calibrations/{id}/pdf
    API->>DB: Fetch record, logger, reference instrument, technician, points
    API->>Rep: generate_calibration_pdf(record)
    Rep-->>API: In-memory binary PDF bytes
    API->>Audit: create_audit_event("REPORT_DOWNLOADED_PDF")
    API-->>UI: HTTP 200 OK (Content-Type: application/pdf)
    UI-->>Tech: Browser initiates PDF download ("Calibration_Report_CAL-2026-0001.pdf")
```

---

## 6. Security & Role-Based Access Control (RBAC) Architecture

TempTrace enforces a three-tier RBAC security model:

```mermaid
classDiagram
    class UserRole {
        <<enumeration>>
        ADMIN
        TECHNICIAN
        AUDITOR
    }

    class Permissions {
        +View Dashboard & Reports
        +Create & Edit Loggers
        +Create Reference Instruments
        +Perform Calibration & Save Draft
        +Finalize Calibration & Sign
        +Submit Formal Amendment
        +Delete Logger Units
        +Audit System Administration
    }

    UserRole <|-- Permissions : Defines
```

| Permission Capability | Administrator (`admin`) | Calibration Technician (`tech`) | Quality Auditor (`auditor`) | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :--- |
| **View Dashboard, Records, Drift Charts, & PDF Certificates** | Yes | Yes | Yes | `get_current_user` (Active Bearer Token) |
| **Register & Update Temperature Loggers** | Yes | Yes | Read-Only | `require_technician_or_admin` |
| **Register & Update Reference Instruments** | Yes | Yes | Read-Only | `require_technician_or_admin` |
| **Create Calibration Drafts & Enter Measurements** | Yes | Yes | Read-Only | `require_technician_or_admin` |
| **Finalize Calibration Records & Generate Hash** | Yes | Yes | Read-Only | `require_technician_or_admin` |
| **Submit Formal Post-Finalization Amendments** | Yes | Yes | Read-Only | `require_technician_or_admin` |
| **Delete Temperature Loggers from Inventory** | Yes | No (403 Forbidden) | No (403 Forbidden) | `require_admin` |
| **Mark System Notifications as Read** | Yes | Yes | Yes | `get_current_user` |

---

## 7. Reliability, Scalability, and Metrology Traceability Boundaries

1. **Zero External Friction Configuration**:
   The backend defaults to a local self-contained SQLite instance (`temptrace.db`) if MySQL environment variables are not supplied, enabling immediate zero-configuration verification, automated grading, and unit testing without local database setup friction.
2. **Deterministic Rounding**:
   All floating-point error subtractions are rounded to 4 decimal places via Python's `round(..., 4)` and JavaScript's `Math.round(... * 10000) / 10000`, ensuring cross-platform calculation parity between client and server.
3. **Formal Metrology Disclaimer**:
   In strict accordance with quality governance standards, all PDF reports, UI footers, and certificate previews clearly state:
   > *"Educational & Demonstration Calibration Record: This calibration document is generated by TempTrace for demonstration, validation, and educational traceability tracking. It does not represent an ISO/IEC 17025 accredited certificate unless independently audited and authorized by an accredited calibration laboratory."*

