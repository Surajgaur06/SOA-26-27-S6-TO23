# TempTrace – 30 Essential Viva Questions & Comprehensive Answers

---

### Q1: What is TempTrace and what core problem does it solve?
**Answer**:
TempTrace is a full-stack, metrology-grade web platform for managing the calibration lifecycle, measurement error evaluation, and cryptographic provenance of temperature data loggers. In regulated environments such as pharmaceutical manufacturing and cold-chain vaccine depots, temperature sensors drift over time. TempTrace replaces error-prone paper records and manual spreadsheets with an automated calculation engine, an append-only SHA-256 hash-chained audit trail, and publication-ready calibration certificate generation.

---

### Q2: Why did you choose React for the frontend instead of server-side templates like Jinja2?
**Answer**:
React allows us to build a reactive, single-page application (SPA) where complex, multi-step calibration workflows (such as our 5-step wizard) happen with instantaneous client-side calculation feedback. As technicians type raw logger and reference standard readings, React state immediately updates the calculated error, absolute error, and pass/fail outcome without requiring full-page reloads. Furthermore, modern interactive chart libraries like Recharts render smooth SVG and canvas data visualizations directly in the browser DOM.

---

### Q3: Why Vite instead of Create React App (CRA) or traditional Webpack?
**Answer**:
Create React App is officially deprecated by the React team and relies on slow Webpack bundling. Vite leverages native browser ES Modules (ESM) and an ultra-fast Go-based bundler (esbuild) during development. This provides near-instantaneous Hot Module Replacement (HMR) and fast production builds using Rollup, reducing build times from minutes to seconds.

---

### Q4: Why did you choose FastAPI for the backend instead of Flask or Django?
**Answer**:
1. **Asynchronous Performance**: FastAPI is built on Starlette and ASGI, providing asynchronous request handling comparable to NodeJS and Go.
2. **Native Pydantic v2 Integration**: Incoming HTTP request payloads are automatically validated against strict schemas, rejecting invalid data types before reaching business logic.
3. **Automatic OpenAPI/Swagger Documentation**: FastAPI automatically produces interactive API documentation at `/api/v1/docs`, streamlining testing and frontend integration.
4. **Lightweight & Modular**: Unlike Django, which is heavily opinionated and monolithic, FastAPI provides a minimal, decoupled framework ideal for microservices and clean architectural layering.

---

### Q5: Why MySQL for the database instead of MongoDB (NoSQL) or flat files?
**Answer**:
Metrological data is inherently relational with rigid referential integrity requirements:
- A calibration record *must* reference an existing logger, an existing reference instrument, and an authorized technician.
- If a logger is retired or audited, foreign key relationships must maintain consistency.
- MySQL's InnoDB storage engine guarantees ACID (Atomicity, Consistency, Isolation, Durability) transactions, ensuring that multi-table inserts (such as saving a calibration header and its measurement points) either succeed entirely or roll back cleanly without leaving partial records.

---

### Q6: Why use SQLAlchemy ORM instead of writing raw SQL strings?
**Answer**:
1. **SQL Injection Prevention**: SQLAlchemy automatically parameterizes all queries, preventing SQL injection vulnerabilities.
2. **Dialect Portability**: SQLAlchemy abstracts the underlying database engine. TempTrace can seamlessly run on MySQL 8.0 in production and fallback to SQLite for zero-friction local grading without changing application code.
3. **Relationship Mapping**: SQLAlchemy automatically loads parent-child relationships (e.g. `record.measurement_points` and `record.logger`) via object-oriented navigation.

---

### Q7: What is temperature data logger calibration?
**Answer**:
Calibration is the documented verification of an instrument's accuracy by comparing its measured readings against a known, higher-accuracy measurement standard (the reference standard thermometer) under controlled environmental conditions. It establishes whether the logger's errors are within acceptable regulatory tolerance limits.

---

### Q8: What is the difference between a temperature data logger and a reference thermometer?
**Answer**:
- A **temperature data logger** is an operational monitoring device (Unit Under Test) deployed in cold rooms, freezers, or vaccine shippers to record continuous temperature histories. It typically has moderate accuracy (e.g. $\pm 0.3^\circ\text{C}$ to $\pm 0.5^\circ\text{C}$).
- A **reference thermometer** (such as a Standard Platinum Resistance Thermometer [SPRT] or secondary reference PRT) is a high-precision laboratory standard with known, certified metrological traceability and very low uncertainty (e.g. $U = \pm 0.008^\circ\text{C}$), used exclusively to verify operational loggers.

---

### Q9: How is Measurement Error calculated in TempTrace?
**Answer**:
Measurement Error is defined as:

$$\text{Error} = T_{\text{logger}} - T_{\text{reference}}$$

Where $T_{\text{logger}}$ is the value indicated by the logger under test, and $T_{\text{reference}}$ is the value indicated by the calibrated reference standard thermometer. A positive error indicates the logger reads higher than the true standard; a negative error indicates it reads lower.

---

### Q10: What is Absolute Error and why is it used for tolerance evaluation?
**Answer**:
Absolute Error is the magnitude of the measurement error regardless of its algebraic sign:

$$\text{Absolute Error} = |\text{Error}| = |T_{\text{logger}} - T_{\text{reference}}|$$

Because tolerance specifications define a bilateral symmetric limit around zero (e.g. $\pm 0.50^\circ\text{C}$), evaluating $|\text{Error}| \le \text{Tolerance}$ ensures both positive and negative deviations are judged against the same numerical threshold.

---

### Q11: What is the acceptance decision rule for an individual calibration point?
**Answer**:
An individual setpoint passes if and only if:

$$\text{Absolute Error} \le \text{Allowed Tolerance}$$

If $\text{Absolute Error} > \text{Allowed Tolerance}$, the setpoint is marked **FAIL**.

---

### Q12: What is the decision rule for the Overall Calibration Outcome?
**Answer**:
TempTrace applies an exhaustive conjunction rule:
The overall calibration outcome is **PASS** only if **all** tested measurement points pass. If even a single point exceeds tolerance, the overall calibration is **FAIL**. This ensures a sensor cannot be certified if it fails at any temperature across its operating span.

---

### Q13: What is the exact boundary condition in TempTrace?
**Answer**:
If the absolute error equals the allowed tolerance exactly (e.g. $|25.500 - 25.000| = 0.500^\circ\text{C}$ when tolerance is $\pm 0.50^\circ\text{C}$), the point **passes** ($0.500 \le 0.500$). If it exceeds by even $0.001^\circ\text{C}$ ($0.501 > 0.500$), it **fails**. This is verified by automated unit tests in `test_calibration_engine.py`.

---

### Q14: What is Maximum Absolute Error ($E_{\max}$) and why is it recorded?
**Answer**:
Maximum Absolute Error is the largest absolute error observed across all test points in a calibration routine:

$$E_{\max} = \max_{i} (|\text{Error}_i|)$$

It represents the worst-case measurement deviation of the sensor during that verification session and is stored in `calibration_records.max_error` and displayed on the calibration certificate.

---

### Q15: What is Metrological Traceability?
**Answer**:
According to the International Vocabulary of Metrology (VIM), traceability is the property of a measurement result whereby it can be related to a recognized standard (such as the International Temperature Scale of 1990, ITS-90) through a documented, unbroken chain of calibrations, each contributing to the measurement uncertainty. In TempTrace, every calibration links to a reference standard with a recorded certificate number, accredited provider, and stated uncertainty.

---

### Q16: What is Calibration Provenance?
**Answer**:
Calibration Provenance is the verifiable, tamper-evident lineage of a calibration record: who performed it, when it was conducted, what standard was used, what raw readings were taken, and proof that the historical data has not been secretly modified after the fact.

---

### Q17: What is SHA-256 and why is it used in TempTrace?
**Answer**:
SHA-256 (Secure Hash Algorithm 256-bit) is a cryptographic hash function that takes an arbitrary input string and outputs a fixed 64-character hexadecimal digest. It is mathematically irreversible (one-way) and exhibits the **avalanche effect**: changing even a single character in the input completely randomizes the resulting hash digest.

---

### Q18: How does the Calibration Provenance Hash work in TempTrace?
**Answer**:
When a calibration is finalized, the backend serializes a deterministic JSON payload containing:
- Record number
- Logger ID
- Reference instrument ID
- Calibration timestamp
- Technician ID
- Array of measurement points (nominal setpoints, reference readings, logger readings, errors, tolerances, and outcomes)

It computes `hashlib.sha256(json.dumps(payload, sort_keys=True)).hexdigest()` and stores it in `calibration_records.provenance_hash`.

---

### Q19: How does Cryptographic Hash Chaining work in the Audit Trail?
**Answer**:
The `audit_events` table operates like a blockchain:
- Each audit event includes `previous_hash` (the hash of the previous row) and its own `current_hash`.
- The `current_hash` is computed as:
  $$\text{current\_hash} = \text{SHA-256}(\text{previous\_hash} \parallel \text{timestamp} \parallel \text{action} \parallel \text{entity\_type} \parallel \text{entity\_id} \parallel \text{details} \parallel \text{user\_id})$$
- The very first event uses a predefined `GENESIS_BLOCK` string.
- If an attacker tampers with an earlier event in the database, its hash changes, breaking the link to all subsequent events and instantly exposing the tampering.

---

### Q20: What are the security limitations of hash chaining inside a single MySQL database?
**Answer**:
While hash chaining detects silent in-place modifications by application users, an attacker who obtains root database administrator credentials could theoretically alter a record and recalculate the hashes for all subsequent rows. In commercial production environments, local hash chaining should be complemented by:
- Read-only database replication.
- Periodic anchoring to external immutable ledgers (e.g. public blockchains or AWS QLDB).
- Write-Once-Read-Many (WORM) cloud audit storage.

---

### Q21: How is authentication handled in TempTrace?
**Answer**:
TempTrace uses stateless JWT (JSON Web Token) bearer authentication. When a user submits valid credentials to `POST /api/v1/auth/login`:
1. Password is verified against the bcrypt hash in the database.
2. A JWT token is generated containing `sub` (username), `role`, `iat` (issued at), and `exp` (expiration date, 24 hours), signed with a secret key using the HMAC-SHA256 (`HS256`) algorithm.
3. The frontend stores this token in `localStorage` and sends it in the `Authorization: Bearer <token>` header for all subsequent API requests.

---

### Q22: Why use bcrypt for password hashing instead of MD5 or plain text?
**Answer**:
Plain text storage is a catastrophic security vulnerability. MD5 and SHA-1 are obsolete and vulnerable to collision attacks and rainbow tables. Bcrypt incorporates a cryptographic salt (preventing rainbow table attacks) and is computationally expensive (slow by design), which prevents rapid brute-force attacks even if the database file is compromised.

---

### Q23: How is Role-Based Access Control (RBAC) enforced in TempTrace?
**Answer**:
FastAPI uses dependency injection functions defined in `backend/app/api/deps.py`:
- `get_current_user`: Validates that the request has an active, valid JWT token.
- `require_technician_or_admin`: Restricts calibration creation, drafts, amendments, and logger creation to Technicians and Admins (Auditors receive HTTP 403 Forbidden).
- `require_admin`: Restricts destructive operations (like deleting loggers from inventory) strictly to Administrators.

---

### Q24: How does dynamic PDF report generation work in TempTrace?
**Answer**:
PDF generation is implemented in `backend/app/services/report_service.py` using **ReportLab Platypus**:
1. When `GET /api/v1/calibrations/{id}/pdf` is requested, the server fetches the record, logger, reference standard, technician, and measurement points from the database.
2. It builds a `SimpleDocTemplate` in an in-memory `io.BytesIO` buffer (without writing temporary files to the disk).
3. It lays out the header, educational watermark banner, metadata tables, measurement results, PASS/FAIL summary, provenance hash, and signature blocks.
4. It streams the binary buffer to the client with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=...`.

---

### Q25: Why is there an "Educational / Demonstration" disclaimer on the PDF reports?
**Answer**:
ISO/IEC 17025 conformity rules strictly prohibit claiming official accredited calibration laboratory authority unless the laboratory has been independently audited and accredited by an official accreditation body (such as NIST, UKAS, or DAkkS). To ensure full compliance with metrological governance, TempTrace prominently labels all generated certificates as **Educational & Demonstration Calibration Records**.

---

### Q26: Why can't a finalized calibration record be edited or deleted?
**Answer**:
In regulated industries (FDA 21 CFR Part 11 and ISO 9001), scientific data integrity prohibits erasing or silently modifying completed verification records. If an error was made (e.g. a reference temperature typo), the technician must use the **Formal Amendment Workflow**. The original record is retained, a new revision (`v2`) is created, the justification reason is permanently recorded, and an audit event is logged.

---

### Q27: How does TempTrace compute the recalibration due date?
**Answer**:
When a calibration is finalized, the backend calculates:

$$\text{next\_due\_date} = \text{calibration\_date} + \text{relativedelta}(\text{months} = \text{logger.calibration\_interval\_months})$$

This date is saved to `temperature_loggers.next_due_date` and used by the alert service to trigger 30-day, 7-day, and overdue notifications.

---

### Q28: How does the Alert and Notification Engine operate?
**Answer**:
The alert logic in `alert_service.py` (`refresh_system_notifications_and_statuses`) scans the database and creates notifications for:
- Overdue loggers (`due_date < now`)
- Critical upcoming expiry (`due_date <= now + 7 days`)
- Standard upcoming expiry (`due_date <= now + 30 days`)
- Expired reference standards (`expiry_date < now`)
- Failed calibration records

It executes automatically whenever `GET /api/v1/dashboard/metrics` is requested or when a calibration record is finalized.

---

### Q29: What automated tests exist and how were they validated?
**Answer**:
The backend contains 13 automated test cases in `backend/tests/`:
- `test_calibration_engine.py` (5 tests): Verifies passing points, failing points, exact boundary conditions ($0.500^\circ\text{C}$ vs $0.501^\circ\text{C}$), multi-point conjunction, and overall evaluation.
- `test_api_integration.py` (8 tests): Verifies `/health`, login success, invalid password rejection, 401 unauthenticated access, logger listing, duplicate logger ID rejection, dashboard metrics telemetry, and binary PDF report generation.
All 13 tests execute and pass cleanly under pytest.

---

### Q30: What future enhancements would make TempTrace a commercial enterprise platform?
**Answer**:
1. **Uncertainty Budgeting (GUM / ISO/IEC Guide 98-3)**: Implement combined standard uncertainty ($u_c$) combining Type A (repeat measurement variance) and Type B (reference standard certificate uncertainty, bath stability, and digital resolution) to compute expanded uncertainty $U = k \cdot u_c$ ($k=2$, 95% confidence).
2. **Sensor Characteristic Polynomials**: Calculate Callendar-Van Dusen ($R_0, A, B, C$) coefficients for RTDs or Steinhart-Hart coefficients for thermistors.
3. **Hardware Integration**: Direct RS-232 / USB / Bluetooth telemetry ingestion from Fluke dry-wells and digital multi-meters to eliminate manual typing errors.
4. **Decentralized Audit Anchoring**: Periodically hashing the audit ledger and publishing the root hash to a public blockchain or RFC 3161 cryptographic timestamping authority.

