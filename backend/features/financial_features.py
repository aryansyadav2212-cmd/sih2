"""
Financial features for project observations.

This module calculates:
1. Financial state features from a single observation.
2. Month-to-month financial/progress behaviour.

Missing values are handled explicitly and do not cause crashes.
"""

from __future__ import annotations

from typing import Any


def _to_float(value: Any) -> float | None:
    """Safely convert a value to float."""

    try:
        if value is None:
            return None

        return float(value)

    except (TypeError, ValueError):
        return None


def calculate_cost_features(
    originalCost,
    revisedCost,
    cumulativeExpenditure,
):
    """
    Calculate financial state features for one observation.

    Returns:
        costIncrease:
            Absolute difference between revised and original cost.

        costIncreasePercent:
            Percentage increase relative to original cost.

        costRatio:
            Revised cost / original cost.

        expenditureRatio:
            Cumulative expenditure / revised cost.
    """

    original_cost = _to_float(originalCost)
    revised_cost = _to_float(revisedCost)
    cumulative_expenditure = _to_float(cumulativeExpenditure)

    if (
        original_cost is None
        or revised_cost is None
        or cumulative_expenditure is None
    ):
        return {
            "costIncrease": None,
            "costIncreasePercent": None,
            "costRatio": None,
            "expenditureRatio": None,
        }

    cost_increase = revised_cost - original_cost

    if original_cost > 0:
        cost_increase_percent = (
            cost_increase / original_cost
        ) * 100

        cost_ratio = revised_cost / original_cost
    else:
        cost_increase_percent = None
        cost_ratio = None

    if revised_cost > 0:
        expenditure_ratio = (
            cumulative_expenditure / revised_cost
        )
    else:
        expenditure_ratio = None

    return {
        "costIncrease": round(cost_increase, 4),

        "costIncreasePercent": (
            round(cost_increase_percent, 4)
            if cost_increase_percent is not None
            else None
        ),

        "costRatio": (
            round(cost_ratio, 4)
            if cost_ratio is not None
            else None
        ),

        "expenditureRatio": (
            round(expenditure_ratio, 4)
            if expenditure_ratio is not None
            else None
        ),
    }


def calculate_expenditure_change(current, previous):
    """Calculate change in cumulative expenditure."""

    current = _to_float(current)
    previous = _to_float(previous)

    if current is None or previous is None:
        return None

    return round(current - previous, 4)


def calculate_expenditure_change_percent(current, previous):
    """Calculate percentage change in cumulative expenditure."""

    current = _to_float(current)
    previous = _to_float(previous)

    if current is None or previous is None:
        return None

    if previous == 0:
        return None

    change_percent = (
        (current - previous) / previous
    ) * 100

    return round(change_percent, 4)


def financial_features(
    current: dict[str, Any],
    previous: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Calculate month-to-month financial and progress behaviour.

    current:
        Observation for the prediction month.

    previous:
        Immediately preceding observation.
    """

    if previous is None:
        return {
            "expenditureChange": None,
            "expenditureChangePercent": None,
            "progressChange": None,
            "expenditurePerProgress": None,
            "progressCondition": "insufficient_data",
        }

    current_expenditure = _to_float(
        current.get("cumulativeExpenditure")
    )

    previous_expenditure = _to_float(
        previous.get("cumulativeExpenditure")
    )

    current_progress = _to_float(
        current.get("physicalProgress")
    )

    previous_progress = _to_float(
        previous.get("physicalProgress")
    )

    # --------------------------------------------------
    # Expenditure change
    # --------------------------------------------------

    expenditure_change = calculate_expenditure_change(
        current_expenditure,
        previous_expenditure,
    )

    expenditure_change_percent = (
        calculate_expenditure_change_percent(
            current_expenditure,
            previous_expenditure,
        )
    )

    # --------------------------------------------------
    # Progress change
    # --------------------------------------------------

    if (
        current_progress is None
        or previous_progress is None
    ):
        progress_change = None
        progress_condition = "insufficient_data"

    else:
        progress_change = round(
            current_progress - previous_progress,
            4,
        )

        if progress_change > 0:
            progress_condition = "progressing"

        elif progress_change == 0:
            progress_condition = "no_progress"

        else:
            progress_condition = "regression"

    # ---------------------------------------------
    # Expenditure efficiency
    # ---------------------------------------------

    if (
        expenditure_change is not None
        and progress_change is not None
        and progress_change > 0
    ):
        expenditure_per_progress = (
            expenditure_change / progress_change
        )

        expenditure_per_progress = round(
            expenditure_per_progress,
            4,
        )

    else:
        expenditure_per_progress = None

    return {
        "expenditureChange": expenditure_change,
        "expenditureChangePercent": expenditure_change_percent,
        "progressChange": progress_change,
        "expenditurePerProgress": expenditure_per_progress,
        "progressCondition": progress_condition,
    }