# TempTrace – Calibration Metrology & Calculation Methodology

## 1. Domain Foundations & Metrology Principles

In scientific research, vaccine distribution, pharmaceutical manufacturing, and aerospace operations, ambient temperature must be reliably maintained within strict regulatory bounds (e.g. cold storage at $2^\circ\text{C}$ to $8^\circ\text{C}$, ultra-low freezers at $-80^\circ\text{C}$). Electronic temperature data loggers monitor these critical environments.

However, all physical temperature sensors (Resistance Temperature Detectors [RTDs], thermistors, thermocouples, and semiconductor sensors) suffer from **sensor drift** over time due to:
- Material aging and mechanical strain on platinum wire / ceramic elements.
- Thermal cycling and thermal shock.
- Humidity penetration and insulation breakdown.
- Component tolerances in internal analog-to-digital converters (ADCs).

**Calibration** is the set of operations that establishes, under specified environmental conditions, the relationship between values indicated by a measuring instrument (the logger or Unit Under Test) and the corresponding values realized by measurement standards (the reference thermometer).

---

## 2. Core Metrological Terminology

1. **Unit Under Test (UUT)**: The operational temperature data logger whose accuracy is being verified (e.g. MadgeTech HiTemp140, Onset HOBO UX100).
2. **Reference Standard**: A calibrated high-accuracy thermometer (such as a Standard Platinum Resistance Thermometer [SPRT] or secondary reference PRT) with a documented calibration certificate from a National Metrology Institute (NMI) or accredited ISO/IEC 17025 laboratory.
3. **Traceability (VIM 2.41)**: The property of a measurement result whereby the result can be related to a reference through a documented unbroken chain of calibrations, each contributing to the measurement uncertainty.
4. **Calibration Acceptance Tolerance ($\pm T_{\text{allowed}}$)**: The maximum permissible deviation between the logger reading and the reference standard reading for the device to be deemed fit for operational use.
5. **Sensor Drift**: The gradual change in the sensor's measurement offset over operational time.

---

## 3. Mathematical Formulas Implemented in TempTrace

The TempTrace Metrology Engine ([backend/app/services/calibration_engine.py](file:///d:/3rd%20year%20odd%20sem/SOA/soa%20hakton/backend/app/services/calibration_engine.py)) implements deterministic calculation routines rounded to 4 decimal places to prevent standard floating-point representation artifacts:

### 3.1 Measurement Error Formula
The error of indication for an individual test point is defined as:

$$\text{Error} = T_{\text{logger}} - T_{\text{reference}}$$

Where:
- $T_{\text{logger}}$ is the observed temperature displayed or recorded by the logger under test.
- $T_{\text{reference}}$ is the calibrated reading of the reference standard thermometer.

### 3.2 Absolute Error Formula
The magnitude of deviation regardless of sign is defined as:

$$\text{Absolute Error} = |\text{Error}| = |T_{\text{logger}} - T_{\text{reference}}|$$

### 3.3 Individual Measurement Point Decision Rule
Each setpoint is evaluated against its allowed acceptance tolerance ($T_{\text{allowed}}$):

$$\text{Outcome}_i = \begin{cases} \text{PASS}, & \text{if } \text{Absolute Error}_i \le T_{\text{allowed}} \\ \text{FAIL}, & \text{if } \text{Absolute Error}_i > T_{\text{allowed}} \end{cases}$$

### 3.4 Maximum Observed Error
Across $n$ measurement setpoints, the maximum absolute error observed during the calibration routine is:

$$E_{\max} = \max_{i=1}^{n} (\text{Absolute Error}_i)$$

### 3.5 Overall Calibration Outcome Decision Rule
In metrology compliance, a device must satisfy tolerance across its entire operational span. Therefore, the overall outcome follows an exhaustive conjunction rule:

$$\text{Overall Outcome} = \begin{cases} \text{PASS}, & \text{if } \forall i \in \{1, \dots, n\}, \text{Outcome}_i = \text{PASS} \\ \text{FAIL}, & \text{if } \exists i \in \{1, \dots, n\}, \text{Outcome}_i = \text{FAIL} \end{cases}$$

---

## 4. Practical Numerical Examples

### Example 1: Standard Passing Calibration Point
- Target Setpoint (Nominal): $25.00^\circ\text{C}$
- Reference Thermometer Reading: $25.001^\circ\text{C}$
- Logger Under Test Reading: $25.120^\circ\text{C}$
- Allowed Acceptance Tolerance: $\pm 0.50^\circ\text{C}$

$$\text{Error} = 25.120 - 25.001 = +0.119^\circ\text{C}$$

$$\text{Absolute Error} = |+0.119| = 0.119^\circ\text{C}$$

$$\text{Decision: } 0.119^\circ\text{C} \le 0.50^\circ\text{C} \implies \mathbf{PASS}$$

---

### Example 2: Failing Calibration Point (Exceeds Tolerance)
- Target Setpoint (Nominal): $50.00^\circ\text{C}$
- Reference Thermometer Reading: $49.998^\circ\text{C}$
- Logger Under Test Reading: $50.650^\circ\text{C}$
- Allowed Acceptance Tolerance: $\pm 0.50^\circ\text{C}$

$$\text{Error} = 50.650 - 49.998 = +0.652^\circ\text{C}$$

$$\text{Absolute Error} = |+0.652| = 0.652^\circ\text{C}$$

$$\text{Decision: } 0.652^\circ\text{C} > 0.50^\circ\text{C} \implies \mathbf{FAIL}$$

---

### Example 3: Exact Boundary Condition Analysis
Metrology specifications must explicitly define whether the boundary condition $\text{Absolute Error} = T_{\text{allowed}}$ passes or fails. In TempTrace:
- Reference Reading: $25.000^\circ\text{C}$
- Logger Reading: $25.500^\circ\text{C}$
- Allowed Tolerance: $\pm 0.50^\circ\text{C}$

$$\text{Absolute Error} = |25.500 - 25.000| = 0.500^\circ\text{C}$$

$$\text{Decision: } 0.500 \le 0.500 \implies \mathbf{PASS}$$

However, if the logger reading drifts to $25.501^\circ\text{C}$:

$$\text{Absolute Error} = |25.501 - 25.000| = 0.501^\circ\text{C}$$

$$\text{Decision: } 0.501 > 0.500 \implies \mathbf{FAIL}$$

*(Verified by automated unit test `test_pass_fail_boundary_exact()` in `test_calibration_engine.py`)*.

---

### Example 4: Multi-Point Verification Session
A laboratory standard operating procedure tests a vaccine cold chain logger across four setpoints:

| Sequence | Nominal Temp | Ref Reading ($^\circ\text{C}$) | Logger Reading ($^\circ\text{C}$) | Error ($^\circ\text{C}$) | Abs Error ($^\circ\text{C}$) | Allowed Tol ($^\circ\text{C}$) | Point Outcome |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | $-20.00^\circ\text{C}$ | $-20.005$ | $-20.080$ | $-0.075$ | $0.075$ | $\pm 0.50$ | **PASS** |
| 2 | $0.00^\circ\text{C}$ | $0.002$ | $+0.040$ | $+0.038$ | $0.038$ | $\pm 0.50$ | **PASS** |
| 3 | $25.00^\circ\text{C}$ | $25.001$ | $+25.120$ | $+0.119$ | $0.119$ | $\pm 0.50$ | **PASS** |
| 4 | $50.00^\circ\text{C}$ | $49.998$ | $+50.620$ | $+0.622$ | $0.622$ | $\pm 0.50$ | **FAIL** |

- Maximum Absolute Error: $E_{\max} = 0.622^\circ\text{C}$
- Overall Calibration Outcome: **FAIL** (because Point 4 failed).
- Operational Consequence: The logger cannot be returned to active service. It must be sent for factory adjustment, recalibration, or retirement.

---

## 5. Provenance Cryptographic Fingerprint Specification

Upon finalization, TempTrace computes a tamper-evident SHA-256 digest of the calibration event:

```python
payload = {
    "record_number": record.record_number,
    "logger_id": record.logger_id,
    "ref_instrument_id": record.reference_instrument_id,
    "cal_date": record.calibration_date.isoformat(),
    "technician_id": record.technician_id,
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
provenance_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
```

This guarantees:
1. **Determinism**: Sorting keys ensures identical inputs produce the exact same 64-character hexadecimal hash.
2. **Avalanche Effect**: Altering even a single digit (e.g. changing an error from $0.622$ to $0.422$) completely changes the resulting hash.
3. **Traceability**: The hash is permanently embedded into the database, displayed on the PDF calibration certificate, and chained into the system audit ledger.

---

## 6. Implementation Status: Current vs Future Metrology Capabilities

To preserve scientific rigor, TempTrace clearly differentiates implemented metrological logic from future extensions:

| Metrology Feature | Implementation Status | Implementation Location | Notes |
| :--- | :---: | :--- | :--- |
| **Error Calculation** ($T_{\text{logger}} - T_{\text{ref}}$) | **Implemented** | `calibration_engine.py` | Rounded to 4 decimal places |
| **Absolute Error Calculation** ($|\text{Error}|$) | **Implemented** | `calibration_engine.py` | Deterministic magnitude |
| **Point-Level Pass/Fail Evaluation** | **Implemented** | `calibration_engine.py` | Strict $\le$ boundary comparison |
| **Overall Pass/Fail Decision** | **Implemented** | `calibration_engine.py` | Conjunction across all test points |
| **Maximum Error Tracking ($E_{\max}$)** | **Implemented** | `calibration_engine.py` | Stored in `calibration_records.max_error` |
| **Reference Instrument Stated Uncertainty ($U$)** | **Implemented** | `reference_instruments` | Stored as metadata and printed on certificate |
| **Reference Standard Expiry Monitoring** | **Implemented** | `alert_service.py` | Blocks or flags usage of expired standards |
| **GUM Uncertainty Budget (Type A & B Monte Carlo)** | *Planned Future* | Not in current engine | Full GUM evaluation with sensitivity coefficients |
| **Polynomial Sensor Curve Fitting (ITS-90 / Callendar-Van Dusen)** | *Planned Future* | Not in current engine | Calculating $A, B, C$ coefficients for RTDs |

