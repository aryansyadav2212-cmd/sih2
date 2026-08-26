#!/usr/bin/env python3
"""Build the canonical PAIMANA historical project dataset.

Usage (from backend/):

    .venv/bin/python ingestion/build_historical_dataset.py

Skip PDF extraction if monthly JSON already exists:

    .venv/bin/python ingestion/build_historical_dataset.py --skip-extract
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT.parent
sys.path.insert(0, str(ROOT))

from extract_report import extract_report, write_json
from match_projects import match_monthly_observations
from normalize import observation_from_extracted
from validate_dataset import build_validation_report, render_text_report

REPORTS = [
    {
        "month": "2026-04",
        "label": "Apr 2026",
        "sourceReport": "486th Flash Report on Central Sector Infrastructure Projects (April 2026)",
        "pdf": BACKEND / "data" / "paimana" / "FlashReport_April2026 .pdf",
    },
    {
        "month": "2026-05",
        "label": "May 2026",
        "sourceReport": "487th Flash Report on Central Sector Infrastructure Projects (May 2026)",
        "pdf": BACKEND / "data" / "paimana" / "FlashReport_May2026.pdf",
    },
    {
        "month": "2026-06",
        "label": "Jun 2026",
        "sourceReport": "488th Flash Report on Central Sector Infrastructure Projects (June 2026)",
        "pdf": BACKEND / "data" / "paimana" / "FlashReport_June_2026.pdf",
    },
    {
        "month": "2026-07",
        "label": "Jul 2026",
        "sourceReport": "489th Flash Report on Central Sector Infrastructure Projects (July 2026)",
        "pdf": BACKEND / "data" / "paimana" / "FlashReport_July_2026.pdf",
    },
]


def month_paths(out_dir: Path, month: str) -> dict[str, Path]:
    return {
        "extracted": out_dir / "monthly" / f"{month}.extracted.json",
        "normalized": out_dir / "monthly" / f"{month}.normalized.json",
    }


def flatten_observations(projects: list[dict]) -> list[dict]:
    rows = []
    for project in projects:
        for obs in project["observations"]:
            clean = obs["clean"]
            rows.append(
                {
                    "canonicalId": project["canonicalId"],
                    "pmgId": project["pmgId"],
                    "projectCode": project["projectCode"],
                    "legacyOcmsCode": project["legacyOcmsCode"],
                    "reportMonth": clean.get("reportMonth"),
                    "projectName": clean.get("projectName"),
                    "agency": clean.get("agency"),
                    "state": clean.get("state"),
                    "ministry": clean.get("ministry"),
                    "sector": clean.get("sector"),
                    "approvalDate": clean.get("approvalDate"),
                    "startDate": clean.get("startDate"),
                    "originalDoc": clean.get("originalDoc"),
                    "revisedDoc": clean.get("revisedDoc"),
                    "originalCost": clean.get("originalCost"),
                    "revisedCost": clean.get("revisedCost"),
                    "cumulativeExpenditure": clean.get("cumulativeExpenditure"),
                    "physicalProgress": clean.get("physicalProgress"),
                    "sourceReport": clean.get("sourceReport"),
                    "sourcePage": clean.get("sourcePage"),
                    "matchMethod": obs.get("match", {}).get("method"),
                }
            )
    rows.sort(key=lambda r: (r["canonicalId"], r["reportMonth"] or ""))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=BACKEND / "data" / "historical",
    )
    parser.add_argument("--skip-extract", action="store_true")
    args = parser.parse_args()
    out_dir: Path = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    monthly_normalized: dict[str, list] = {}
    extract_summaries = []

    for report in REPORTS:
        paths = month_paths(out_dir, report["month"])
        if args.skip_extract and paths["extracted"].exists():
            extracted = json.loads(paths["extracted"].read_text(encoding="utf-8"))
            print(f"Loaded cached extract {report['month']}: {extracted['recordCount']} rows")
        else:
            if not report["pdf"].exists():
                raise SystemExit(f"Missing PDF: {report['pdf']}")
            print(f"Extracting {report['pdf'].name} ...")
            extracted = extract_report(
                report["pdf"],
                report["month"],
                report["sourceReport"],
            )
            write_json(paths["extracted"], extracted)
            print(
                f"  {extracted['recordCount']} rows from {extracted['pageCount']} pages "
                f"({extracted['pages'][0]}-{extracted['pages'][-1] if extracted['pages'] else '?'})"
            )
            print(f"  skipped: {extracted['skipped']}")

        extract_summaries.append(
            {
                "reportMonth": extracted["reportMonth"],
                "sourceReport": extracted["sourceReport"],
                "recordCount": extracted["recordCount"],
                "pageCount": extracted["pageCount"],
                "pages": extracted["pages"],
                "skipped": extracted["skipped"],
            }
        )

        normalized = [
            observation_from_extracted(record) for record in extracted["observations"]
        ]
        write_json(
            paths["normalized"],
            {
                "reportMonth": report["month"],
                "sourceReport": report["sourceReport"],
                "recordCount": len(normalized),
                "observations": normalized,
            },
        )
        monthly_normalized[report["month"]] = normalized

    ordered = [(month, monthly_normalized[month]) for month in [r["month"] for r in REPORTS]]
    print("Matching projects across months ...")
    match_result = match_monthly_observations(ordered)
    projects = match_result["projects"]
    flat = flatten_observations(projects)

    write_json(out_dir / "projects.json", {"projects": projects})
    write_json(out_dir / "observations.json", {"observations": flat})
    write_json(
        out_dir / "unmatched.json",
        {"unmatched": match_result["unmatched"], "conflicts": match_result["conflicts"]},
    )

    validation = build_validation_report(match_result, monthly_normalized)
    validation["extractSummaries"] = extract_summaries
    write_json(out_dir / "validation.json", validation)
    report_text = render_text_report(validation)
    (out_dir / "validation-report.txt").write_text(report_text, encoding="utf-8")

    print(report_text)
    print(f"\nWrote dataset to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
