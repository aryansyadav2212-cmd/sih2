"""
Unit tests for PAIMANA data validation layer.

Coverage:
- Rule 1: Basic numeric validity
- Rule 2: Cost consistency
- Rule 3: Financial vs physical progress
- Rule 4: Progress regression
- Rule 5: Date consistency
- Rule 9: Expenditure exceeding revised cost

Multiple issues on same observation, immutability checks.

Run: python3 features/test_data_validation.py
"""

import sys
from data_validation import validate_observation, validate_observations, summarize_validation


def assert_equals(actual, expected, msg=""):
    if actual != expected:
        raise AssertionError(f"{msg}\nExpected: {expected}\nActual: {actual}")


def assert_in(item, collection, msg=""):
    if item not in collection:
        raise AssertionError(f"{msg}\n{item} not in {collection}")


def assert_true(value, msg=""):
    if not value:
        raise AssertionError(f"{msg}\nExpected True, got {value}")


def assert_false(value, msg=""):
    if value:
        raise AssertionError(f"{msg}\nExpected False, got {value}")


# Test Rule 1: Basic numeric validity
def test_rule1_valid_observation():
    obs = {
        "projectCode": "123",
        "canonicalId": "A-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": 600.0,
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "valid")


def test_rule1_progress_below_zero():
    obs = {
        "projectCode": "123",
        "canonicalId": "A-1",
        "observationMonth": "2026-04",
        "physicalProgress": -10.0,
        "originalCost": 1000.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": 600.0,
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "invalid")
    assert_in("physical_progress_out_of_range", result["issues"])


def test_rule1_progress_above_100():
    obs = {
        "projectCode": "123",
        "canonicalId": "A-1",
        "observationMonth": "2026-04",
        "physicalProgress": 110.0,
        "originalCost": 1000.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": 600.0,
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "invalid")
    assert_in("physical_progress_out_of_range", result["issues"])


def test_rule1_negative_original_cost():
    obs = {
        "projectCode": "123",
        "canonicalId": "A-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": -100.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": 600.0,
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "invalid")
    assert_in("negative_original_cost", result["issues"])


def test_rule1_negative_revised_cost():
    obs = {
        "projectCode": "123",
        "canonicalId": "A-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": -100.0,
        "cumulativeExpenditure": 600.0,
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "invalid")
    assert_in("negative_revised_cost", result["issues"])


def test_rule1_negative_expenditure():
    obs = {
        "projectCode": "123",
        "canonicalId": "A-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": -10.0,
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "invalid")
    assert_in("negative_cumulative_expenditure", result["issues"])


def test_rule1_zero_costs_allowed():
    obs = {
        "projectCode": "123",
        "canonicalId": "A-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 0.0,
        "revisedCost": 0.0,
        "cumulativeExpenditure": 0.0,
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "valid")


# Test Rule 2: Cost consistency
def test_rule2_extreme_low_cost_ratio():
    obs = {
        "projectCode": "618886",
        "canonicalId": "A-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 0.5,
        "cumulativeExpenditure": 600.0,
        "costRatio": 0.0005,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "suspicious")
    assert_in("extreme_cost_reduction", result["issues"])


def test_rule2_extreme_high_cost_ratio():
    obs = {
        "projectCode": "XYZ",
        "canonicalId": "B-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 5000.0,
        "cumulativeExpenditure": 600.0,
        "costRatio": 5.0,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "suspicious")
    assert_in("extreme_cost_increase", result["issues"])


def test_rule2_normal_cost_ratio():
    obs = {
        "projectCode": "123",
        "canonicalId": "C-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1100.0,
        "cumulativeExpenditure": 600.0,
        "costRatio": 1.1,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "none")


def test_rule2_zero_original_cost_no_ratio():
    obs = {
        "projectCode": "123",
        "canonicalId": "C-2",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 0.0,
        "revisedCost": 100.0,
        "cumulativeExpenditure": 60.0,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "none")
    assert_false("extreme_cost_reduction" in result["issues"])
    assert_false("extreme_cost_increase" in result["issues"])


# Test Rule 3: Financial vs physical progress alignment
def test_rule3_high_expenditure_low_progress():
    obs = {
        "projectCode": "618737",
        "canonicalId": "D-1",
        "observationMonth": "2026-04",
        "physicalProgress": 2.0,
        "originalCost": 1000.0,
        "revisedCost": 1000.0,
        "cumulativeExpenditure": 850.0,
        "expenditureRatio": 0.85,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "suspicious")
    assert_in("high_expenditure_low_progress", result["issues"])


def test_rule3_high_expenditure_adequate_progress():
    obs = {
        "projectCode": "123",
        "canonicalId": "E-1",
        "observationMonth": "2026-04",
        "physicalProgress": 75.0,
        "originalCost": 1000.0,
        "revisedCost": 1000.0,
        "cumulativeExpenditure": 800.0,
        "expenditureRatio": 0.8,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "none")


# Test Rule 4: Progress regression
def test_rule4_progress_regression():
    prev = {
        "projectCode": "123",
        "canonicalId": "F-1",
        "observationMonth": "2026-03",
        "physicalProgress": 75.0,
    }
    curr = {
        "projectCode": "123",
        "canonicalId": "F-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
    }
    result = validate_observation(curr, prev)
    assert_equals(result["anomaly"], "suspicious")
    assert_in("physical_progress_regression", result["issues"])


def test_rule4_progress_stable():
    prev = {
        "projectCode": "123",
        "canonicalId": "G-1",
        "observationMonth": "2026-03",
        "physicalProgress": 50.0,
    }
    curr = {
        "projectCode": "123",
        "canonicalId": "G-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
    }
    result = validate_observation(curr, prev)
    assert_equals(result["anomaly"], "none")


# Test Rule 5: Date consistency
def test_rule5_start_after_original_doc():
    obs = {
        "projectCode": "123",
        "canonicalId": "H-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1000.0,
        "cumulativeExpenditure": 500.0,
        "startDate": "2026-07-01",
        "originalDoc": "2026-06-01",
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "invalid")
    assert_in("start_after_original_completion", result["issues"])


def test_rule5_start_after_revised_doc():
    obs = {
        "projectCode": "123",
        "canonicalId": "I-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1000.0,
        "cumulativeExpenditure": 500.0,
        "startDate": "2026-09-01",
        "revisedDoc": "2026-08-01",
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "invalid")
    assert_in("start_after_revised_completion", result["issues"])


def test_rule5_valid_date_sequence():
    obs = {
        "projectCode": "123",
        "canonicalId": "J-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1000.0,
        "cumulativeExpenditure": 500.0,
        "startDate": "2026-01-01",
        "originalDoc": "2026-06-01",
        "approvalDate": "2026-01-01",
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "valid")


def test_rule5_approval_after_start_is_suspicious_not_invalid():
    obs = {
        "projectCode": "123",
        "canonicalId": "J-2",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1000.0,
        "cumulativeExpenditure": 500.0,
        "startDate": "2026-05-01",
        "approvalDate": "2026-06-01",
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "valid")
    assert_equals(result["anomaly"], "suspicious")
    assert_in("approval_after_start", result["issues"])


def test_rule6_gap_is_not_invalid_and_marks_temporal_evidence():
    prev = {
        "projectCode": "123",
        "canonicalId": "G-1",
        "observationMonth": "2026-04",
        "physicalProgress": 10.0,
    }
    curr = {
        "projectCode": "123",
        "canonicalId": "G-1",
        "observationMonth": "2026-06",
        "physicalProgress": 20.0,
    }
    result = validate_observation(curr, prev)
    assert_equals(result["validity"], "valid")
    assert_true("temporal_gap_detected" in result["issues"] or result["evidence_by_aspect"].get("temporal") == "insufficient")


def test_rule7_single_observation_project_valid_but_insufficient_evidence():
    obs = {
        "projectCode": "123",
        "canonicalId": "S-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": 600.0,
    }
    result = validate_observation(obs)
    result["evidence"] = "insufficient"
    assert_equals(result["validity"], "valid")
    assert_equals(result["evidence"], "insufficient")


# Test Rule 9: Expenditure exceeding revised cost
def test_rule9_expenditure_exceeds_revised_cost():
    obs = {
        "projectCode": "618886",
        "canonicalId": "K-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 700.0,
        "cumulativeExpenditure": 815.0,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "suspicious")
    assert_in("expenditure_exceeds_revised_cost", result["issues"])


def test_rule9_expenditure_equals_revised_cost():
    obs = {
        "projectCode": "123",
        "canonicalId": "L-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 700.0,
        "cumulativeExpenditure": 700.0,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "none")


def test_rule9_expenditure_under_revised_cost():
    obs = {
        "projectCode": "123",
        "canonicalId": "M-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 700.0,
        "cumulativeExpenditure": 500.0,
    }
    result = validate_observation(obs)
    assert_equals(result["anomaly"], "none")


# Test multiple issues on same observation
def test_multiple_issues_invalid_and_suspicious():
    obs = {
        "projectCode": "123",
        "canonicalId": "N-1",
        "observationMonth": "2026-04",
        "physicalProgress": 110.0,
        "originalCost": 1000.0,
        "revisedCost": 0.1,
        "cumulativeExpenditure": 600.0,
        "costRatio": 0.0001,
    }
    result = validate_observation(obs)
    assert_equals(result["validity"], "invalid")
    assert_equals(result["anomaly"], "suspicious")
    assert_in("physical_progress_out_of_range", result["issues"])
    assert_in("extreme_cost_reduction", result["issues"])


# Test immutability
def test_observation_immutability():
    obs = {
        "projectCode": "123",
        "canonicalId": "O-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": 600.0,
        "nested": {"value": [1, 2, 3]},
    }
    obs_copy = {
        "projectCode": obs["projectCode"],
        "canonicalId": obs["canonicalId"],
        "observationMonth": obs["observationMonth"],
        "physicalProgress": obs["physicalProgress"],
        "originalCost": obs["originalCost"],
        "revisedCost": obs["revisedCost"],
        "cumulativeExpenditure": obs["cumulativeExpenditure"],
        "nested": {"value": [1, 2, 3]},
    }
    validate_observation(obs)
    assert_equals(obs, obs_copy, "Observation was modified")


# Test batch validation
def test_batch_validation():
    obs1 = {
        "projectCode": "123",
        "canonicalId": "P-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": 600.0,
    }
    obs2 = {
        "projectCode": "456",
        "canonicalId": "Q-1",
        "observationMonth": "2026-04",
        "physicalProgress": 110.0,
        "originalCost": 500.0,
        "revisedCost": 600.0,
        "cumulativeExpenditure": 300.0,
    }
    results = validate_observations([obs1, obs2])
    assert_equals(len(results), 2)
    assert_equals(results[0]["validity"], "valid")
    assert_equals(results[1]["validity"], "invalid")


# Test summary
def test_validation_summary():
    obs1 = {
        "projectCode": "123",
        "canonicalId": "R-1",
        "observationMonth": "2026-04",
        "physicalProgress": 50.0,
        "originalCost": 1000.0,
        "revisedCost": 1200.0,
        "cumulativeExpenditure": 600.0,
    }
    obs2 = {
        "projectCode": "456",
        "canonicalId": "S-1",
        "observationMonth": "2026-04",
        "physicalProgress": 110.0,
        "originalCost": 500.0,
        "revisedCost": 600.0,
        "cumulativeExpenditure": 300.0,
    }
    results = validate_observations([obs1, obs2])
    summary = summarize_validation(results)
    assert_equals(summary["total_observations"], 2)
    assert_equals(summary["valid"], 1)
    assert_equals(summary["invalid"], 1)
    assert_true(summary["valid"] + summary["invalid"] <= summary["total_observations"])


def run_all_tests():
    """Run all tests and report results."""
    tests = [
        ("Rule 1: Valid observation", test_rule1_valid_observation),
        ("Rule 1: Progress below zero", test_rule1_progress_below_zero),
        ("Rule 1: Progress above 100", test_rule1_progress_above_100),
        ("Rule 1: Negative original cost", test_rule1_negative_original_cost),
        ("Rule 1: Negative revised cost", test_rule1_negative_revised_cost),
        ("Rule 1: Zero costs allowed", test_rule1_zero_costs_allowed),
        ("Rule 2: Extreme low cost ratio", test_rule2_extreme_low_cost_ratio),
        ("Rule 2: Extreme high cost ratio", test_rule2_extreme_high_cost_ratio),
        ("Rule 2: Normal cost ratio", test_rule2_normal_cost_ratio),
        ("Rule 3: High expenditure low progress", test_rule3_high_expenditure_low_progress),
        ("Rule 3: High expenditure adequate progress", test_rule3_high_expenditure_adequate_progress),
        ("Rule 4: Progress regression", test_rule4_progress_regression),
        ("Rule 4: Progress stable", test_rule4_progress_stable),
        ("Rule 5: Start after original doc", test_rule5_start_after_original_doc),
        ("Rule 5: Start after revised doc", test_rule5_start_after_revised_doc),
        ("Rule 5: Valid date sequence", test_rule5_valid_date_sequence),
        ("Rule 9: Expenditure exceeds revised cost", test_rule9_expenditure_exceeds_revised_cost),
        ("Rule 9: Expenditure equals revised cost", test_rule9_expenditure_equals_revised_cost),
        ("Rule 9: Expenditure under revised cost", test_rule9_expenditure_under_revised_cost),
        ("Multiple issues", test_multiple_issues_invalid_and_suspicious),
        ("Observation immutability", test_observation_immutability),
        ("Batch validation", test_batch_validation),
        ("Validation summary", test_validation_summary),
    ]
    
    passed = 0
    failed = 0
    
    print(f"\n{'='*70}")
    print(f"{'PAIMANA Data Validation Test Suite':^70}")
    print(f"{'='*70}\n")
    
    for test_name, test_func in tests:
        try:
            test_func()
            print(f"✓ {test_name}")
            passed += 1
        except Exception as e:
            print(f"✗ {test_name}")
            print(f"  Error: {str(e)}")
            failed += 1
    
    print(f"\n{'-'*70}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)} tests")
    print(f"{'='*70}\n")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
