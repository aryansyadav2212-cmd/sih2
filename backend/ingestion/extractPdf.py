from pandas._libs import properties
from pandas._libs.tslibs import timedeltas
import pdfplumber
import pandas as pd
import re

pdf_path = "data/paimana/FlashReport_April2026 .pdf"

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

        if match:
            return match.group(0)

        return None

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

        if match:
            return match.group(0)

        return None

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

        if match:
            return match.group(0)

        return None

    original_cost = None
    revised_cost = None

    if len(lines) > 0:
        original_cost = extract_cost(lines[0])

    if len(lines) > 1:
        revised_cost = extract_cost(lines[1])

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

    # 1. Split the raw PDF cell into lines
    lines = [
        line.strip()
        for line in cell.strip().split("\n")
        if line.strip()
    ]

    # 2. Find the line where project codes begin
    code_start = None

    for i, line in enumerate(lines):
        if re.fullmatch(r"\(\d+\)", line):
            code_start = i
            break

    # 3. Separate name/agency from codes
    if code_start is None:
        # handle unexpected format
        return {
            "projectName": None,
            "agency": None,
            "projectCode": None,
            "legacyOcmsCode": None,
            "pmgId": None,
        }

    name_agency_lines = lines[:code_start]
    code_lines = lines[code_start:]

    # 4. Extract codes
    code_text = " ".join(code_lines)

    tokens = re.findall(
        r"\(([^)]*)\)",
        code_text
    )

    def to_val(s):
        s = s.strip()
        return None if not s or s == "-" else s

    project_code = to_val(tokens[0]) if len(tokens) > 0 else None
    if project_code is None:
        return None
    legacy_ocms = to_val(tokens[1]) if len(tokens) > 1 else None
    pmg_id = to_val(tokens[2]) if len(tokens) > 2 else None

    # 5. Extract agency
    agency_line = name_agency_lines[-1] if name_agency_lines else ""

    agency_match = re.fullmatch(r"\((.*)\)", agency_line)

    if agency_match:
        agency = agency_match.group(1).strip()
    else:
        agency = agency_line or None

    # 6. Everything before agency = project name
    project_name = (
        " ".join(name_agency_lines[:-1]).strip()
        or None
    )

    return {
        "projectName": project_name,
        "agency": agency,
        "projectCode": project_code,
        "legacyOcmsCode": legacy_ocms,
        "pmgId": pmg_id,
    }




##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################


with pdfplumber.open(pdf_path) as pdf:
    print("Total pages:", len(pdf.pages))

    for i in range(55 , 162):
        tables = pdf.pages[i].extract_tables()
        print(f"\n--- PAGE {i + 1} ---\n")

        if not tables:
            print("No table found on this page.")
            continue

        raw = tables[0]
        df = pd.DataFrame(raw[1:], columns=raw[0])

        if COL not in df.columns:
            print(f"Expected column not found. Available columns:\n{df.columns.tolist()}")
            continue

        parsed = df[COL].apply(parse_column2)
        parsed_df = pd.DataFrame(parsed.tolist())

        # Attach alongside the original dataframe (other columns are preserved)
        result = pd.concat(
            [df.drop(columns=[COL]), parsed_df],
            axis=1
        )

        


##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################

###########                                               ROW PARSER



def row_parser(row):

    # First determine whether this is a project row.
    project_data = parse_column2(row[1])

    if project_data["projectCode"] is None:
        return None

    state_data = parse_column3(row[2])
    date_data = parse_column4(row[3])
    completion_data = parse_column5(row[4])
    cost_data = parse_column6(row[5])
    expenditure_data = parse_column7(row[6])
    progress_data = parse_column8(row[7])

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


parsed_rows = []

for row in raw[1:]:
    result = row_parser(row)

    if result is not None:
        parsed_rows.append(result)

df = pd.DataFrame(parsed_rows)

# print(df.shape)
# print(df.head())
# print(df.isna().sum())

# print(df.dtypes)
# print(df["projectCode"].duplicated().sum())
# print(df["physicalProgressPercent"].unique())
# print(df["revisedCost"].unique()[:20])


# print(df)




##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################
##############################################################################################################################

###########                              DATA CONVERSION


UNKNOWN_VALUES = [
    "Nan",
    "nan",
    "null",
    "NULL",
    "",
    "-",
    "—",
    "N/A"
]


def clean_numeric_field(field):
    field = field.replace(UNKNOWN_VALUES, pd.NA)

    return pd.to_numeric(
        field,
        errors="coerce"
    )

def clean_date_field(field):
    field = field.replace(UNKNOWN_VALUES, pd.NA)

    return pd.to_datetime(
        field,
        format="%m/%Y",
        errors="coerce"
    )


# Integer
df["serialNumber"] = clean_numeric_field(
    df["serialNumber"]
)


# Decimal
df["originalCost"] = clean_numeric_field(
    df["originalCost"]
)

df["revisedCost"] = clean_numeric_field(
    df["revisedCost"]
)

df["cumulativeExpenditure"] = clean_numeric_field(
    df["cumulativeExpenditure"]
)

df["physicalProgressPercent"] = clean_numeric_field(
    df["physicalProgressPercent"]
)


# Dates
print(df["approvalDate"].unique())
print(df["startDate"].unique())
print(df["originalCompletionDate"].unique())
print(df["revisedCompletionDate"].unique())
df["approvalDate"] = clean_date_field(
    df["approvalDate"]
)

df["startDate"] = clean_date_field(
    df["startDate"]
)

df["originalCompletionDate"] = clean_date_field(
    df["originalCompletionDate"]
)

df["revisedCompletionDate"] = clean_date_field(
    df["revisedCompletionDate"]
)


# print(df.dtypes)
# print("\nMissing values:")
# print(df.isna().sum())
    
# print(df["physicalProgressPercent"].describe())
# print(df["originalCost"].describe())
# print(df["revisedCost"].describe())
# print(df["cumulativeExpenditure"].describe())
# print(
#     df[
#         (df["physicalProgressPercent"] < 0) |
#         (df["physicalProgressPercent"] > 100)
#     ]
# )
# print(
#     df[
#         df["startDate"] > df["originalCompletionDate"]
#     ]
# )

print(
    df[
        df["cumulativeExpenditure"] > df["revisedCost"]
    ][
        [
            "serialNumber",
            "projectName",
            "revisedCost",
            "cumulativeExpenditure"
        ]
    ]
)


print(
    df[
        df["originalCost"] > df["revisedCost"]
    ][
        [
            "serialNumber",
            "projectName",
            "originalCost",
            "revisedCost"
        ]
    ]
)