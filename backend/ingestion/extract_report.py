"""Extract one PAIMANA Flash Report into raw monthly observations."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

import pdfplumber

from parsers import (
    TABLE_SETTINGS,
    classify_section_header,
    is_table_header_row,
    is_total_row,
    parse_project_row,
    raw_row_payload,
    to_val,
)


def page_is_ongoing_projects(page) -> bool:
    text = page.extract_text() or ""
    return "All Ongoing Projects" in text and "PMGID" in text


def extract_report(
    pdf_path: str | Path,
    report_month: str,
    source_report: str,
) -> dict[str, Any]:
    pdf_path = Path(pdf_path)
    observations: list[dict[str, Any]] = []
    skipped = {
        "headerRows": 0,
        "sectionRows": 0,
        "totalRows": 0,
        "unparsedProjectRows": 0,
        "emptyOrShortRows": 0,
    }
    pages_used: list[int] = []
    current_ministry: Optional[str] = None
    current_sector: Optional[str] = None

    with pdfplumber.open(str(pdf_path)) as pdf:
        for index, page in enumerate(pdf.pages):
            if not page_is_ongoing_projects(page):
                continue
            page_number = index + 1
            tables = page.extract_tables(TABLE_SETTINGS)
            if not tables:
                continue
            pages_used.append(page_number)

            for table in tables:
                if not table:
                    continue
                for row in table:
                    if row is None:
                        skipped["emptyOrShortRows"] += 1
                        continue
                    if is_table_header_row(row):
                        skipped["headerRows"] += 1
                        continue
                    if is_total_row(row):
                        skipped["totalRows"] += 1
                        continue

                    serial = to_val(str(row[0]).strip()) if row[0] is not None else None
                    project_cell = to_val(row[1]) if len(row) > 1 else None
                    has_other = any(
                        to_val(str(row[i])) if i < len(row) and row[i] is not None else None
                        for i in range(2, min(len(row), 8))
                    )

                    if serial is None and project_cell and not has_other:
                        kind = classify_section_header(project_cell)
                        skipped["sectionRows"] += 1
                        if kind == "ministry":
                            current_ministry = project_cell
                            current_sector = None
                        else:
                            current_sector = project_cell
                        continue

                    parsed = parse_project_row(row)
                    if parsed is None:
                        skipped["unparsedProjectRows"] += 1
                        continue

                    parsed["ministry"] = current_ministry
                    parsed["sector"] = current_sector
                    observations.append(
                        {
                            "reportMonth": report_month,
                            "sourceReport": source_report,
                            "sourcePage": page_number,
                            "raw": raw_row_payload(row, page_number),
                            "parsed": parsed,
                        }
                    )

    return {
        "reportMonth": report_month,
        "sourceReport": source_report,
        "sourcePath": str(pdf_path),
        "pageCount": len(pages_used),
        "pages": pages_used,
        "recordCount": len(observations),
        "skipped": skipped,
        "observations": observations,
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
