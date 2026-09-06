"""
SHAP Explanations Test Module - Human Readable Reasons

This module contains unit tests for the SHAP explanation utilities in the
ml.shap_explanations package, specifically focusing on building human-readable
reasons from SHAP values for time pressure, progress execution, and financial
signals groups.
"""

from math import isclose

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.shap_explanations import (
    build_financial_reason,
    build_human_readable_reasons,
    build_prediction_explanation,
    build_progress_execution_reason,
    build_time_pressure_reason,
    combined_explanation_with_direction,
    get_shap_direction,
    group_shap_contributions,
    map_local_shap_values,
    rank_shap_groups,
)


def _fitted_pipeline():
    """
    Create a fitted pipeline with sample data for testing.

    Returns:
        tuple: (data, preprocessor, model) containing:
            - data: DataFrame with 4 sample rows
            - preprocessor: Fitted ColumnTransformer
            - model: Fitted LogisticRegression model
    """
    numeric_names = [f"n{i}" for i in range(16)]
    categorical_names = [f"cat{i}" for i in range(3)]
    columns = numeric_names + categorical_names

    rows = []

    for row_number, value in enumerate(("a", "b", "c", "d")):
        row = {
            name: row_number + index
            for index, name in enumerate(numeric_names)
        }

        row.update(
            {
                name: value
                for name in categorical_names
            }
        )

        rows.append(row)

    data = pd.DataFrame(
        rows,
        columns=columns,
    )

    preprocessor = ColumnTransformer(
        [
            (
                "num",
                Pipeline(
                    [
                        ("scale", StandardScaler()),
                    ]
                ),
                numeric_names,
            ),
            (
                "cat",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                categorical_names,
            ),
        ]
    ).fit(data)

    model = LogisticRegression().fit(
        preprocessor.transform(data),
        [0, 1, 0, 1],
    )

    return data, preprocessor, model


# ============================================================================
# SHAP Value Mapping Tests
# ============================================================================


def test_maps_known_category_and_preserves_its_shap_value():
    """
    Test that known categorical features are properly mapped and their SHAP
    values are preserved.
    """
    data, preprocessor, model = _fitted_pipeline()

    values = np.arange(28, dtype=float)

    result = map_local_shap_values(
        model,
        preprocessor,
        data.iloc[0],
        values,
    )

    category = next(
        item
        for item in result
        if item["feature_name"] == "cat0"
    )

    assert category["raw_value"] == "a"
    assert category["encoded_feature_name"] == "cat0_a"
    assert category["shap_contribution"] == values[16]


def test_unseen_category_has_unavailable_contribution():
    """
    Test that unseen categorical features return None for SHAP contributions.
    """
    data, preprocessor, model = _fitted_pipeline()

    observation = data.iloc[0].copy()
    observation["cat1"] = "unseen"

    result = map_local_shap_values(
        model,
        preprocessor,
        observation,
        np.arange(28.0),
    )

    category = next(
        item
        for item in result
        if item["feature_name"] == "cat1"
    )

    assert category["shap_contribution"] is None
    assert category["encoded_feature_name"] is None


def test_maps_numeric_values_and_returns_original_feature_count():
    """
    Test that numeric features are correctly mapped and maintain the
    original feature count.
    """
    data, preprocessor, model = _fitted_pipeline()

    values = np.arange(28, dtype=float)

    result = map_local_shap_values(
        model,
        preprocessor,
        data.iloc[0],
        values,
    )

    assert len(result) == 19

    assert [
        (
            item["feature_name"],
            item["shap_contribution"],
        )
        for item in result[:3]
    ] == [
        ("n0", values[0]),
        ("n1", values[1]),
        ("n2", values[2]),
    ]


# ============================================================================
# SHAP Value Grouping Tests
# ============================================================================


def test_group_shap_contributions_returns_all_groups_and_signed_sums():
    """
    Test that SHAP contributions are correctly grouped by category.
    """
    clean_shap = {
        "remainingDays": 3.0,
        "remainingMonths": -1.0,
        "requiredVelocity": 2.0,
        "observedVelocity": -3.0,
        "velocityGap": 4.0,
        "velocityRatio": -5.0,
        "currentProgress": 6.0,
        "progressDelta": -7.0,
        "recentProgressVelocity": 8.0,
        "trajectory": -9.0,
        "scheduleState": 10.0,
        "progressCondition": -11.0,
        "remainingProgress": 0.5,
        "costIncrease": 12.0,
        "costIncreasePercent": -13.0,
        "costRatio": 14.0,
        "expenditureRatio": -15.0,
        "expenditureChange": 16.0,
        "expenditurePerProgress": -17.0,
    }

    result = group_shap_contributions(clean_shap)

    assert set(result) == {
        "time_pressure",
        "progress_execution",
        "financial_signals",
    }

    assert result == {
        "time_pressure": 2.0,
        "progress_execution": -4.5,
        "financial_signals": -3.0,
    }


def test_group_shap_contributions_ignores_none_and_missing_features():
    """
    Test that None values and missing features are ignored.
    """
    clean_shap = {
        "remainingDays": 5.0,
        "remainingMonths": None,
        "currentProgress": -2.0,
        "costIncrease": 1.5,
    }

    result = group_shap_contributions(clean_shap)

    assert result == {
        "time_pressure": 5.0,
        "progress_execution": -2.0,
        "financial_signals": 1.5,
    }


def test_group_feature_accounting_covers_19_model_features_once():
    """
    Test that all 19 model features are accounted for exactly once.
    """
    model_features = [
        "currentProgress",
        "progressDelta",
        "recentProgressVelocity",
        "remainingProgress",
        "remainingDays",
        "remainingMonths",
        "observedVelocity",
        "requiredVelocity",
        "velocityGap",
        "velocityRatio",
        "costIncrease",
        "costIncreasePercent",
        "costRatio",
        "expenditureRatio",
        "expenditureChange",
        "expenditurePerProgress",
        "trajectory",
        "scheduleState",
        "progressCondition",
    ]

    clean_shap = {
        feature: 2 ** index
        for index, feature in enumerate(model_features)
    }

    result = group_shap_contributions(clean_shap)

    assert sum(result.values()) == sum(clean_shap.values())


# ============================================================================
# SHAP Value Ranking and Direction Tests
# ============================================================================


def test_rank_shap_groups():
    """
    Test that grouped SHAP contributions are ranked by absolute magnitude.
    """
    grouped_shap = {
        "time_pressure": 1.2,
        "progress_execution": -0.4,
        "financial_signals": 0.1,
    }

    result = rank_shap_groups(grouped_shap)

    assert result == [
        ("time_pressure", 1.2),
        ("progress_execution", -0.4),
        ("financial_signals", 0.1),
    ]


def test_get_shap_direction():
    """
    Test positive, negative, and neutral SHAP directions.
    """
    assert get_shap_direction(1.2) == "increases"
    assert get_shap_direction(-0.4) == "decreases"
    assert get_shap_direction(0) == "neutral"


def test_combined_explanation_with_direction():
    """
    Test grouped SHAP explanations with direction labels.
    """
    clean_shap = {
        "remainingDays": 0.8,
        "remainingMonths": 0.4,
        "requiredVelocity": 0.3,
        "observedVelocity": -0.1,
        "costIncrease": 0.1,
    }

    result = combined_explanation_with_direction(clean_shap)

    expected = [
        {
            "group": "time_pressure",
            "value": 1.2,
            "direction": "increases",
        },
        {
            "group": "progress_execution",
            "value": 0.2,
            "direction": "increases",
        },
        {
            "group": "financial_signals",
            "value": 0.1,
            "direction": "increases",
        },
    ]

    assert [
        (
            item["group"],
            item["direction"],
        )
        for item in result
    ] == [
        (
            item["group"],
            item["direction"],
        )
        for item in expected
    ]

    assert all(
        isclose(
            actual["value"],
            expected_item["value"],
        )
        for actual, expected_item in zip(
            result,
            expected,
        )
    )


# ============================================================================
# Human Readable Reason Building Tests - Time Pressure
# ============================================================================


def test_build_time_pressure_reason():
    """
    Test building time pressure reason when deadline is approaching.
    """
    feature_values = {
        "remainingDays": 31,
    }

    result = build_time_pressure_reason(
        1.2,
        feature_values,
    )

    assert result["group"] == "time_pressure"
    assert result["contribution"] == 1.2
    assert result["direction"] == "increases"
    assert result["message"] == (
        "Only 31 days remain before "
        "the current completion deadline."
    )


def test_build_time_pressure_reason_deadline_passed():
    """
    Test building time pressure reason when deadline has passed.
    """
    feature_values = {
        "remainingDays": -5,
    }

    result = build_time_pressure_reason(
        1.2,
        feature_values,
    )

    assert result["message"] == (
        "The current completion deadline "
        "has already passed."
    )


def test_build_time_pressure_reason_ignores_distant_deadline():
    """
    Test that distant deadlines are ignored for time pressure reasons.
    """
    feature_values = {
        "remainingDays": 90,
    }

    result = build_time_pressure_reason(
        1.2,
        feature_values,
    )

    assert result is None


def test_build_time_pressure_reason_missing_value():
    """
    Test missing remainingDays handling.
    """
    feature_values = {
        "remainingDays": None,
    }

    result = build_time_pressure_reason(
        1.2,
        feature_values,
    )

    assert result is None


# ============================================================================
# Human Readable Reason Building Tests - Progress Execution
# ============================================================================


def test_build_progress_execution_reason_uses_velocity_evidence():
    """
    Test building progress execution reason with velocity evidence.
    """
    feature_values = {
        "currentProgress": 75.0,
        "observedVelocity": 5.0,
        "requiredVelocity": 24.5464,
        "scheduleState": "behind",
    }

    result = build_progress_execution_reason(
        0.8,
        feature_values,
    )

    assert result["group"] == "progress_execution"
    assert result["contribution"] == 0.8
    assert result["direction"] == "increases"
    assert result["message"] == (
        "The project is 75.0% complete, "
        "but recent progress is 5.00 "
        "percentage points/month versus "
        "approximately 24.55 percentage "
        "points/month required to meet "
        "the deadline."
    )


def test_build_progress_execution_reason_stalled():
    """
    Test building progress execution reason when progress is stalled.
    """
    feature_values = {
        "currentProgress": 98.5,
        "observedVelocity": 0.0,
        "requiredVelocity": 1.4728,
        "scheduleState": "stalled",
    }

    result = build_progress_execution_reason(
        1.1,
        feature_values,
    )

    assert result["group"] == "progress_execution"
    assert result["direction"] == "increases"
    assert result["message"] == (
        "Recent reported progress "
        "is currently stalled."
    )


def test_build_progress_execution_reason_regressing():
    """
    Test building progress execution reason when progress is regressing.
    """
    feature_values = {
        "scheduleState": "regressing",
    }

    result = build_progress_execution_reason(
        0.7,
        feature_values,
    )

    assert result["message"] == (
        "Recent reported physical "
        "progress has declined."
    )


def test_build_progress_execution_reason_overdue():
    """
    Test building progress execution reason when project is overdue.
    """
    feature_values = {
        "scheduleState": "overdue_incomplete",
    }

    result = build_progress_execution_reason(
        0.7,
        feature_values,
    )

    assert result["message"] == (
        "The project is incomplete despite "
        "the current completion deadline "
        "having passed."
    )


def test_build_progress_execution_reason_no_evidence():
    """
    Test that no progress execution reason is generated without evidence.
    """
    feature_values = {
        "scheduleState": "on_track",
    }

    result = build_progress_execution_reason(
        0.1,
        feature_values,
    )

    assert result is None


# ============================================================================
# Human Readable Reason Building Tests - Financial Signals
# ============================================================================


def test_build_financial_reason_cost_increase():
    """
    Test building financial reason when costs have increased.
    """
    feature_values = {
        "costIncreasePercent": 12.5,
        "expenditureChange": 4.0,
    }

    result = build_financial_reason(
        0.9,
        feature_values,
    )

    assert result["group"] == "financial_signals"
    assert result["contribution"] == 0.9
    assert result["direction"] == "increases"
    assert result["message"] == (
        "The revised project cost is "
        "12.5% higher than the original cost."
    )


def test_build_financial_reason_expenditure_change():
    """
    Test building financial reason when expenditure has changed.
    """
    feature_values = {
        "costIncreasePercent": 0.0,
        "expenditureChange": 5.2,
    }

    result = build_financial_reason(
        0.5,
        feature_values,
    )

    assert result["message"] == (
        "Cumulative expenditure increased "
        "by 5.20 since the previous monthly "
        "observation."
    )


def test_build_financial_reason_no_signal():
    """
    Test that no financial reason is generated without financial signals.
    """
    feature_values = {
        "costIncreasePercent": 0.0,
        "expenditureChange": 0.0,
    }

    result = build_financial_reason(
        0.5,
        feature_values,
    )

    assert result is None


# ============================================================================
# Human Readable Reasons Integration Tests
# ============================================================================


def test_build_human_readable_reasons_ranks_groups():
    """
    Test that human-readable reasons are built and ranked correctly.
    """
    # Added financial SHAP contributions to ensure all three groups are present
    clean_shap = {
        "remainingDays": 2.0,
        "remainingMonths": 1.5,
        "requiredVelocity": 1.0,
        "observedVelocity": 0.5,
        "scheduleState": 0.8,
        "currentProgress": 0.3,
        "remainingProgress": 0.2,
        "costIncreasePercent": 0.5,   # Added for financial group
        "expenditureChange": 0.4,     # Added for financial group
        "costIncrease": 0.3,          # Added for financial group
    }

    feature_values = {
        "remainingDays": 31,
        "currentProgress": 75.0,
        "observedVelocity": 5.0,
        "requiredVelocity": 24.5464,
        "scheduleState": "behind",
        "costIncreasePercent": 12.5,  # Changed from 0.0 to trigger financial reason
        "expenditureChange": 5.2,
    }

    result = build_human_readable_reasons(
        clean_shap,
        feature_values,
        max_reasons=3,
    )

    # Should have 3 reasons, one for each group
    assert len(result) == 3

    # Verify groups are in the correct order (by contribution value)
    assert [
        item["group"]
        for item in result
    ] == [
        "time_pressure",      # Largest contribution: 2.0 + 1.5 = 3.5
        "progress_execution", # Second largest: 1.0 + 0.5 + 0.8 + 0.3 + 0.2 = 2.8
        "financial_signals",  # Smallest: 0.5 + 0.4 + 0.3 = 1.2
    ]

    # Verify directions
    assert [
        item["direction"]
        for item in result
    ] == [
        "increases",
        "increases",
        "increases",
    ]


def test_build_human_readable_reasons_respects_max_reasons():
    """
    Test that max_reasons limits the number of returned reasons.
    """
    clean_shap = {
        "remainingDays": 1.0,
        "remainingMonths": 0.5,
        "requiredVelocity": 0.4,
        "observedVelocity": -0.1,
        "costIncrease": 0.2,
    }

    feature_values = {
        "remainingDays": 20,
        "currentProgress": 90.0,
        "observedVelocity": 0.0,
        "requiredVelocity": 2.0,
        "scheduleState": "stalled",
        "costIncreasePercent": 10.0,
        "expenditureChange": 4.0,
    }

    result = build_human_readable_reasons(
        clean_shap,
        feature_values,
        max_reasons=2,
    )

    assert len(result) == 2


def test_build_human_readable_reasons_skips_unusable_group():
    """
    Test that unusable groups are skipped.
    """
    clean_shap = {
        "remainingDays": 0.1,
        "remainingMonths": 0.1,
        "requiredVelocity": 0.05,
        "observedVelocity": 0.01,
        "costIncrease": 0.01,
    }

    feature_values = {
        "remainingDays": 120,
        "scheduleState": "on_track",
        "costIncreasePercent": 0.0,
        "expenditureChange": 0.0,
    }

    result = build_human_readable_reasons(
        clean_shap,
        feature_values,
        max_reasons=3,
    )

    assert result == []


# ============================================================================
# Complete Prediction Explanation Tests
# ============================================================================


def test_build_prediction_explanation():
    """
    Test the complete project-level prediction explanation.

    clean_shap contains numeric SHAP contributions only.
    feature_values contains the actual project feature values.
    """
    clean_shap = {
        "remainingDays": 2.0,
        "remainingMonths": 1.5,
        "requiredVelocity": 1.0,
        "observedVelocity": 0.5,
        "scheduleState": 0.8,
        "currentProgress": 0.3,
        "remainingProgress": 0.2,
    }

    feature_values = {
        "currentProgress": 98.5,
        "remainingProgress": 1.5,
        "remainingDays": 31,
        "observedVelocity": 0.0,
        "requiredVelocity": 1.4728,
        "scheduleState": "stalled",
    }

    result = build_prediction_explanation(
        probability=0.682,
        clean_shap=clean_shap,
        feature_values=feature_values,
    )

    # Verify prediction section
    assert result["prediction"]["probability"] == 0.682
    assert result["prediction"]["riskLevel"] == "high"
    assert result["prediction"]["target"] == "deadline_revision_next_month"

    # Verify reasons section
    assert len(result["reasons"]) > 0

    # Verify context section
    assert result["context"]["currentProgress"] == 98.5
    assert result["context"]["remainingProgress"] == 1.5
    assert result["context"]["remainingDays"] == 31
    assert result["context"]["observedVelocity"] == 0.0
    assert result["context"]["requiredVelocity"] == 1.4728
    assert result["context"]["scheduleState"] == "stalled"


# ============================================================================
# Test Runner
# ============================================================================


def _run_module_tests():
    """
    Run all test functions in this module without requiring pytest.
    """
    import traceback

    tests = sorted(
        (
            name,
            test,
        )
        for name, test in globals().items()
        if name.startswith("test_") and callable(test)
    )

    failures = []

    for name, test in tests:
        try:
            test()
        except Exception:
            failures.append(name)
            traceback.print_exc()
        else:
            print(f"PASS {name}")

    print(
        f"{len(tests)} tests executed; "
        f"{len(tests) - len(failures)} passed; "
        f"{len(failures)} failed"
    )

    return not failures


if __name__ == "__main__":
    raise SystemExit(
        0 if _run_module_tests() else 1
    )