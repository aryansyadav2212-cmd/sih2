#!/usr/bin/env python3
"""Derive progress trajectory features from the canonical historical dataset.

Usage (from backend/):

    .venv/bin/python features/build_progress_features.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT.parent
sys.path.insert(0, str(ROOT))

from progress_trajectory import build_progress_features

KNOWN_EXAMPLES = ("612786",)


def load_observations(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        return payload["observations"]
    return payload


def format_project(project: dict) -> str:
    lines = [
        f"Project: {project.get('projectName')}",
        f"Canonical ID: {project.get('canonicalId')}",
        f"PMGID: {project.get('pmgId')}",
        f"Project Code: {project.get('projectCode')}",
        "Progress by month:",
    ]
    for month, progress in sorted((project.get("progressByMonth") or {}).items()):
        lines.append(f"  {month}: {progress}")
    lines.append("Intervals:")
    for interval in project.get("intervals") or []:
        monthly = interval["monthlyProgressVelocity"]
        monthly_text = (
            f"{monthly:+.4g} pp/month"
            if monthly is not None
            else "unavailable (not a consecutive month)"
        )
        lines.append(
            f"  {interval['fromMonth']} → {interval['toMonth']} "
            f"(elapsed {interval['elapsedMonths']} month(s)): "
            f"delta={interval['progressDelta']}, monthly velocity={monthly_text}"
        )
    recent = project.get("recentProgressVelocity")
    recent_text = f"{recent:+.4g} percentage points/month" if recent is not None else "null"
    lines.append(f"recentProgressVelocity: {recent_text}")
    lines.append(f"trajectory: {project.get('trajectory')}")
    lines.append(f"flags: {project.get('flags')}")
    return "\n".join(lines)


def pick_examples(projects: list[dict]) -> dict[str, list[dict]]:
    by_code = {p.get("projectCode"): p for p in projects if p.get("projectCode")}
    known = [by_code[code] for code in KNOWN_EXAMPLES if code in by_code]

    def first(predicate, limit=3):
        selected = []
        for project in projects:
            if predicate(project):
                selected.append(project)
            if len(selected) >= limit:
                break
        return selected

    four_months = lambda p: len(p.get("progressByMonth") or {}) >= 4

    return {
        "kadapa": known,
        "accelerating": first(lambda p: p["trajectory"] == "accelerating" and four_months(p)),
        "decelerating": first(lambda p: p["trajectory"] == "decelerating" and four_months(p)),
        "zero_progress": first(lambda p: p["flags"]["zeroProgress"] and four_months(p)),
        "large_jumps": first(lambda p: p["flags"]["largeJump"] and four_months(p)),
        "missing_observations": first(lambda p: p["flags"]["hasGap"] or len(p.get("progressByMonth") or {}) == 3),
        "insufficient_data": first(lambda p: p["flags"]["insufficientData"]),
        "at_100": first(lambda p: p["flags"]["at100"] and four_months(p), limit=2),
    }


def render_report(feature_set: dict, examples: dict[str, list[dict]]) -> str:
    lines = [
        "PAIMANA progress trajectory features",
        "=" * 40,
        f"Projects: {feature_set['projectCount']}",
        f"Trajectory counts: {feature_set['trajectoryCounts']}",
        f"Units: {feature_set['units']}",
        "",
    ]
    labels = {
        "kadapa": "Known example — Kadapa Airport (612786)",
        "accelerating": "Accelerating",
        "decelerating": "Decelerating",
        "zero_progress": "Zero progress",
        "large_jumps": "Large progress jumps",
        "missing_observations": "Missing / gapped observations",
        "insufficient_data": "Insufficient data",
        "at_100": "Reached 100% progress",
    }
    for key, title in labels.items():
        lines.append(title)
        lines.append("-" * 40)
        items = examples.get(key) or []
        if not items:
            lines.append("No example found.")
            lines.append("")
            continue
        for project in items:
            lines.append(format_project(project))
            lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--observations",
        type=Path,
        default=BACKEND / "data" / "historical" / "observations.json",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=BACKEND / "data" / "features",
    )
    args = parser.parse_args()

    observations = load_observations(args.observations)
    feature_set = build_progress_features(observations)
    examples = pick_examples(feature_set["projects"])

    args.out_dir.mkdir(parents=True, exist_ok=True)
    compact = {
        **feature_set,
        "projects": [
            {
                "canonicalId": p["canonicalId"],
                "projectCode": p["projectCode"],
                "pmgId": p["pmgId"],
                "projectName": p["projectName"],
                "progressByMonth": p["progressByMonth"],
                "intervals": p["intervals"],
                "recentProgressVelocity": p["recentProgressVelocity"],
                "recentVelocityUnit": p["recentVelocityUnit"],
                "recentIntervalCount": p["recentIntervalCount"],
                "trajectory": p["trajectory"],
                "flags": p["flags"],
            }
            for p in feature_set["projects"]
        ],
    }
    (args.out_dir / "progress_trajectory.json").write_text(
        json.dumps(compact, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    report = render_report(feature_set, examples)
    (args.out_dir / "progress_trajectory-examples.txt").write_text(report, encoding="utf-8")
    print(report)
    print(f"\nWrote {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
