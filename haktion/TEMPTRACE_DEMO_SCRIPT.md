# TempTrace – Live Demonstration Script & Defense Walkthrough

## 1. Demonstration Setup & Pre-Flight Checklist

Ensure both services are running:
- **Frontend**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **FastAPI Backend**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Swagger Documentation**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)

Have three user credentials ready:
1. `admin` / `admin123` (Lead Administrator / Metrologist)
2. `tech` / `tech123` (Calibration Technician)
3. `auditor` / `auditor123` (Quality Auditor - Read Only)

---

## 2. Step-by-Step Live Demonstration Walkthrough

### Act 1: System Introduction & Role-Based Access
1. Open the application at `http://127.0.0.1:5173`.
2. Point out the **TempTrace System Access Modal**:
   - Highlight the quick persona buttons (`Lead Admin`, `Technician`, `QA Auditor`).
   - Sign in as **Lead Admin** (`admin`).
3. Explain the top status badge: *"SHA-256 Provenance Chain Active"*, indicating append-only cryptographic tracking is operational across the entire workspace.

---

### Act 2: Metrology Operations Dashboard
1. Navigate to the **Dashboard**:
   - **KPI Cards**: Explain the live counts for *Registered Loggers*, *Calibration Valid*, *Due Soon (≤30d)*, *Overdue*, and *Failed / Out of Tolerance*.
   - **Verification Volume Chart (Recharts Bar Chart)**: Showcase 6-month historical throughput of Passed vs. Failed verification sessions.
   - **Validity Distribution Chart (Recharts Donut Chart)**: Explain fleet compliance proportion.
   - **Upcoming Calibration Due Dates Table**: Point out the live countdown in days remaining (`days_remaining`).
   - **Recent Calibrations Table**: Point out record IDs, technicians, and max observed errors.

---

### Act 3: Temperature Loggers Inventory & Duplicate S/N Validation
1. Click **Loggers** in the sidebar.
2. Show the inventory table featuring hardware models (MadgeTech, Testo, Onset HOBO), locations (Cold Room B, Vaccine Depo 4), and status badges.
3. Click **"Register New Logger"**:
   - Enter Logger ID: `TL-001` (an existing ID).
   - Enter Serial Number: `SN-TEST-DUPLICATE`.
   - Click submit: Demonstrate the immediate validation rejection preventing duplicate equipment identifiers (`Logger ID 'TL-001' already exists`).
4. Click on any logger (e.g. `TL-001`) to open the **Details Drawer**:
   - Show commissioning dates, accuracy specifications, and historical calibration records associated with this specific physical device.

---

### Act 4: Reference Instruments & Metrological Traceability
1. Click **Reference Standards** in the sidebar.
2. Present the reference thermometers and calibration baths:
   - Example: `REF-PRT-001` (Fluke 5628 Secondary Standard PRT).
   - Certificate Number: `NIST-CAL-2025-9921`.
   - Stated Uncertainty: `U = 0.008°C (k=2)`.
   - Traceability Details: Direct unbroken chain to ITS-90 fixed points.
3. Show the **Expiry Monitoring**:
   - Point out how expired reference standards are flagged with warning badges and cannot be used for accredited calibration.

---

### Act 5: Performing the 5-Step Guided Calibration Workflow
1. Click **New Calibration** in the sidebar.
2. **Step 1 – Select Logger**:
   - Choose `TL-001 – MadgeTech HiTemp140-FP`.
   - Review displayed specifications (Range: -40°C to +140°C, Accuracy: ±0.10°C).
   - Click *Next*.
3. **Step 2 – Select Reference Instrument**:
   - Select `REF-PRT-001 – Fluke Metrology 5628 PRT`.
   - Emphasize that the system confirms reference validity and expiration date before allowing progress.
   - Click *Next*.
4. **Step 3 – Environmental Conditions & Procedure**:
   - Enter Ambient Temperature: `22.5°C`, Humidity: `45% RH`.
   - Select Procedure: `SOP-CAL-001 (Standard Periodic Routine)`.
   - Acceptance Tolerance: `±0.50°C`.
   - Click *Next*.
5. **Step 4 – Measurement Points & Live Metrology Math**:
   - Show the four default temperature setpoints: `-20.0°C`, `0.0°C`, `25.0°C`, `50.0°C`.
   - Point out the **Live Calculation Engine**:
     - As readings are typed, the frontend calculates `Error = Logger - Reference` and `Absolute Error = |Error|`.
     - Modify logger reading at 50°C to `50.70°C`:
       - Show Error update to `+0.702°C`.
       - Show immediate red `FAIL` badge and overall test outcome turning to `FAIL`.
     - Correct logger reading back to `50.15°C`:
       - Show Error update to `+0.152°C`.
       - Show green `PASS` badge restored.
   - Click *Next*.
6. **Step 5 – Review & Finalize**:
   - Click **Save Calibration Draft**: The draft record is stored in the database.
   - Click **Finalize & Sign Certificate**:
     - Explain the transactional operation:
       - The 64-character SHA-256 Provenance Fingerprint is generated.
       - The logger's `last_calibration_date` and `next_due_date` are updated.
       - An append-only audit event is committed.

---

### Act 6: Examining the Cryptographic Audit Trail
1. Click **Audit Trail** in the sidebar.
2. Show the newly added block:
   - Action: `CALIBRATION_FINALIZED`.
   - User: `David Patel (Calibration Technician)`.
   - Block Hash: 64-character SHA-256 string.
   - Previous Hash: Showing cryptographic linkage to the preceding event.
3. Explain why hash chaining prevents silent tampering: changing any past record breaks the mathematical hash of all subsequent blocks.

---

### Act 7: Formal Post-Finalization Amendment Workflow
1. Click **Calibration Records** in the sidebar.
2. Select the finalized record just created.
3. Explain the regulatory requirement: *"In metrology and 21 CFR Part 11, finalized calibration records cannot be silently overwritten or modified."*
4. Click **"Amend Record"**:
   - Enter formal justification: *"Corrected technician clerical error on setpoint 1 reference thermometer reading."*
   - Adjust the measurement point reading.
   - Submit amendment.
5. Show the result:
   - The record transitions to state `amended`.
   - The version counter increments to `v2`.
   - A new SHA-256 provenance fingerprint is computed.
   - The complete original snapshot is archived in `calibration_amendments`.

---

### Act 8: PDF Certificate & CSV Data Generation
1. Click **Certificates** in the sidebar.
2. Click **"PDF Report"** on any certificate:
   - The browser downloads the ReportLab-generated PDF.
   - Open the PDF and highlight:
     - Prominent **Educational & Demonstration Disclaimer** header banner.
     - Unit Under Test and Reference Standard metadata tables.
     - Measurement results table with reference uncertainty, errors, and point outcomes.
     - Green **PASS** overall result banner with maximum absolute error.
     - 64-character SHA-256 Provenance Fingerprint.
     - Technician and Quality Assurance signature lines.
3. Click **"CSV"**: Show the exported tabular raw data for spreadsheet analysis.

---

### Act 9: Calibration Alerts & Expiry Monitoring
1. Click **Notifications** in the sidebar.
2. Demonstrate how the background scanner alerts technicians:
   - Calibration Due in 7 Days warnings.
   - Overdue calibration alerts.
   - Expired reference standard warnings.
3. Click **"Mark Read"** or **"Mark all as read"** to show real-time notification state management.

