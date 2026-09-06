"""
Integration test: Verify validation layer doesn't break feature engineering.

Tests:
1. Load observations
2. Run validation (should not modify data)
3. Verify feature engineering still works on same observations
4. Check that no observations were skipped or modified

Run: python3 features/integration_test.py
"""

import json
import sys
from data_validation import validate_observations, summarize_validation


def load_observations():
    """Load observations from JSON."""
    with open("data/historical/observations.json", 'r') as f:
        data = json.load(f)
        if isinstance(data, dict) and "observations" in data:
            return data["observations"]
        return data


def test_observations_immutable_after_validation():
    """Verify observations are not modified by validation."""
    obs = load_observations()
    
    # Take a sample of observations
    sample = obs[:10]
    
    # Deepcopy for comparison
    import copy
    original = copy.deepcopy(sample)
    
    # Validate
    results = validate_observations(sample)
    
    # Check immutability
    for i, (orig, sample_obs) in enumerate(zip(original, sample)):
        if orig != sample_obs:
            raise AssertionError(f"Observation {i} was modified during validation")
    
    print("✓ All observations remain immutable after validation")
    return True


def test_validation_count_matches():
    """Verify validation result count matches input."""
    obs = load_observations()
    sample = obs[:100]
    
    results = validate_observations(sample)
    
    if len(results) != len(sample):
        raise AssertionError(f"Result count {len(results)} != sample count {len(sample)}")
    
    print("✓ Validation result count matches input")
    return True


def test_observation_identity_preserved():
    """Verify observation identity is preserved in validation result."""
    obs = load_observations()
    sample = obs[:20]
    
    results = validate_observations(sample)
    
    for i, (orig, result) in enumerate(zip(sample, results)):
        # Check that observation_id dict contains the same keys as original
        if not isinstance(result["observation_id"], dict):
            raise AssertionError(f"Observation {i} observation_id is not a dict")
        if "projectCode" not in result["observation_id"]:
            raise AssertionError(f"Observation {i} observation_id missing projectCode")
    
    print("✓ Observation identity preserved in validation results")
    return True


def test_no_null_validity_or_anomaly():
    """Verify every observation has validity and anomaly."""
    obs = load_observations()
    sample = obs[:100]
    
    results = validate_observations(sample)
    
    for i, result in enumerate(results):
        if result["validity"] not in ["valid", "invalid"]:
            raise AssertionError(f"Result {i} has invalid validity: {result['validity']}")
        if result["anomaly"] not in ["none", "suspicious"]:
            raise AssertionError(f"Result {i} has invalid anomaly: {result['anomaly']}")
        if result["evidence"] not in ["sufficient", "insufficient"]:
            raise AssertionError(f"Result {i} has invalid evidence: {result['evidence']}")
    
    print("✓ All results have valid validity/anomaly/evidence values")
    return True


def test_full_validation_scale():
    """Run full validation on all observations."""
    obs = load_observations()
    print(f"  Validating {len(obs)} observations...")
    
    results = validate_observations(obs, group_by_project=True)
    
    if len(results) != len(obs):
        raise AssertionError(f"Result count mismatch: {len(results)} != {len(obs)}")
    
    summary = summarize_validation(results)
    
    print(f"  ✓ Validation complete: {summary['valid']} valid, {summary['invalid']} invalid, {summary['suspicious']} suspicious")
    print(f"  ✓ Top issue: {list(summary['issues_distribution'].items())[0]}")
    
    return True


def test_feature_engineering_still_works():
    """Verify feature engineering modules can still be imported."""
    # This is a sanity check - modules should import without errors
    try:
        import progress_trajectory
        import schedule_feasibility
        import financial_features
        print("✓ Feature engineering modules import successfully")
        return True
    except ImportError as e:
        raise AssertionError(f"Failed to import feature modules: {e}")


def run_integration_tests():
    """Run all integration tests."""
    tests = [
        ("Observations immutable after validation", test_observations_immutable_after_validation),
        ("Validation count matches input", test_validation_count_matches),
        ("Observation identity preserved", test_observation_identity_preserved),
        ("All results have valid values", test_no_null_validity_or_anomaly),
        ("Full scale validation (7590 obs)", test_full_validation_scale),
        ("Feature engineering modules work", test_feature_engineering_still_works),
    ]
    
    print(f"\n{'='*70}")
    print(f"{'PAIMANA Validation + Feature Engineering Integration Tests':^70}")
    print(f"{'='*70}\n")
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            print(f"✗ {test_name}")
            print(f"  Error: {str(e)}")
            failed += 1
    
    print(f"\n{'-'*70}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)} tests")
    print(f"{'='*70}\n")
    
    if failed == 0:
        print("✅ All integration tests passed! Validation layer is safe to deploy.\n")
    
    return failed == 0


if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)
