#!/usr/bin/env python3
"""Build schedule-feasibility features from historical + trajectory datasets.

Usage (from backend/):

    .venv/bin/python features/build_schedule_features.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT.parent
sys.path.insert(0, str(ROOT))

from schedule_feasibility import build_schedule_feasibility

EXAMPLE_KEYS = (
    ("P00001", "612786", "Kadapa Airport"),
    ("P00014", "612789", "Calicut RESA"),
    ("P00015", "400010", "Leh Airport"),
    ("P00163", "619051", "Nabinagar Stage-II"),
    ("P00280", "701745", "New Suburban Station"),
)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def format_record(record: dict) -> str:
    lines = [
        f"Project: {record.get('projectName')}",
        f"Canonical ID: {record.get('canonicalId')}",
        f"Project Code: {record.get('projectCode')}",
        f"PMGID: {record.get('pmgId')}",
        f"asOfMonth / asOfDate: {record.get('asOfMonth')} / {record.get('asOfDate')}",
        f"currentProgress: {record.get('currentProgress')}",
        f"targetDate ({record.get('targetDateType')}): {record.get('targetDate')}",
        f"remainingProgress: {record.get('remainingProgress')}",
        f"remainingDays / remainingMonths: {record.get('remainingDays')} / {record.get('remainingMonths')}",
        f"observedVelocity: {record.get('observedVelocity')}",
        f"latestConsecutiveMonthlyVelocity: {record.get('latestConsecutiveMonthlyVelocity')}",
        f"requiredVelocity: {record.get('requiredVelocity')}",
        f"velocityGap: {record.get('velocityGap')}",
        f"velocityRatio: {record.get('velocityRatio')} ({record.get('velocityRatioUndefinedReason')})",
        f"scheduleState: {record.get('scheduleState')}",
        f"trajectory: {record.get('trajectory')}",
        f"observedVelocityEvidence: {record.get('observedVelocityEvidence')}",
        f"flags: {record.get('flags')}",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--observations",
        type=Path,
        default=BACKEND / "data" / "historical" / "observations.json",
    )
    parser.add_argument(
        "--trajectory",
        type=Path,
        default=BACKEND / "data" / "features" / "progress_trajectory.json",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=BACKEND / "data" / "features" / "schedule_feasibility.json",
    )
    args = parser.parse_args()

    observations_payload = load_json(args.observations)
    trajectory_payload = load_json(args.trajectory)
    observations = observations_payload["observations"]
    trajectory_projects = trajectory_payload["projects"]

    result = build_schedule_feasibility(observations, trajectory_projects)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    print("PAIMANA schedule feasibility")
    print("=" * 40)
    print(f"Projects: {result['projectCount']}")
    print("scheduleState counts:")
    for state, count in sorted(result["scheduleStateCounts"].items(), key=lambda item: (-item[1], item[0])):
        print(f"  {state}: {count}")
    print("")

    by_id = {row["canonicalId"]: row for row in result["projects"]}
    for canonical_id, code, label in EXAMPLE_KEYS:
        print(label, f"({code} / {canonical_id})")
        print("-" * 40)
        record = by_id.get(canonical_id)
        if record is None:
            matches = [row for row in result["projects"] if row.get("projectCode") == code]
            if not matches:
                print("Not found.")
                print("")
                continue
            record = matches[0]
        print(format_record(record))
        print("")

    print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
