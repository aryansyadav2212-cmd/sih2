import pdfplumber
import pandas as pd
import re

pdf_path = "data/paimana/FlashReport_April2026 .pdf"

TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
}

COL = "Project Name\n(Agency)\n(Project Code) (Legacy OCMS Code) (PMGID)"


def parse_column4(cell: str):
    if not cell:
        return {
            "approvalDate": None,
            "startDate": None
        }

    lines = [
        line.strip()
        for line in cell.strip().split("\n")
        if line.strip()
    ]

    def extract_date(value):
        match = re.search(r"\d{2}/\d{4}", value)
        return match.group(0) if match else None

    approval_date = extract_date(lines[0]) if len(lines) > 0 else None
    start_date = extract_date(lines[1]) if len(lines) > 1 else None

    return {
        "approvalDate": approval_date,
        "startDate": start_date
    }


def parse_column5(cell: str):
    if not cell:
        return {
            "originalCompletionDate": None,
            "revisedCompletionDate": None
        }

    lines = [
        line.strip()
        for line in cell.strip().split("\n")
        if line.strip()
    ]

    def extract_date(value):
        match = re.search(r"\d{2}/\d{4}", value)
        return match.group(0) if match else None

    originalCompletionDate = extract_date(lines[0]) if len(lines) > 0 else None
    revisedCompletionDate = extract_date(lines[1]) if len(lines) > 1 else None

    return {
        "originalCompletionDate": originalCompletionDate,
        "revisedCompletionDate": revisedCompletionDate
    }


def parse_column6(cell: str):
    if not cell:
        return {
            "originalCost": None,
            "revisedCost": None
        }

    lines = [
        line.strip()
        for line in cell.strip().split("\n")
        if line.strip()
    ]

    def extract_cost(value):
        match = re.search(r"\d+(?:\.\d+)?", value)
        return match.group(0) if match else None

    original_cost = extract_cost(lines[0]) if len(lines) > 0 else None
    revised_cost = extract_cost(lines[1]) if len(lines) > 1 else None

    return {
        "originalCost": original_cost,
        "revisedCost": revised_cost
    }


def parse_column7(cell: str):
    if not cell:
        return {
            "cumulativeExpenditure": None
        }

    match = re.search(r"\d+(?:\.\d+)?", cell)
    cumulative_expenditure = match.group(0) if match else None

    return {
        "cumulativeExpenditure": cumulative_expenditure
    }


def parse_column8(cell: str):
    if not cell:
        return {
            "physicalProgressPercent": None
        }

    match = re.search(r"\d+(?:\.\d+)?", cell)
    physical_progress = match.group(0) if match else None

    return {
        "physicalProgressPercent": physical_progress
    }


def parse_column3(cell: str):
    if not cell:
        return {
            "state": None
        }

    return {
        "state": cell.strip()
    }


def parse_column2(cell: str):
    if not cell:
        return {
            "projectName": None,
            "agency": None,
            "projectCode": None,
            "legacyOcmsCode": None,
            "pmgId": None,
        }

    lines = [
        line.strip()
        for line in cell.strip().split("\n")
        if line.strip()
    ]

    code_start = None
    for i, line in enumerate(lines):
        if re.fullmatch(r"\(\d+\)", line):
            code_start = i
            break

    if code_start is None:
        return {
            "projectName": None,
            "agency": None,
            "projectCode": None,
            "legacyOcmsCode": None,
            "pmgId": None,
        }

    name_agency_lines = lines[:code_start]
    code_lines = lines[code_start:]

    code_text = " ".join(code_lines)
    tokens = re.findall(r"\(([^)]*)\)", code_text)

    def to_val(s):
        s = s.strip()
        return None if not s or s == "-" else s

    project_code = to_val(tokens[0]) if len(tokens) > 0 else None
    if project_code is None:
        return {
            "projectName": None,
            "agency": None,
            "projectCode": None,
            "legacyOcmsCode": None,
            "pmgId": None,
        }
        
    legacy_ocms = to_val(tokens[1]) if len(tokens) > 1 else None
    pmg_id = to_val(tokens[2]) if len(tokens) > 2 else None

    agency_line = name_agency_lines[-1] if name_agency_lines else ""
    agency_match = re.fullmatch(r"\((.*)\)", agency_line)

    if agency_match:
        agency = agency_match.group(1).strip()
    else:
        agency = agency_line or None

    project_name = " ".join(name_agency_lines[:-1]).strip() or None

    return {
        "projectName": project_name,
        "agency": agency,
        "projectCode": project_code,
        "legacyOcmsCode": legacy_ocms,
        "pmgId": pmg_id,
    }


def row_parser(row):
    # Check if row has enough columns
    if row is None or len(row) < 8:
        return None
    
    # Skip if first column is None or empty (likely not a data row)
    if row[0] is None or str(row[0]).strip() == "":
        return None

    # Parse project data (column 2 in 0-indexed row)
    project_data = parse_column2(row[1] if len(row) > 1 else None)
    
    if project_data is None or project_data["projectCode"] is None:
        return None

    state_data = parse_column3(row[2] if len(row) > 2 else None)
    date_data = parse_column4(row[3] if len(row) > 3 else None)
    completion_data = parse_column5(row[4] if len(row) > 4 else None)
    cost_data = parse_column6(row[5] if len(row) > 5 else None)
    expenditure_data = parse_column7(row[6] if len(row) > 6 else None)
    progress_data = parse_column8(row[7] if len(row) > 7 else None)

    return {
        "serialNumber": row[0],
        **project_data,
        **state_data,
        **date_data,
        **completion_data,
        **cost_data,
        **expenditure_data,
        **progress_data,
    }


def clean_numeric_field(field):
    if field is None:
        return pd.NA
    
    # Handle string replacements
    if isinstance(field, str):
        unknown_values = ["Nan", "nan", "null", "NULL", "", "-", "—", "N/A"]
        if field.strip() in unknown_values:
            return pd.NA
    
    return pd.to_numeric(field, errors="coerce")


def clean_date_field(field):
    if field is None:
        return pd.NA
    
    # Handle string replacements
    if isinstance(field, str):
        unknown_values = ["Nan", "nan", "null", "NULL", "", "-", "—", "N/A"]
        if field.strip() in unknown_values:
            return pd.NA
    
    return pd.to_datetime(field, format="%m/%Y", errors="coerce")


if __name__ == "__main__":
    print(
        "April-only extraction is superseded by the historical pipeline.\n"
        "From backend/, run:\n"
        "  .venv/bin/python ingestion/build_historical_dataset.py"
    )