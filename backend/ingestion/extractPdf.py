# from pandas._libs import properties
# from pandas._libs.tslibs import timedeltas
# import pdfplumber
# import pandas as pd
# import re

# pdf_path = "data/paimana/FlashReport_April2026 .pdf"
# TABLE_SETTINGS = {
#     "vertical_strategy": "lines",
#     "horizontal_strategy": "lines",
# }

# COL = "Project Name\n(Agency)\n(Project Code) (Legacy OCMS Code) (PMGID)"


# def parse_column4(cell: str):

#     if not cell:
#         return {
#             "approvalDate": None,
#             "startDate": None
#         }

#     lines = [
#         line.strip()
#         for line in cell.strip().split("\n")
#         if line.strip()
#     ]

#     def extract_date(value):
#         match = re.search(r"\d{2}/\d{4}", value)

#         if match:
#             return match.group(0)

#         return None

#     approval_date = extract_date(lines[0]) if len(lines) > 0 else None
#     start_date = extract_date(lines[1]) if len(lines) > 1 else None

#     return {
#         "approvalDate": approval_date,
#         "startDate": start_date
#     }




# def parse_column5(cell: str):

#     if not cell:
#         return {
#             "originalCompletionDate": None,
#             "revisedCompletionDate": None
#         }

#     lines = [
#         line.strip()
#         for line in cell.strip().split("\n")
#         if line.strip()
#     ]

#     def extract_date(value):
#         match = re.search(r"\d{2}/\d{4}", value)

#         if match:
#             return match.group(0)

#         return None

#     originalCompletionDate = extract_date(lines[0]) if len(lines) > 0 else None
#     revisedCompletionDate = extract_date(lines[1]) if len(lines) > 1 else None

#     return {
#         "originalCompletionDate": originalCompletionDate,
#         "revisedCompletionDate": revisedCompletionDate
#     }


# def parse_column6(cell: str):
#     if not cell:
#         return {
#             "originalCost": None,
#             "revisedCost": None
#         }

#     lines = [
#         line.strip()
#         for line in cell.strip().split("\n")
#         if line.strip()
#     ]

#     def extract_cost(value):
#         match = re.search(r"\d+(?:\.\d+)?", value)

#         if match:
#             return match.group(0)

#         return None

#     original_cost = None
#     revised_cost = None

#     if len(lines) > 0:
#         original_cost = extract_cost(lines[0])

#     if len(lines) > 1:
#         revised_cost = extract_cost(lines[1])

#     return {
#         "originalCost": original_cost,
#         "revisedCost": revised_cost
#     }


# def parse_column7(cell: str):
#     if not cell:
#         return {
#             "cumulativeExpenditure": None
#         }

#     match = re.search(r"\d+(?:\.\d+)?", cell)

#     cumulative_expenditure = match.group(0) if match else None

#     return {
#         "cumulativeExpenditure": cumulative_expenditure
#     }
    
# def parse_column8(cell: str):
#     if not cell:
#         return {
#             "physicalProgressPercent": None
#         }

#     match = re.search(r"\d+(?:\.\d+)?", cell)

#     physical_progress = match.group(0) if match else None

#     return {
#         "physicalProgressPercent": physical_progress
#     }



# def parse_column3(cell: str):
#     if not cell:
#         return {
#             "state": None
#         }

#     return {
#         "state": cell.strip()
#     }




# def parse_column2(cell: str):

#     if not cell:
#         return {
#             "projectName": None,
#             "agency": None,
#             "projectCode": None,
#             "legacyOcmsCode": None,
#             "pmgId": None,
#         }

#     # 1. Split the raw PDF cell into lines
#     lines = [
#         line.strip()
#         for line in cell.strip().split("\n")
#         if line.strip()
#     ]

#     # 2. Find the line where project codes begin
#     code_start = None

#     for i, line in enumerate(lines):
#         if re.fullmatch(r"\(\d+\)", line):
#             code_start = i
#             break

#     # 3. Separate name/agency from codes
#     if code_start is None:
#         # handle unexpected format
#         return {
#             "projectName": None,
#             "agency": None,
#             "projectCode": None,
#             "legacyOcmsCode": None,
#             "pmgId": None,
#         }

#     name_agency_lines = lines[:code_start]
#     code_lines = lines[code_start:]

#     # 4. Extract codes
#     code_text = " ".join(code_lines)

#     tokens = re.findall(
#         r"\(([^)]*)\)",
#         code_text
#     )

#     def to_val(s):
#         s = s.strip()
#         return None if not s or s == "-" else s

#     project_code = to_val(tokens[0]) if len(tokens) > 0 else None
#     if project_code is None:
#         return None
#     legacy_ocms = to_val(tokens[1]) if len(tokens) > 1 else None
#     pmg_id = to_val(tokens[2]) if len(tokens) > 2 else None

#     # 5. Extract agency
#     agency_line = name_agency_lines[-1] if name_agency_lines else ""

#     agency_match = re.fullmatch(r"\((.*)\)", agency_line)

#     if agency_match:
#         agency = agency_match.group(1).strip()
#     else:
#         agency = agency_line or None

#     # 6. Everything before agency = project name
#     project_name = (
#         " ".join(name_agency_lines[:-1]).strip()
#         or None
#     )

#     return {
#         "projectName": project_name,
#         "agency": agency,
#         "projectCode": project_code,
#         "legacyOcmsCode": legacy_ocms,
#         "pmgId": pmg_id,
#     }




# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################


# # with pdfplumber.open(pdf_path) as pdf:
# #     print("Total pages:", len(pdf.pages))

# #     for i in range(55 , 162):
# #         tables = pdf.pages[i].extract_tables()
# #         print(f"\n--- PAGE {i + 1} ---\n")

# #         if not tables:
# #             print("No table found on this page.")
# #             continue

# #         raw = tables[0]
# #         df = pd.DataFrame(raw[1:], columns=raw[0])

# #         if COL not in df.columns:
# #             print(f"Expected column not found. Available columns:\n{df.columns.tolist()}")
# #             continue

# #         parsed = df[COL].apply(parse_column2)
# #         parsed_df = pd.DataFrame(parsed.tolist())

# #         # Attach alongside the original dataframe (other columns are preserved)
# #         result = pd.concat(
# #             [df.drop(columns=[COL]), parsed_df],
# #             axis=1
# #         )

        


# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################

# ###########                                               ROW PARSER



# def row_parser(row):

#     # First determine whether this is a project row.
#     project_data = parse_column2(row[1])

#     if project_data["projectCode"] is None:
#         return None

#     state_data = parse_column3(row[2])
#     date_data = parse_column4(row[3])
#     completion_data = parse_column5(row[4])
#     cost_data = parse_column6(row[5])
#     expenditure_data = parse_column7(row[6])
#     progress_data = parse_column8(row[7])

#     return {
#         "serialNumber": row[0],

#         **project_data,
#         **state_data,
#         **date_data,
#         **completion_data,
#         **cost_data,
#         **expenditure_data,
#         **progress_data,
#     }


# # parsed_rows = []

# # for row in raw[1:]:
# #     result = row_parser(row)

# #     if result is not None:
# #         parsed_rows.append(result)

# # df = pd.DataFrame(parsed_rows)

# # print(df.shape)
# # print(df.head())
# # print(df.isna().sum())

# # print(df.dtypes)
# # print(df["projectCode"].duplicated().sum())
# # print(df["physicalProgressPercent"].unique())
# # print(df["revisedCost"].unique()[:20])


# # print(df)




# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################
# ##############################################################################################################################

# ###########                              DATA CONVERSION


# UNKNOWN_VALUES = [
#     "Nan",
#     "nan",
#     "null",
#     "NULL",
#     "",
#     "-",
#     "—",
#     "N/A"
# ]


# def clean_numeric_field(field):
#     field = field.replace(UNKNOWN_VALUES, pd.NA)

#     return pd.to_numeric(
#         field,
#         errors="coerce"
#     )

# def clean_date_field(field):
#     field = field.replace(UNKNOWN_VALUES, pd.NA)

#     return pd.to_datetime(
#         field,
#         format="%m/%Y",
#         errors="coerce"
#     )


# # Integer
# df["serialNumber"] = clean_numeric_field(
#     df["serialNumber"]
# )


# # Decimal
# df["originalCost"] = clean_numeric_field(
#     df["originalCost"]
# )

# df["revisedCost"] = clean_numeric_field(
#     df["revisedCost"]
# )

# df["cumulativeExpenditure"] = clean_numeric_field(
#     df["cumulativeExpenditure"]
# )

# df["physicalProgressPercent"] = clean_numeric_field(
#     df["physicalProgressPercent"]
# )


# # Dates
# print(df["approvalDate"].unique())
# print(df["startDate"].unique())
# print(df["originalCompletionDate"].unique())
# print(df["revisedCompletionDate"].unique())
# df["approvalDate"] = clean_date_field(
#     df["approvalDate"]
# )

# df["startDate"] = clean_date_field(
#     df["startDate"]
# )

# df["originalCompletionDate"] = clean_date_field(
#     df["originalCompletionDate"]
# )

# df["revisedCompletionDate"] = clean_date_field(
#     df["revisedCompletionDate"]
# )


# # print(df.dtypes)
# # print("\nMissing values:")
# # print(df.isna().sum())
    
# # print(df["physicalProgressPercent"].describe())
# # print(df["originalCost"].describe())
# # print(df["revisedCost"].describe())
# # print(df["cumulativeExpenditure"].describe())
# # print(
# #     df[
# #         (df["physicalProgressPercent"] < 0) |
# #         (df["physicalProgressPercent"] > 100)
# #     ]
# # )
# # print(
# #     df[
# #         df["startDate"] > df["originalCompletionDate"]
# #     ]
# # )


# all_projects = []

# with pdfplumber.open(pdf_path) as pdf:
#     print(f"Total pages: {len(pdf.pages)}")

#     for page_number in range(55, 163):
#         page = pdf.pages[page_number - 1]

#         tables = page.extract_tables(TABLE_SETTINGS)

#         for table in tables:
#             projects = row_parser(table)
#             all_projects.extend(projects)

# # Create one DataFrame after processing all pages
# df = pd.DataFrame(all_projects)

# # ---------- Cleaning helpers ----------

# UNKNOWN_VALUES = [
#     "Nan",
#     "nan",
#     "null",
#     "NULL",
#     "",
#     "-",
#     "—",
#     "N/A"
# ]


# def clean_numeric_field(field):
#     field = field.replace(UNKNOWN_VALUES, pd.NA)
#     return pd.to_numeric(field, errors="coerce")


# def clean_date_field(field):
#     field = field.replace(UNKNOWN_VALUES, pd.NA)
#     return pd.to_datetime(
#         field,
#         format="%m/%Y",
#         errors="coerce"
#     )


# # ---------- Type conversion ----------

# df["serialNumber"] = (
#     clean_numeric_field(df["serialNumber"])
#     .astype("Int64")
# )

# df["originalCost"] = clean_numeric_field(df["originalCost"])

# df["revisedCost"] = clean_numeric_field(df["revisedCost"])

# df["cumulativeExpenditure"] = clean_numeric_field(
#     df["cumulativeExpenditure"]
# )

# df["physicalProgressPercent"] = clean_numeric_field(
#     df["physicalProgressPercent"]
# )

# df["approvalDate"] = clean_date_field(df["approvalDate"])

# df["startDate"] = clean_date_field(df["startDate"])

# df["originalCompletionDate"] = clean_date_field(
#     df["originalCompletionDate"]
# )

# df["revisedCompletionDate"] = clean_date_field(
#     df["revisedCompletionDate"]
# )


# # ---------- Basic validation ----------

# print("\n========== FINAL DATASET ==========")

# print("Total projects:", len(df))
# print("Shape:", df.shape)
# print("Columns:", len(df.columns))

# print("\nDuplicate project codes:")
# print(df["projectCode"].duplicated().sum())

# print("\nData types:")
# print(df.dtypes)

# print("\nMissing values:")
# print(df.isna().sum())

# print("\nProjects where physical progress is invalid:")
# print(
#     df[
#         (df["physicalProgressPercent"] < 0) |
#         (df["physicalProgressPercent"] > 100)
#     ]
# )

# print("\nProjects where expenditure exceeds revised cost:")
# print(
#     df[
#         df["cumulativeExpenditure"] > df["revisedCost"]
#     ][
#         [
#             "serialNumber",
#             "projectName",
#             "revisedCost",
#             "cumulativeExpenditure"
#         ]
#     ]
# )

# print("\nProjects where start date is after original completion:")
# print(
#     df[
#         df["startDate"] > df["originalCompletionDate"]
#     ][
#         [
#             "serialNumber",
#             "projectName",
#             "startDate",
#             "originalCompletionDate"
#         ]
#     ]
# )

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


# ============ MAIN EXECUTION ============

all_projects = []

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}")

    for page_number in range(55, 163):
        page = pdf.pages[page_number - 1]
        tables = page.extract_tables(TABLE_SETTINGS)
        
        # Skip if no tables found
        if not tables:
            print(f"No tables found on page {page_number}")
            continue
        
        for table in tables:
            # Skip if table is empty or only has header
            if table is None or len(table) <= 1:
                continue
            
            # Process each row (skip header at index 0)
            for row in table[1:]:
                # Skip empty rows
                if row is None:
                    continue
                
                # Ensure row has at least 8 columns
                if len(row) < 8:
                    continue
                
                # Parse the row
                result = row_parser(row)
                if result is not None:
                    all_projects.append(result)
                
    print(f"Total projects extracted: {len(all_projects)}")

# Create DataFrame
df = pd.DataFrame(all_projects)

# Check if DataFrame is empty
if df.empty:
    print("No data extracted. Please check the PDF structure and page range.")
    exit()

# ============ DATA CLEANING ============

# Clean numeric fields
df["serialNumber"] = clean_numeric_field(df["serialNumber"]).astype("Int64")
df["originalCost"] = clean_numeric_field(df["originalCost"])
df["revisedCost"] = clean_numeric_field(df["revisedCost"])
df["cumulativeExpenditure"] = clean_numeric_field(df["cumulativeExpenditure"])
df["physicalProgressPercent"] = clean_numeric_field(df["physicalProgressPercent"])

# Clean date fields
df["approvalDate"] = clean_date_field(df["approvalDate"])
df["startDate"] = clean_date_field(df["startDate"])
df["originalCompletionDate"] = clean_date_field(df["originalCompletionDate"])
df["revisedCompletionDate"] = clean_date_field(df["revisedCompletionDate"])

# ============ VALIDATION ============

print("\n========== FINAL DATASET ==========")
print("Total projects:", len(df))
print("Shape:", df.shape)
print("Columns:", df.columns.tolist())

print("\nDuplicate project codes:")
print(df["projectCode"].duplicated().sum())

print("\nData types:")
print(df.dtypes)

print("\nMissing values:")
print(df.isna().sum())

print("\nProjects with invalid physical progress (<0 or >100):")
invalid_progress = df[(df["physicalProgressPercent"] < 0) | (df["physicalProgressPercent"] > 100)]
print(f"Found {len(invalid_progress)} projects with invalid progress")

print("\nProjects where expenditure exceeds revised cost:")
overspent = df[df["cumulativeExpenditure"] > df["revisedCost"]]
print(f"Found {len(overspent)} overspent projects")
if len(overspent) > 0:
    print(overspent[["serialNumber", "projectName", "revisedCost", "cumulativeExpenditure"]])

print("\nProjects where start date is after original completion:")
invalid_dates = df[df["startDate"] > df["originalCompletionDate"]]
print(f"Found {len(invalid_dates)} projects with invalid dates")
if len(invalid_dates) > 0:
    print(invalid_dates[["serialNumber", "projectName", "startDate", "originalCompletionDate"]])

# ============ SAVE OUTPUT ============
# Uncomment to save
# df.to_csv("extracted_projects.csv", index=False)
# print("\nData saved to extracted_projects.csv")