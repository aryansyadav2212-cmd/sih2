"""Validation statistics and longitudinal sample printer."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from match_projects import MONTH_ORDER, coverage_sets

IMPORTANT_FIELDS = [
    "pmgId",
    "projectCode",
    "legacyOcmsCode",
    "projectName",
    "agency",
    "state",
    "ministry",
    "sector",
    "approvalDate",
    "startDate",
    "originalDoc",
    "revisedDoc",
    "originalCost",
    "revisedCost",
    "cumulativeExpenditure",
    "physicalProgress",
]


def _month_label(month: str) -> str:
    labels = {
        "2026-04": "April",
        "2026-05": "May",
        "2026-06": "June",
        "2026-07": "July",
    }
    return labels.get(month, month)


def missing_value_stats(projects: list[dict[str, Any]]) -> dict[str, Any]:
    totals = Counter()
    missing = Counter()
    missing_by_month = {month: Counter() for month in MONTH_ORDER}

    observation_count = 0
    for project in projects:
        for obs in project["observations"]:
            clean = obs["clean"]
            observation_count += 1
            month = clean.get("reportMonth")
            for field in IMPORTANT_FIELDS:
                totals[field] += 1
                if clean.get(field) is None:
                    missing[field] += 1
                    if month in missing_by_month:
                        missing_by_month[month][field] += 1

    return {
        "observationCount": observation_count,
        "fields": {
            field: {
                "missing": missing[field],
                "total": totals[field],
                "missingPercent": round(100.0 * missing[field] / totals[field], 2)
                if totals[field]
                else None,
            }
            for field in IMPORTANT_FIELDS
        },
        "byMonth": {
            month: dict(counts) for month, counts in missing_by_month.items() if counts
        },
    }


def duplicate_identifier_stats(
    monthly_observations: dict[str, list[dict[str, Any]]]
) -> dict[str, Any]:
    report = {}
    for month, observations in monthly_observations.items():
        buckets = {
            "pmgId": defaultdict(list),
            "projectCode": defaultdict(list),
            "legacyOcmsCode": defaultdict(list),
        }
        for obs in observations:
            clean = obs["clean"]
            for field in buckets:
                value = clean.get(field)
                if value:
                    buckets[field][value].append(clean.get("serialNumber"))
        report[month] = {
            field: [
                {"value": value, "serialNumbers": serials}
                for value, serials in items.items()
                if len(serials) > 1
            ]
            for field, items in buckets.items()
        }
    return report


def pick_sample_projects(projects: list[dict[str, Any]], n: int = 10) -> list[dict[str, Any]]:
    scored = []
    for project in projects:
        months = project["monthsPresent"]
        if len(months) < 2:
            continue
        month_counts = {}
        for obs in project["observations"]:
            month = obs["clean"].get("reportMonth")
            month_counts[month] = month_counts.get(month, 0) + 1
        if any(count > 1 for count in month_counts.values()):
            continue
        progress = [
            obs["clean"].get("physicalProgress")
            for obs in project["observations"]
            if obs["clean"].get("physicalProgress") is not None
        ]
        progress_delta = (max(progress) - min(progress)) if len(progress) >= 2 else 0
        scored.append((len(months), progress_delta, project))
    scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [project for _, _, project in scored[:n]]


def format_sample(project: dict[str, Any]) -> str:
    lines = [
        f"Project: {project.get('projectName')}",
        f"Canonical ID: {project['canonicalId']}",
        f"PMGID: {project.get('pmgId')}",
        f"Project Code: {project.get('projectCode')}",
        f"Legacy OCMS Code: {project.get('legacyOcmsCode')}",
        "",
    ]
    for obs in project["observations"]:
        clean = obs["clean"]
        lines.append(f"{_month_label(clean.get('reportMonth'))}:")
        lines.append(f"  Progress: {clean.get('physicalProgress')}")
        lines.append(f"  Expenditure: {clean.get('cumulativeExpenditure')}")
        lines.append(f"  Original cost: {clean.get('originalCost')}")
        lines.append(f"  Revised cost: {clean.get('revisedCost')}")
        lines.append(f"  Revised DoC: {clean.get('revisedDoc')}")
        lines.append(f"  Source: {clean.get('sourceReport')} p.{clean.get('sourcePage')}")
        lines.append("")
    return "\n".join(lines)


def build_validation_report(
    match_result: dict[str, Any],
    monthly_observations: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    projects = match_result["projects"]
    coverage = coverage_sets(projects)
    missing = missing_value_stats(projects)
    duplicates = duplicate_identifier_stats(monthly_observations)
    samples = pick_sample_projects(projects, 10)

    conflict_types = {}
    for conflict in match_result["conflicts"]:
        conflict_types[conflict["type"]] = conflict_types.get(conflict["type"], 0) + 1
    unmatched_reasons = {}
    for item in match_result["unmatched"]:
        unmatched_reasons[item["reason"]] = unmatched_reasons.get(item["reason"], 0) + 1

    return {
        "totalProjects": len(projects),
        "totalObservations": missing["observationCount"],
        "projectsPerMonth": match_result["monthCounts"],
        "matchedAcrossAllMonths": coverage["matchedAcrossAllMonths"],
        "projectsOnlyAppearingInOneMonth": coverage["onlyOneMonth"],
        "firstSeenByMonth": coverage["firstSeenByMonth"],
        "missingFromALaterReportCount": len(coverage["missingFromALaterReport"]),
        "unmatchedCount": len(match_result["unmatched"]),
        "unmatchedReasons": unmatched_reasons,
        "conflictCount": len(match_result["conflicts"]),
        "conflictTypes": conflict_types,
        "duplicateMatchCount": len(match_result["duplicates"]),
        "identifierChangeCount": len(match_result["identifierChanges"]),
        "duplicateIdentifiersWithinMonth": {
            month: {field: len(items) for field, items in fields.items()}
            for month, fields in duplicates.items()
        },
        "missingValues": missing,
        "coverage": {
            "byMonth": coverage["byMonth"],
            "missingFromALaterReport": coverage["missingFromALaterReport"][:50],
        },
        "conflicts": match_result["conflicts"][:50],
        "unmatched": match_result["unmatched"][:50],
        "identifierChanges": match_result["identifierChanges"][:50],
        "samples": [
            {
                "canonicalId": p["canonicalId"],
                "pmgId": p["pmgId"],
                "projectCode": p["projectCode"],
                "legacyOcmsCode": p["legacyOcmsCode"],
                "projectName": p["projectName"],
                "monthsPresent": p["monthsPresent"],
                "text": format_sample(p),
            }
            for p in samples
        ],
    }


def render_text_report(report: dict[str, Any]) -> str:
    lines = [
        "PAIMANA historical dataset validation",
        "=" * 40,
        f"Canonical projects: {report['totalProjects']}",
        f"Total observations: {report['totalObservations']}",
        "",
        "Projects per extracted month:",
    ]
    for month, count in report["projectsPerMonth"].items():
        lines.append(f"  {month}: {count}")
    lines.extend(
        [
            "",
            f"Matched across all months: {report['matchedAcrossAllMonths']}",
            f"Projects only in one month: {report['projectsOnlyAppearingInOneMonth']}",
            f"First seen by month: {report['firstSeenByMonth']}",
            f"Missing from a later report: {report['missingFromALaterReportCount']}",
            f"Unmatched records: {report['unmatchedCount']} {report.get('unmatchedReasons')}",
            f"Conflicts: {report['conflictCount']} {report.get('conflictTypes')}",
            f"Same-month duplicate matches: {report['duplicateMatchCount']}",
            f"Identifier changes: {report['identifierChangeCount']}",
            "",
            "Duplicate identifiers within a month:",
            str(report["duplicateIdentifiersWithinMonth"]),
            "",
            "Missing values by field:",
        ]
    )
    for field, stats in report["missingValues"]["fields"].items():
        lines.append(
            f"  {field}: {stats['missing']}/{stats['total']} ({stats['missingPercent']}%)"
        )
    lines.extend(["", "Longitudinal samples", "-" * 40])
    for sample in report["samples"]:
        lines.append(sample["text"])
        lines.append("-" * 40)
    return "\n".join(lines)
