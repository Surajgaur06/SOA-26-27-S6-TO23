from typing import List, Tuple
from app.models.entities import PointOutcome, OverallOutcome

def calculate_measurement_point(
    nominal_temperature: float,
    reference_reading: float,
    logger_reading: float,
    allowed_tolerance: float,
    ref_uncertainty: float = 0.03
) -> dict:
    """
    Computes measurement error and pass/fail outcome for an individual point.
    
    Formula:
    Error = Logger Reading - Reference Reading
    Absolute Error = |Error|
    Pass Condition: Absolute Error <= Allowed Acceptance Tolerance
    """
    # Round to 4 decimal places to prevent standard floating point rounding artifacts
    error = round(logger_reading - reference_reading, 4)
    abs_error = round(abs(error), 4)
    
    # Boundary condition: pass if abs_error <= allowed_tolerance
    is_pass = abs_error <= allowed_tolerance
    outcome = PointOutcome.PASS_STATUS if is_pass else PointOutcome.FAIL_STATUS
    
    return {
        "nominal_temperature": nominal_temperature,
        "reference_reading": reference_reading,
        "logger_reading": logger_reading,
        "ref_uncertainty": ref_uncertainty,
        "allowed_tolerance": allowed_tolerance,
        "error": error,
        "abs_error": abs_error,
        "outcome": outcome
    }

def evaluate_overall_calibration(evaluated_points: List[dict]) -> Tuple[OverallOutcome, float]:
    """
    Evaluates the overall calibration result across all points.
    If ANY measurement point fails tolerance, the overall calibration is FAIL.
    Also returns the maximum absolute error observed across all test points.
    """
    if not evaluated_points:
        return OverallOutcome.PASS_STATUS, 0.0
    
    all_passed = True
    max_error = 0.0
    
    for pt in evaluated_points:
        abs_err = pt["abs_error"]
        if abs_err > max_error:
            max_error = abs_err
        if pt["outcome"] == PointOutcome.FAIL_STATUS:
            all_passed = False
            
    overall = OverallOutcome.PASS_STATUS if all_passed else OverallOutcome.FAIL_STATUS
    return overall, round(max_error, 4)
