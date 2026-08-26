"""Row parsers for PAIMANA Flash Report project tables.

Reuses the original extractPdf.py column layout:
  0 serial, 1 name/agency/codes, 2 state, 3 approval/start,
  4 original/revised DoC, 5 original/revised cost, 6 expenditure, 7 progress.
"""

from __future__ import annotations

import re
from typing import Any, Optional

TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
}

NULL_TOKENS = {
    "",
    "-",
    "—",
    "–",
    "na",
    "n/a",
    "n.a.",
    "n.a",
    "nil",
    "none",
    "null",
    "nan",
    ".",
    "*",
}

MINISTRY_PREFIXES = (
    "ministry of",
    "department of",
    "department for",
)


def is_null_token(value: Optional[str]) -> bool:
    if value is None:
        return True
    return value.strip().lower() in NULL_TOKENS


def to_val(s: Optional[str]) -> Optional[str]:
    if s is None:
        return None
    s = re.sub(r"\s+", " ", str(s)).strip()
    if is_null_token(s):
        return None
    return s


def extract_date_token(value: str) -> Optional[str]:
    """Return the first date-like token without converting it."""
    if not value:
        return None
    match = re.search(r"\b\d{1,2}/\d{1,2}/\d{4}\b", value)
    if match:
        return match.group(0)
    match = re.search(r"\b\d{1,2}/\d{4}\b", value)
    if match:
        return match.group(0)
    return None


def extract_numeric_token(value: str) -> Optional[str]:
    """Return the first numeric token, keeping commas/percent for the cleaner."""
    if not value:
        return None
    match = re.search(r"-?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|-?\d+(?:\.\d+)?", value)
    if not match:
        return None
    token = match.group(0)
    if is_null_token(token):
        return None
    return token


def _cell_lines(cell: Optional[str]) -> list[str]:
    if not cell:
        return []
    return [line.strip() for line in str(cell).strip().split("\n") if line.strip()]


def parse_column2(cell: str):
    empty = {
        "projectName": None,
        "agency": None,
        "projectCode": None,
        "legacyOcmsCode": None,
        "pmgId": None,
    }
    if not cell:
        return empty

    lines = _cell_lines(cell)
    code_start = None
    for i, line in enumerate(lines):
        if re.fullmatch(r"\(\d+\)", line):
            code_start = i
            break
        if re.match(r"\(\d+\)\s", line) or re.match(r"\(\d+\)\s*\(", line):
            code_start = i
            break

    if code_start is None:
        return empty

    name_agency_lines = lines[:code_start]
    code_lines = lines[code_start:]
    code_text = " ".join(code_lines)
    tokens = re.findall(r"\(([^)]*)\)", code_text)

    project_code = to_val(tokens[0]) if len(tokens) > 0 else None
    legacy_ocms = to_val(tokens[1]) if len(tokens) > 1 else None
    pmg_id = to_val(tokens[2]) if len(tokens) > 2 else None

    if project_code is None and legacy_ocms is None and pmg_id is None:
        return empty

    agency_line = name_agency_lines[-1] if name_agency_lines else ""
    agency_match = re.fullmatch(r"\((.*)\)", agency_line)
    if agency_match:
        agency = to_val(agency_match.group(1))
        project_name = to_val(" ".join(name_agency_lines[:-1]))
    else:
        agency = to_val(agency_line) if name_agency_lines else None
        project_name = to_val(" ".join(name_agency_lines[:-1] if name_agency_lines else lines))

    return {
        "projectName": project_name,
        "agency": agency,
        "projectCode": project_code,
        "legacyOcmsCode": legacy_ocms,
        "pmgId": pmg_id,
    }


def parse_column3(cell: str):
    return {"state": to_val(cell.strip()) if cell else None}


def parse_column4(cell: str):
    lines = _cell_lines(cell)
    return {
        "approvalDate": extract_date_token(lines[0]) if len(lines) > 0 else None,
        "startDate": extract_date_token(lines[1]) if len(lines) > 1 else None,
    }


def parse_column5(cell: str):
    lines = _cell_lines(cell)
    return {
        "originalCompletionDate": extract_date_token(lines[0]) if len(lines) > 0 else None,
        "revisedCompletionDate": extract_date_token(lines[1]) if len(lines) > 1 else None,
    }


def parse_column6(cell: str):
    lines = _cell_lines(cell)
    return {
        "originalCost": extract_numeric_token(lines[0]) if len(lines) > 0 else None,
        "revisedCost": extract_numeric_token(lines[1]) if len(lines) > 1 else None,
    }


def parse_column7(cell: str):
    return {"cumulativeExpenditure": extract_numeric_token(cell) if cell else None}


def parse_column8(cell: str):
    return {"physicalProgressPercent": extract_numeric_token(cell) if cell else None}


def is_table_header_row(row: Optional[list]) -> bool:
    if not row or len(row) < 2:
        return False
    first = str(row[0] or "")
    second = str(row[1] or "")
    return "Sl.No" in first or "Project Name" in second


def is_total_row(row: Optional[list]) -> bool:
    if not row:
        return False
    text = " ".join(str(c or "") for c in row[:3])
    return bool(re.match(r"^\s*total\b", text.strip(), re.IGNORECASE))


def classify_section_header(text: str) -> Optional[str]:
    cleaned = to_val(text)
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered.startswith(MINISTRY_PREFIXES):
        return "ministry"
    return "sector"


def raw_row_payload(row: list, page_number: int) -> dict[str, Any]:
    def cell(i: int) -> Optional[str]:
        if i >= len(row) or row[i] is None:
            return None
        return str(row[i])

    return {
        "sourcePage": page_number,
        "serialNumber": cell(0),
        "projectCell": cell(1),
        "stateCell": cell(2),
        "datesCell": cell(3),
        "completionCell": cell(4),
        "costCell": cell(5),
        "expenditureCell": cell(6),
        "progressCell": cell(7),
    }


def parse_project_row(row: list) -> Optional[dict[str, Any]]:
    if row is None or len(row) < 8:
        return None
    serial = to_val(str(row[0]).strip()) if row[0] is not None else None
    if serial is None:
        return None
    if not re.match(r"^\d+$", serial):
        return None

    project_data = parse_column2(row[1] if len(row) > 1 else None)
    if (
        project_data["projectCode"] is None
        and project_data["legacyOcmsCode"] is None
        and project_data["pmgId"] is None
    ):
        return None

    return {
        "serialNumber": serial,
        **project_data,
        **parse_column3(row[2] if len(row) > 2 else None),
        **parse_column4(row[3] if len(row) > 3 else None),
        **parse_column5(row[4] if len(row) > 4 else None),
        **parse_column6(row[5] if len(row) > 5 else None),
        **parse_column7(row[6] if len(row) > 6 else None),
        **parse_column8(row[7] if len(row) > 7 else None),
    }
