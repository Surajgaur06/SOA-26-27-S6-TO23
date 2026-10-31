import pytest
from app.services.calibration_engine import calculate_measurement_point, evaluate_overall_calibration
from app.models.entities import PointOutcome, OverallOutcome

def test_measurement_point_calculation_pass():
    # Setpoint: 0°C, Ref: 0.002°C, Logger: 0.050°C, Tol: 0.50°C
    pt = calculate_measurement_point(
        nominal_temperature=0.0,
        reference_reading=0.002,
        logger_reading=0.050,
        allowed_tolerance=0.50,
        ref_uncertainty=0.01
    )
    assert pt["error"] == 0.048
    assert pt["abs_error"] == 0.048
    assert pt["outcome"] == PointOutcome.PASS_STATUS

def test_measurement_point_calculation_fail():
    # Setpoint: 50°C, Ref: 50.000°C, Logger: 50.650°C, Tol: 0.50°C -> Error = 0.650 > 0.50
    pt = calculate_measurement_point(
        nominal_temperature=50.0,
        reference_reading=50.000,
        logger_reading=50.650,
        allowed_tolerance=0.50,
        ref_uncertainty=0.01
    )
    assert pt["error"] == 0.65
    assert pt["abs_error"] == 0.65
    assert pt["outcome"] == PointOutcome.FAIL_STATUS

def test_pass_fail_boundary_exact():
    # Exact boundary condition: abs_error == allowed_tolerance must PASS
    pt = calculate_measurement_point(
        nominal_temperature=25.0,
        reference_reading=25.000,
        logger_reading=25.500,
        allowed_tolerance=0.50,
        ref_uncertainty=0.01
    )
    assert pt["abs_error"] == 0.50
    assert pt["outcome"] == PointOutcome.PASS_STATUS
    
    # Exceeding by 0.001 must FAIL
    pt_fail = calculate_measurement_point(
        nominal_temperature=25.0,
        reference_reading=25.000,
        logger_reading=25.501,
        allowed_tolerance=0.50,
        ref_uncertainty=0.01
    )
    assert pt_fail["abs_error"] == 0.501
    assert pt_fail["outcome"] == PointOutcome.FAIL_STATUS

def test_overall_calibration_evaluation():
    points = [
        {"abs_error": 0.05, "outcome": PointOutcome.PASS_STATUS},
        {"abs_error": 0.12, "outcome": PointOutcome.PASS_STATUS},
        {"abs_error": 0.48, "outcome": PointOutcome.PASS_STATUS},
    ]
    outcome, max_err = evaluate_overall_calibration(points)
    assert outcome == OverallOutcome.PASS_STATUS
    assert max_err == 0.48

def test_overall_calibration_fails_if_any_point_fails():
    points = [
        {"abs_error": 0.05, "outcome": PointOutcome.PASS_STATUS},
        {"abs_error": 0.62, "outcome": PointOutcome.FAIL_STATUS},
        {"abs_error": 0.10, "outcome": PointOutcome.PASS_STATUS},
    ]
    outcome, max_err = evaluate_overall_calibration(points)
    assert outcome == OverallOutcome.FAIL_STATUS
    assert max_err == 0.62
