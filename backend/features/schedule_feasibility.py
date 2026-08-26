"""Schedule feasibility features from canonical observations + trajectory.

Reuses recentProgressVelocity from the progress-trajectory layer.
Does not recompute velocity. Does not score risk.
"""

from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date
from typing import Any, Optional

AVERAGE_DAYS_PER_MONTH = 365.25 / 12


def last_day_of_month(year: int, month: int) -> date:
    return date(year, month, monthrange(year, month)[1])


def parse_year_month(value: Optional[str]) -> Optional[tuple[int, int]]:
    if not value:
        return None
    parts = str(value).strip().split("-")
    if len(parts) < 2:
        return None
    try:
        year = int(parts[0])
        month = int(parts[1])
    except ValueError:
        return None
    if not (1 <= month <= 12):
        return None
    return year, month


def month_end(value: Optional[str]) -> Optional[date]:
    parsed = parse_year_month(value)
    if parsed is None:
        return None
    return last_day_of_month(*parsed)


def _round(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    return round(float(value), 4)


def observed_velocity_evidence(recent_interval_count: Optional[int]) -> str:
    count = recent_interval_count or 0
    if count <= 0:
        return "none"
    if count == 1:
        return "single_interval"
    if count == 2:
        return "two_intervals"
    return "three_intervals"


def latest_consecutive_monthly_velocity(intervals: Optional[list[dict[str, Any]]]) -> Optional[float]:
    if not intervals:
        return None
    for item in reversed(intervals):
        velocity = item.get("monthlyProgressVelocity")
        if velocity is not None:
            return velocity
    return None


def select_target(observation: dict[str, Any]) -> tuple[Optional[date], str]:
    if observation.get("revisedDoc"):
        target = month_end(observation["revisedDoc"])
        if target is not None:
            return target, "revised"
    if observation.get("originalDoc"):
        target = month_end(observation["originalDoc"])
        if target is not None:
            return target, "original"
    return None, "none"


def latest_observation(rows: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    dated = [row for row in rows if row.get("reportMonth")]
    if not dated:
        return None
    return max(dated, key=lambda row: row["reportMonth"])


def velocity_ratio_and_reason(
    required_velocity: Optional[float],
    observed_velocity: Optional[float],
) -> tuple[Optional[float], Optional[str]]:
    if required_velocity is None:
        return None, "required_velocity_undefined"
    if observed_velocity is None:
        return None, "observed_velocity_unavailable"
    if observed_velocity == 0:
        return None, "observed_velocity_zero"
    if observed_velocity < 0:
        return None, "observed_velocity_negative"
    if required_velocity is not None and observed_velocity > 0:
        return _round(required_velocity / observed_velocity), None
    return None, "observed_velocity_unavailable"


def schedule_state(
    *,
    current_progress: Optional[float],
    target_date_type: str,
    remaining_days: Optional[int],
    observed_velocity: Optional[float],
    velocity_gap: Optional[float],
) -> Optional[str]:
    if current_progress is None:
        return None
    if current_progress >= 100:
        return "completed"
    if target_date_type == "none":
        return "no_target"
    if remaining_days is not None and remaining_days <= 0 and current_progress < 100:
        return "overdue_incomplete"
    if observed_velocity is None:
        return "insufficient_observed_velocity"
    if remaining_days is not None and remaining_days > 0 and observed_velocity == 0:
        return "stalled"
    if remaining_days is not None and remaining_days > 0 and observed_velocity < 0:
        return "regressing"
    if (
        observed_velocity > 0
        and remaining_days is not None
        and remaining_days > 0
        and velocity_gap is not None
        and velocity_gap <= 0
    ):
        return "on_track"
    if (
        observed_velocity > 0
        and remaining_days is not None
        and remaining_days > 0
        and velocity_gap is not None
        and velocity_gap > 0
    ):
        return "behind"
    return None


def project_schedule_feasibility(
    observation: dict[str, Any],
    trajectory: dict[str, Any],
) -> dict[str, Any]:
    as_of_month = observation.get("reportMonth")
    as_of_date = month_end(as_of_month)
    current_progress = observation.get("physicalProgress")
    target_date, target_date_type = select_target(observation)
    observed_velocity = trajectory.get("recentProgressVelocity")
    flags = trajectory.get("flags") or {}
    recent_interval_count = trajectory.get("recentIntervalCount") or 0

    record = {
        "canonicalId": trajectory.get("canonicalId") or observation.get("canonicalId"),
        "projectCode": observation.get("projectCode") or trajectory.get("projectCode"),
        "pmgId": observation.get("pmgId") if observation.get("pmgId") is not None else trajectory.get("pmgId"),
        "projectName": observation.get("projectName") or trajectory.get("projectName"),
        "asOfMonth": as_of_month,
        "asOfDate": as_of_date.isoformat() if as_of_date else None,
        "currentProgress": current_progress,
        "targetDate": target_date.isoformat() if target_date else None,
        "targetDateType": target_date_type,
        "remainingProgress": None,
        "remainingDays": None,
        "remainingMonths": None,
        "observedVelocity": observed_velocity,
        "latestConsecutiveMonthlyVelocity": latest_consecutive_monthly_velocity(
            trajectory.get("intervals")
        ),
        "requiredVelocity": None,
        "velocityGap": None,
        "velocityRatio": None,
        "velocityRatioUndefinedReason": None,
        "scheduleState": None,
        "trajectory": trajectory.get("trajectory"),
        "recentIntervalCount": recent_interval_count,
        "observedVelocityEvidence": observed_velocity_evidence(recent_interval_count),
        "flags": {
            "largeJump": bool(flags.get("largeJump")),
            "hasGap": bool(flags.get("hasGap")),
        },
    }

    if current_progress is None:
        return record

    remaining_progress = max(0.0, 100.0 - current_progress)
    record["remainingProgress"] = _round(remaining_progress)

    if current_progress >= 100:
        record["requiredVelocity"] = 0.0
        record["velocityGap"] = None
        record["velocityRatio"] = None
        record["velocityRatioUndefinedReason"] = None
        record["scheduleState"] = "completed"
        return record

    remaining_days = None
    remaining_months = None
    if as_of_date is not None and target_date is not None:
        remaining_days = (target_date - as_of_date).days
        remaining_months = remaining_days / AVERAGE_DAYS_PER_MONTH
        record["remainingDays"] = remaining_days
        record["remainingMonths"] = _round(remaining_months)

    required_velocity = None
    if remaining_days is not None and remaining_days > 0:
        required_velocity = remaining_progress / remaining_months if remaining_months else None
    elif remaining_days is not None and remaining_days <= 0 and remaining_progress > 0:
        required_velocity = None
    record["requiredVelocity"] = _round(required_velocity)

    velocity_gap = None
    if required_velocity is not None and observed_velocity is not None:
        velocity_gap = required_velocity - observed_velocity
        record["velocityGap"] = _round(velocity_gap)

    ratio, reason = velocity_ratio_and_reason(required_velocity, observed_velocity)
    record["velocityRatio"] = ratio
    record["velocityRatioUndefinedReason"] = reason

    record["scheduleState"] = schedule_state(
        current_progress=current_progress,
        target_date_type=target_date_type,
        remaining_days=remaining_days,
        observed_velocity=observed_velocity,
        velocity_gap=record["velocityGap"],
    )
    return record


def index_by_canonical_id(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = row.get("canonicalId")
        if key:
            grouped[key].append(row)
    return grouped


def build_schedule_feasibility(
    observations: list[dict[str, Any]],
    trajectory_projects: list[dict[str, Any]],
) -> dict[str, Any]:
    observations_by_id = index_by_canonical_id(observations)
    projects = []
    unmatched_trajectory = 0
    unmatched_observations = 0

    for trajectory in trajectory_projects:
        canonical_id = trajectory.get("canonicalId")
        if not canonical_id:
            continue
        rows = observations_by_id.get(canonical_id)
        if not rows:
            unmatched_trajectory += 1
            continue
        observation = latest_observation(rows)
        if observation is None:
            unmatched_trajectory += 1
            continue
        projects.append(project_schedule_feasibility(observation, trajectory))

    matched_ids = {project["canonicalId"] for project in projects}
    for canonical_id in observations_by_id:
        if canonical_id not in matched_ids:
            unmatched_observations += 1

    projects.sort(key=lambda item: item.get("canonicalId") or "")
    counts: dict[str, int] = defaultdict(int)
    for project in projects:
        counts[project["scheduleState"] or "null"] += 1

    return {
        "units": {
            "currentProgress": "percent",
            "remainingProgress": "percentage_points",
            "remainingDays": "days",
            "remainingMonths": "months",
            "observedVelocity": "percentage_points_per_month",
            "requiredVelocity": "percentage_points_per_month",
            "velocityGap": "percentage_points_per_month",
        },
        "averageDaysPerMonth": AVERAGE_DAYS_PER_MONTH,
        "projectCount": len(projects),
        "scheduleStateCounts": dict(counts),
        "unmatchedTrajectoryProjects": unmatched_trajectory,
        "unmatchedObservationProjects": unmatched_observations,
        "projects": projects,
    }
