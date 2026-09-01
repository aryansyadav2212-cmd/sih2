"""
Build month-wise project features for ML training.

For a given project and prediction month:

    observations <= prediction month
                ↓
        historical snapshot
                ↓
    ┌───────────┼────────────┐
    ↓           ↓            ↓
trajectory   schedule     financial
    └───────────┼────────────┘
                ↓
          feature vector

Future observations are never used when constructing
the features for a prediction month.
"""

from __future__ import annotations

from typing import Any

from features.progress_trajectory import project_trajectory
from features.schedule_feasibility import project_schedule_feasibility
from features.financial_features import (
    financial_features,
    calculate_cost_features,
)


def get_project_observations_up_to(
    project_observations: list[dict[str, Any]],
    prediction_month: str,
) -> list[dict[str, Any]]:
    """
    Return observations available up to and including
    the prediction month.

    The returned observations are sorted chronologically.
    """

    observations = [
        observation
        for observation in project_observations
        if (
            observation.get("reportMonth")
            and observation["reportMonth"] <= prediction_month
        )
    ]

    observations.sort(
        key=lambda observation: observation["reportMonth"]
    )

    return observations


def build_monthwise_features(
    project_observations: list[dict[str, Any]],
    prediction_month: str,
) -> dict[str, Any]:
    """
    Build all features for one project as of prediction_month.
    """

    historical_observations = get_project_observations_up_to(
        project_observations,
        prediction_month,
    )

    if not historical_observations:
        return {}

    # --------------------------------------------------
    # Current / previous observation
    # --------------------------------------------------

    current = historical_observations[-1]

    previous = (
        historical_observations[-2]
        if len(historical_observations) >= 2
        else None
    )

    # --------------------------------------------------
    # Progress trajectory
    # --------------------------------------------------

    trajectory = project_trajectory(
        historical_observations
    )

    # --------------------------------------------------
    # Schedule feasibility
    # --------------------------------------------------

    schedule = project_schedule_feasibility(
        current,
        trajectory,
    )

    # --------------------------------------------------
    # Financial state
    # --------------------------------------------------

    cost = calculate_cost_features(
        current.get("originalCost"),
        current.get("revisedCost"),
        current.get("cumulativeExpenditure"),
    )

    # --------------------------------------------------
    # Financial month-to-month behaviour
    # --------------------------------------------------

    financial = financial_features(
        current,
        previous,
    )

    # --------------------------------------------------
    # Combine
    # --------------------------------------------------

    return {
        "canonicalId": current.get("canonicalId"),
        "projectCode": current.get("projectCode"),
        "observationMonth": prediction_month,

        "progress": {
            "currentProgress": current.get("physicalProgress"),
            "progressDelta": (
                financial.get("progressChange")
            ),
            "recentProgressVelocity": (
                trajectory.get("recentProgressVelocity")
            ),
            "trajectory": trajectory.get("trajectory"),
        },

        "schedule": {
            "remainingProgress": schedule.get(
                "remainingProgress"
            ),
            "remainingDays": schedule.get(
                "remainingDays"
            ),
            "remainingMonths": schedule.get(
                "remainingMonths"
            ),
            "observedVelocity": schedule.get(
                "observedVelocity"
            ),
            "requiredVelocity": schedule.get(
                "requiredVelocity"
            ),
            "velocityGap": schedule.get(
                "velocityGap"
            ),
            "velocityRatio": schedule.get(
                "velocityRatio"
            ),
            "scheduleState": schedule.get(
                "scheduleState"
            ),
        },

        "financial": {
            "costIncrease": cost.get(
                "costIncrease"
            ),
            "costIncreasePercent": cost.get(
                "costIncreasePercent"
            ),
            "costRatio": cost.get(
                "costRatio"
            ),
            "expenditureRatio": cost.get(
                "expenditureRatio"
            ),
            "expenditureChange": financial.get(
                "expenditureChange"
            ),
            "expenditureChangePercent": financial.get(
                "expenditureChangePercent"
            ),
            "expenditurePerProgress": financial.get(
                "expenditurePerProgress"
            ),
            "progressCondition": financial.get(
                "progressCondition"
            ),
        },
    }