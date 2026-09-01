"""Progress trajectory features from canonical monthly observations.

Units:
  physical progress        percent (0–100)
  progressDelta            percentage points
  monthlyProgressVelocity  percentage points of physical progress per month

Does not score risk. Does not invent missing values.
"""

from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Any, Optional

STABLE_VELOCITY_CHANGE_THRESHOLD = 1.0
LARGE_JUMP_THRESHOLD = 20.0
RECENT_WINDOW = 3


def months_between(from_month: str, to_month: str) -> Optional[int]:
    try:
        from_year, from_mon = (int(part) for part in from_month.split("-")[:2])
        to_year, to_mon = (int(part) for part in to_month.split("-")[:2])
    except (TypeError, ValueError, AttributeError):
        return None
    elapsed = (to_year - from_year) * 12 + (to_mon - from_mon)
    if elapsed <= 0:
        return None
    return elapsed


def _round(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    return round(float(value), 4)


def _progress_delta(from_progress: Optional[float], to_progress: Optional[float]) -> Optional[float]:
    if from_progress is None or to_progress is None:
        return None
    return _round(to_progress - from_progress)


def interval_features(from_obs: dict[str, Any], to_obs: dict[str, Any]) -> dict[str, Any]:
    from_month = from_obs["reportMonth"]
    to_month = to_obs["reportMonth"]
    elapsed = months_between(from_month, to_month)
    from_progress = from_obs.get("physicalProgress")
    to_progress = to_obs.get("physicalProgress")
    raw_delta = _progress_delta(from_progress, to_progress)
    consecutive = elapsed == 1
    already_complete = from_progress is not None and from_progress >= 100

    velocity = None
    if consecutive and raw_delta is not None:
        if already_complete and raw_delta > 0:
            velocity = 0.0
        else:
            velocity = _round(raw_delta)

    interval_velocity = None
    if elapsed and raw_delta is not None:
        if already_complete and raw_delta > 0:
            interval_velocity = 0.0
        else:
            interval_velocity = _round(raw_delta / elapsed)

    return {
        "fromMonth": from_month,
        "toMonth": to_month,
        "elapsedMonths": elapsed,
        "isConsecutiveMonth": consecutive,
        "fromProgress": from_progress,
        "toProgress": to_progress,
        "progressDelta": raw_delta,
        "monthlyProgressVelocity": velocity,
        "intervalVelocity": interval_velocity,
        "unit": "percentage_points_per_month",
        "alreadyComplete": already_complete,
        "largeJump": raw_delta is not None and abs(raw_delta) >= LARGE_JUMP_THRESHOLD,
        "gap": elapsed is not None and elapsed > 1,
    }


def classify_trajectory(monthly_velocities: list[float]) -> str:
    if len(monthly_velocities) < 2:
        return "insufficient_data"
    changes = [
        monthly_velocities[i + 1] - monthly_velocities[i]
        for i in range(len(monthly_velocities) - 1)
    ]
    average_change = mean(changes)
    if average_change > STABLE_VELOCITY_CHANGE_THRESHOLD:
        return "accelerating"
    if average_change < -STABLE_VELOCITY_CHANGE_THRESHOLD:
        return "decelerating"
    return "stable"


def recent_average_velocity(monthly_velocities: list[float], window: int = RECENT_WINDOW) -> Optional[float]:
    if not monthly_velocities:
        return None
    recent = monthly_velocities[-window:]
    return mean(recent)


def group_observations(observations: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in observations:
        key = row.get("canonicalId") or row.get("projectCode")
        if not key or not row.get("reportMonth"):
            continue
        grouped[key].append(row)
    for key, rows in grouped.items():
        rows.sort(key=lambda item: item["reportMonth"])
    return grouped


def _dedupe_months(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], bool]:
    by_month: dict[str, dict[str, Any]] = {}
    duplicate = False
    for row in rows:
        month = row["reportMonth"]
        if month in by_month:
            duplicate = True
            continue
        by_month[month] = row
    ordered = [by_month[month] for month in sorted(by_month)]
    return ordered, duplicate


def project_trajectory(rows: list[dict[str, Any]]) -> dict[str, Any]:
    ordered, had_duplicate_month = _dedupe_months(rows)
    identity = ordered[-1] if ordered else {}
    progress_by_month = {
        row["reportMonth"]: row.get("physicalProgress") for row in ordered
    }

    intervals = []
    for i in range(len(ordered) - 1):
        intervals.append(interval_features(ordered[i], ordered[i + 1]))

    monthly_velocities = [
        item["monthlyProgressVelocity"]
        for item in intervals
        if item["monthlyProgressVelocity"] is not None
    ]
    trajectory = classify_trajectory(monthly_velocities)
    recent = recent_average_velocity(monthly_velocities)
    if recent is not None:
        recent = round(recent, 4)

    zero_progress = bool(monthly_velocities) and all(v == 0 for v in monthly_velocities)
    at_100 = any(
        progress is not None and progress >= 100 for progress in progress_by_month.values()
    )

    return {
        "canonicalId": identity.get("canonicalId"),
        "projectCode": identity.get("projectCode"),
        "pmgId": identity.get("pmgId"),
        "legacyOcmsCode": identity.get("legacyOcmsCode"),
        "projectName": identity.get("projectName"),
        "progressByMonth": progress_by_month,
        "intervals": intervals,
        "recentProgressVelocity": recent,
        "recentVelocityUnit": "percentage_points_per_month",
        "recentIntervalCount": len(monthly_velocities[-RECENT_WINDOW:]) if monthly_velocities else 0,
        "trajectory": trajectory,
        "flags": {
            "zeroProgress": zero_progress,
            "largeJump": any(item["largeJump"] for item in intervals),
            "hasGap": any(item["gap"] for item in intervals),
            "insufficientData": trajectory == "insufficient_data",
            "at100": at_100,
            "duplicateMonthDropped": had_duplicate_month,
        },
    }


def build_progress_features(observations: list[dict[str, Any]]) -> dict[str, Any]:
    grouped = group_observations(observations)
    projects = [project_trajectory(rows) for rows in grouped.values()]
    projects.sort(key=lambda item: item.get("canonicalId") or item.get("projectCode") or "")
    counts = defaultdict(int)
    for project in projects:
        counts[project["trajectory"]] += 1
    return {
        "units": {
            "physicalProgress": "percent",
            "progressDelta": "percentage_points",
            "monthlyProgressVelocity": "percentage_points_per_month",
            "recentProgressVelocity": "percentage_points_per_month",
        },
        "trajectoryRule": {
            "stableIfMeanVelocityChangeWithin": STABLE_VELOCITY_CHANGE_THRESHOLD,
            "requiresConsecutiveMonthlyDeltas": 2,
        },
        "projectCount": len(projects),
        "trajectoryCounts": dict(counts),
        "projects": projects,
    }


