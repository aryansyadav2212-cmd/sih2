"""
PAIMANA data validation layer.

Validates observations against domain rules without modifying raw data.
Produces quality metadata: validity (valid/invalid), anomaly (none/suspicious),
evidence (sufficient/insufficient).

All observations are preserved. Validation results are attached as metadata.
"""

from __future__ import annotations

from typing import Any, Optional
from datetime import datetime


def _to_float(value: Any) -> Optional[float]:
    """Safely convert value to float."""
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_date(value: Any) -> Optional[str]:
    """
    Parse and validate ISO date string.
    Accepts: YYYY-MM-DD or partial YYYY-MM.
    Returns: ISO date string (YYYY-MM-DD) or None if invalid.
    """
    if value is None:
        return None
    
    value_str = str(value).strip() if value else None
    if not value_str:
        return None
    
    # Try full ISO date
    if len(value_str) >= 10:
        try:
            parsed = datetime.strptime(value_str[:10], "%Y-%m-%d")
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            pass
    
    # Try YYYY-MM (treat as first day of month)
    if len(value_str) >= 7:
        try:
            parsed = datetime.strptime(value_str[:7], "%Y-%m")
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            pass
    
    return None


def _compare_dates(date_a: Optional[str], date_b: Optional[str]) -> Optional[int]:
    """
    Compare two ISO dates.
    Returns: -1 if date_a < date_b, 0 if equal, 1 if date_a > date_b, None if either is None.
    """
    if not date_a or not date_b:
        return None
    
    try:
        d_a = datetime.strptime(date_a[:10], "%Y-%m-%d")
        d_b = datetime.strptime(date_b[:10], "%Y-%m-%d")
        
        if d_a < d_b:
            return -1
        elif d_a > d_b:
            return 1
        return 0
    except (ValueError, TypeError):
        return None


def validate_observation(
    observation: dict[str, Any],
    previous_observation: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Validate a single observation against all rules.

    The validation layer preserves the original observation and records three
    independent dimensions: validity, anomaly, and evidence.
    """

    issues: list[str] = []
    metadata: dict[str, Any] = {}
    invalid = False
    suspicious = False
    evidence_levels: dict[str, str] = {}

    def add_issue(code: str, detail: Optional[dict[str, Any]] = None) -> None:
        if code not in issues:
            issues.append(code)
        if detail is not None:
            metadata.setdefault(code, detail)

    # ================================================================
    # RULE 1: Basic numeric validity
    # ================================================================

    # Physical progress
    progress = _to_float(observation.get("physicalProgress"))

    if progress is None:
        evidence_levels["progress"] = "insufficient"
    else:
        evidence_levels["progress"] = "sufficient"

        if progress < 0 or progress > 100:
            invalid = True
            add_issue(
                "physical_progress_out_of_range",
                {
                    "value": progress,
                    "valid_range": [0, 100],
                },
            )

    # Costs
    orig_cost = _to_float(observation.get("originalCost"))
    rev_cost = _to_float(observation.get("revisedCost"))
    cum_expenditure = _to_float(observation.get("cumulativeExpenditure"))

    if orig_cost is None:
        evidence_levels["original_cost"] = "insufficient"
    else:
        evidence_levels["original_cost"] = "sufficient"
        if orig_cost < 0:
            invalid = True
            add_issue("negative_original_cost", {"value": orig_cost})

    if rev_cost is None:
        evidence_levels["revised_cost"] = "insufficient"
    else:
        evidence_levels["revised_cost"] = "sufficient"
        if rev_cost < 0:
            invalid = True
            add_issue("negative_revised_cost", {"value": rev_cost})

    if cum_expenditure is None:
        evidence_levels["cumulative_expenditure"] = "insufficient"
    else:
        evidence_levels["cumulative_expenditure"] = "sufficient"
        if cum_expenditure < 0:
            invalid = True
            add_issue("negative_cumulative_expenditure", {"value": cum_expenditure})

    # ================================================================
    # RULE 2: Cost consistency
    # ================================================================

    if orig_cost is not None and orig_cost > 0 and rev_cost is not None:
        cost_ratio = rev_cost / orig_cost
        metadata["cost_ratio"] = cost_ratio

        if cost_ratio < 0.10:
            suspicious = True
            add_issue("extreme_cost_reduction", {"value": cost_ratio})
        elif cost_ratio > 3.00:
            suspicious = True
            add_issue("extreme_cost_increase", {"value": cost_ratio})

    # ================================================================
    # RULE 3: Financial vs physical progress
    # ================================================================

    if rev_cost is not None and rev_cost > 0 and cum_expenditure is not None:
        exp_ratio = cum_expenditure / rev_cost
        metadata["expenditure_ratio"] = exp_ratio

        if exp_ratio >= 0.30 and progress is not None and progress <= 5:
            suspicious = True
            add_issue(
                "high_expenditure_low_progress",
                {"expenditure_ratio": exp_ratio, "progress": progress},
            )

    # ================================================================
    # RULE 9: Expenditure exceeding revised cost
    # ================================================================

    if rev_cost is not None and rev_cost > 0 and cum_expenditure is not None:
        if cum_expenditure > rev_cost:
            suspicious = True
            add_issue(
                "expenditure_exceeds_revised_cost",
                {
                    "cumulative_expenditure": cum_expenditure,
                    "revised_cost": rev_cost,
                    "ratio": cum_expenditure / rev_cost,
                },
            )

    # ================================================================
    # RULE 4: Physical progress regression
    # ================================================================

    if previous_observation is not None:
        prev_progress = _to_float(previous_observation.get("physicalProgress"))
        prev_month = previous_observation.get("reportMonth") or previous_observation.get("observationMonth")
        cur_month = observation.get("reportMonth") or observation.get("observationMonth")

        month_gap = None
        if prev_month and cur_month:
            try:
                prev_dt = datetime.strptime(str(prev_month)[:7], "%Y-%m")
                cur_dt = datetime.strptime(str(cur_month)[:7], "%Y-%m")
                month_gap = (cur_dt.year - prev_dt.year) * 12 + (cur_dt.month - prev_dt.month)
            except ValueError:
                month_gap = None

        if progress is not None and prev_progress is not None and month_gap is not None and month_gap <= 1:
            if progress < prev_progress:
                suspicious = True
                add_issue(
                    "physical_progress_regression",
                    {
                        "previous": prev_progress,
                        "current": progress,
                        "delta": progress - prev_progress,
                    },
                )
        elif month_gap is not None and month_gap > 1:
            suspicious = True
            add_issue(
                "temporal_gap_detected",
                {"previous_month": prev_month, "current_month": cur_month, "gap_months": month_gap},
            )
            evidence_levels["temporal"] = "insufficient"

    # ================================================================
    # RULE 5: Date consistency
    # ================================================================

    start_date = _parse_date(observation.get("startDate"))
    orig_completion = _parse_date(observation.get("originalDoc"))
    rev_completion = _parse_date(observation.get("revisedDoc"))
    approval_date = _parse_date(observation.get("approvalDate"))

    # Hard invalid: startDate > originalDoc
    if start_date and orig_completion:
        cmp = _compare_dates(start_date, orig_completion)
        if cmp == 1:
            invalid = True
            add_issue(
                "start_after_original_completion",
                {"startDate": start_date, "originalDoc": orig_completion},
            )

    # Hard invalid: startDate > revisedDoc
    if start_date and rev_completion:
        cmp = _compare_dates(start_date, rev_completion)
        if cmp == 1:
            invalid = True
            add_issue(
                "start_after_revised_completion",
                {"startDate": start_date, "revisedDoc": rev_completion},
            )

    # Suspicious (not invalid): approvalDate > startDate
    if approval_date and start_date:
        cmp = _compare_dates(approval_date, start_date)
        if cmp == 1:
            suspicious = True
            add_issue(
                "approval_after_start",
                {"approvalDate": approval_date, "startDate": start_date},
            )

    # ================================================================
    # RULE 6: Temporal continuity (gap detection)
    # ================================================================

    # Missing-month gaps are not invalid. They are a temporal evidence issue.
    # The trajectory layer decides whether the gap is usable for velocity.
    report_month = observation.get("reportMonth") or observation.get("observationMonth")
    if report_month:
        metadata["report_month"] = report_month
    else:
        evidence_levels["temporal"] = "insufficient"

    if previous_observation is None:
        evidence_levels["project_history"] = "insufficient"

    # ================================================================
    # RULE 7: Single-observation projects
    # ================================================================

    # This is handled at the project level (in trajectory construction).
    # Single observations are valid; trajectory evidence will be marked insufficient.

    # ================================================================
    # RULE 8: Derived-ratio reliability
    # ================================================================

    # Existing guards in feature engineering are preserved.
    # No changes needed here; validation layer only reports metadata.

    # ================================================================
    # Finalize validity and anomaly
    # ================================================================

    validity = "invalid" if invalid else "valid"
    anomaly = "suspicious" if suspicious else "none"

    # Compute overall evidence conservatively, but only for relevant fields.
    # Single-observation projects are valid but evidence is insufficient.
    overall_evidence = "sufficient"
    if previous_observation is None:
        overall_evidence = "insufficient"
    elif any(v == "insufficient" for v in evidence_levels.values() if v == "insufficient"):
        overall_evidence = "insufficient"

    if previous_observation is None and invalid:
        overall_evidence = "insufficient"

    return {
        "validity": validity,
        "anomaly": anomaly,
        "evidence": overall_evidence,
        "evidence_by_aspect": evidence_levels,
        "issues": issues,
        "metadata": metadata,
        "observation_id": {
            "projectCode": observation.get("projectCode"),
            "canonicalId": observation.get("canonicalId"),
            "reportMonth": observation.get("reportMonth"),
        },
    }


def validate_observations(
    observations: list[dict[str, Any]],
    group_by_project: bool = True,
) -> list[dict[str, Any]]:
    """
    Validate a list of observations.

    Args:
        observations: List of raw observations
        group_by_project: If True, group by project to enable regression detection

    Returns:
        List of validation results (one per observation, in original order)
    """

    if not group_by_project:
        # Validate independently
        return [validate_observation(obs) for obs in observations]

    # Group by project for context
    from collections import defaultdict

    projects = defaultdict(list)
    for obs in observations:
        key = obs.get("canonicalId") or obs.get("projectCode")
        if key:
            projects[key].append(obs)

    # Sort each project chronologically
    for key in projects:
        projects[key].sort(key=lambda x: x.get("reportMonth", ""))

    # Validate with regression context
    results = []
    for obs_idx, obs in enumerate(observations):
        key = obs.get("canonicalId") or obs.get("projectCode")
        
        prev_obs = None
        if key and key in projects:
            project_obs = projects[key]
            obs_pos = next(
                (i for i, o in enumerate(project_obs) if o is obs),
                -1,
            )
            if obs_pos > 0:
                prev_obs = project_obs[obs_pos - 1]

        result = validate_observation(obs, prev_obs)
        results.append(result)

    return results


def summarize_validation(
    validation_results: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Summarize validation results across multiple observations.

    Returns:
        Dict with counts and distributions of validity/anomaly/evidence.
    """

    total = len(validation_results)
    valid_count = sum(1 for r in validation_results if r["validity"] == "valid")
    invalid_count = sum(1 for r in validation_results if r["validity"] == "invalid")
    
    suspicious_count = sum(1 for r in validation_results if r["anomaly"] == "suspicious")
    sufficient_count = sum(1 for r in validation_results if r["evidence"] == "sufficient")
    
    # Count by issue
    issues_counter = {}
    for result in validation_results:
        for issue in result["issues"]:
            issues_counter[issue] = issues_counter.get(issue, 0) + 1

    return {
        "total_observations": total,
        "valid": valid_count,
        "invalid": invalid_count,
        "suspicious": suspicious_count,
        "sufficient_evidence": sufficient_count,
        "insufficient_evidence": total - sufficient_count,
        "issues_distribution": issues_counter,
    }
