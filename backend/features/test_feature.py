# import json

# from features.financial_features import calculate_cost_features


# with open("data/historical/observations.json") as f:
#     observations = json.load(f)


# for key, rows in observations.items():
#     for row in rows:
#         if row.get("projectCode") == "701107":
#             features = calculate_cost_features(
#                 row.get("originalCost"),
#                 row.get("revisedCost"),
#                 row.get("cumulativeExpenditure")
#             )

#             print("Report Month:", row.get("reportMonth"))
#             print("Original Cost:", row.get("originalCost"))
#             print("Revised Cost:", row.get("revisedCost"))
#             print("Cumulative Expenditure:", row.get("cumulativeExpenditure"))
#             print("Features:", features)
#             print()


# def calculate_expenditure_change(current, previous):
#     """Calculate change in cumulative expenditure."""

#     try:
#         current = float(current)
#         previous = float(previous)
#     except (TypeError, ValueError):
#         return None

#     expenditure_change = current - previous

#     return round(expenditure_change, 4)


# current = 572.99
# previous = 527.74
# print(calculate_expenditure_change(current, previous))
# current = 527.74
# previous = 572.99
# print(calculate_expenditure_change(current, previous))
# current = None
# previous = 527.74
# print(calculate_expenditure_change(current, previous))
# current = "N/A"
# previous = 527.74
# print(calculate_expenditure_change(current, previous))

# current = 572.99, previous = 527.74
# current = 527.74, previous = 572.99
# current = None, previous = 527.74
# current = "N/A", previous = 527.74
# project_rows = [{
#       "canonicalId": "P00023",
#       "pmgId": "9932",
#       "projectCode": "701113",
#       "legacyOcmsCode": "N04000114",
#       "reportMonth": "2026-04",
#       "projectName": "Development of Lal Bahadur Shastri International airport, Varanasi including C/o New Terminal Building, Apron Extension, Runway Extension, PTT and allied works.",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "Uttar Pradesh",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2024-07-01",
#       "startDate": "2024-07-01",
#       "originalDoc": "2027-07-01",
#       "revisedDoc": "2027-07-01",
#       "originalCost": 286.0,
#       "revisedCost": 286.0,
#       "cumulativeExpenditure": 572.04,
#       "physicalProgress": 27.0,
#       "sourceReport": "486th Flash Report on Central Sector Infrastructure Projects (April 2026)",
#       "sourcePage": 56,
#       "matchMethod": "pmgId"
#     },
#     {
#       "canonicalId": "P00023",
#       "pmgId": "9932",
#       "projectCode": "701113",
#       "legacyOcmsCode": "N04000114",
#       "reportMonth": "2026-05",
#       "projectName": "Development of Lal Bahadur Shastri International airport, Varanasi including C/o New Terminal Building, Apron Extension, Runway Extension, PTT and allied works.",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "Uttar Pradesh",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2024-07-01",
#       "startDate": "2024-07-01",
#       "originalDoc": "2027-07-01",
#       "revisedDoc": "2027-07-01",
#       "originalCost": 286.0,
#       "revisedCost": 286.0,
#       "cumulativeExpenditure": 626.15,
#       "physicalProgress": 29.0,
#       "sourceReport": "487th Flash Report on Central Sector Infrastructure Projects (May 2026)",
#       "sourcePage": 55,
#       "matchMethod": "pmgId"
#     },
#     {
#       "canonicalId": "P00023",
#       "pmgId": "9932",
#       "projectCode": "701113",
#       "legacyOcmsCode": "N04000114",
#       "reportMonth": "2026-06",
#       "projectName": "Development of Lal Bahadur Shastri International airport, Varanasi including C/o New Terminal Building, Apron Extension, Runway Extension, PTT and allied works.",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "Uttar Pradesh",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2024-07-01",
#       "startDate": "2024-07-01",
#       "originalDoc": "2027-07-01",
#       "revisedDoc": "2027-07-01",
#       "originalCost": 286.0,
#       "revisedCost": 286.0,
#       "cumulativeExpenditure": 677.21,
#       "physicalProgress": 31.0,
#       "sourceReport": "488th Flash Report on Central Sector Infrastructure Projects (June 2026)",
#       "sourcePage": 60,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00023",
#       "pmgId": "9932",
#       "projectCode": "701113",
#       "legacyOcmsCode": "N04000114",
#       "reportMonth": "2026-07",
#       "projectName": "Development of Lal Bahadur Shastri International airport, Varanasi including C/o New Terminal Building, Apron Extension, Runway Extension, PTT and allied works.",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "Uttar Pradesh",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2024-07-01",
#       "startDate": "2024-07-01",
#       "originalDoc": "2027-07-01",
#       "revisedDoc": "2027-07-01",
#       "originalCost": 286.0,
#       "revisedCost": 286.0,
#       "cumulativeExpenditure": 746.93,
#       "physicalProgress": 33.0,
#       "sourceReport": "489th Flash Report on Central Sector Infrastructure Projects (July 2026)",
#       "sourcePage": 56,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00025",
#       "pmgId": "9920",
#       "projectCode": "611495",
#       "legacyOcmsCode": "N04000115",
#       "reportMonth": "2026-05",
#       "projectName": "Development of New Civil Enclave at Bagdogra Airport",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "West Bengal",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2024-08-01",
#       "startDate": "2024-09-01",
#       "originalDoc": "2027-03-01",
#       "revisedDoc": "2027-03-01",
#       "originalCost": 154.0,
#       "revisedCost": 154.0,
#       "cumulativeExpenditure": 481.09,
#       "physicalProgress": 36.93,
#       "sourceReport": "487th Flash Report on Central Sector Infrastructure Projects (May 2026)",
#       "sourcePage": 55,
#       "matchMethod": "pmgId"
#     },
#     {
#       "canonicalId": "P00025",
#       "pmgId": "9920",
#       "projectCode": "611495",
#       "legacyOcmsCode": "N04000115",
#       "reportMonth": "2026-06",
#       "projectName": "Development of New Civil Enclave at Bagdogra Airport",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "West Bengal",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2024-08-01",
#       "startDate": "2024-09-01",
#       "originalDoc": "2027-03-01",
#       "revisedDoc": "2027-03-01",
#       "originalCost": 154.0,
#       "revisedCost": 154.0,
#       "cumulativeExpenditure": 507.8,
#       "physicalProgress": 39.68,
#       "sourceReport": "488th Flash Report on Central Sector Infrastructure Projects (June 2026)",
#       "sourcePage": 60,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00025",
#       "pmgId": "9920",
#       "projectCode": "611495",
#       "legacyOcmsCode": "N04000115",
#       "reportMonth": "2026-07",
#       "projectName": "Development of New Civil Enclave at Bagdogra Airport",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "West Bengal",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2024-08-01",
#       "startDate": "2024-09-01",
#       "originalDoc": "2027-03-01",
#       "revisedDoc": "2027-03-01",
#       "originalCost": 154.0,
#       "revisedCost": 154.0,
#       "cumulativeExpenditure": 548.3,
#       "physicalProgress": 27.9,
#       "sourceReport": "489th Flash Report on Central Sector Infrastructure Projects (July 2026)",
#       "sourcePage": 56,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00026",
#       "pmgId": null,
#       "projectCode": "612791",
#       "legacyOcmsCode": "N04000109",
#       "reportMonth": "2026-04",
#       "projectName": "Re-Construction of Rigid portions of Secondary Runway, K and A Taxiway and Strengthening of C Taxiway at NSCBI Airport Kolkata.",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "West Bengal",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2023-03-01",
#       "startDate": "2023-12-01",
#       "originalDoc": "2025-10-01",
#       "revisedDoc": "2026-08-01",
#       "originalCost": 328.3,
#       "revisedCost": 328.3,
#       "cumulativeExpenditure": 139.77,
#       "physicalProgress": 64.5,
#       "sourceReport": "486th Flash Report on Central Sector Infrastructure Projects (April 2026)",
#       "sourcePage": 56,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00026",
#       "pmgId": null,
#       "projectCode": "612791",
#       "legacyOcmsCode": "N04000109",
#       "reportMonth": "2026-05",
#       "projectName": "Re-Construction of Rigid portions of Secondary Runway, K and A Taxiway and Strengthening of C Taxiway at NSCBI Airport Kolkata.",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "West Bengal",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2023-03-01",
#       "startDate": "2023-12-01",
#       "originalDoc": "2025-10-01",
#       "revisedDoc": "2026-08-01",
#       "originalCost": 328.3,
#       "revisedCost": 328.3,
#       "cumulativeExpenditure": 145.41,
#       "physicalProgress": 70.0,
#       "sourceReport": "487th Flash Report on Central Sector Infrastructure Projects (May 2026)",
#       "sourcePage": 55,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00026",
#       "pmgId": null,
#       "projectCode": "612791",
#       "legacyOcmsCode": "N04000109",
#       "reportMonth": "2026-06",
#       "projectName": "Re-Construction of Rigid portions of Secondary Runway, K and A Taxiway and Strengthening of C Taxiway at NSCBI Airport Kolkata.",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "West Bengal",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2023-03-01",
#       "startDate": "2023-12-01",
#       "originalDoc": "2025-10-01",
#       "revisedDoc": "2026-08-01",
#       "originalCost": 328.3,
#       "revisedCost": 328.3,
#       "cumulativeExpenditure": 148.75,
#       "physicalProgress": 71.4,
#       "sourceReport": "488th Flash Report on Central Sector Infrastructure Projects (June 2026)",
#       "sourcePage": 60,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00026",
#       "pmgId": null,
#       "projectCode": "612791",
#       "legacyOcmsCode": "N04000109",
#       "reportMonth": "2026-07",
#       "projectName": "Re-Construction of Rigid portions of Secondary Runway, K and A Taxiway and Strengthening of C Taxiway at NSCBI Airport Kolkata.",
#       "agency": "Airport Authority of India [AAI]",
#       "state": "West Bengal",
#       "ministry": "Ministry of Civil Aviation",
#       "sector": "Aviation & Aviation Infrastructure",
#       "approvalDate": "2023-03-01",
#       "startDate": "2023-12-01",
#       "originalDoc": "2025-10-01",
#       "revisedDoc": "2026-08-01",
#       "originalCost": 328.3,
#       "revisedCost": 328.3,
#       "cumulativeExpenditure": 153.52,
#       "physicalProgress": 73.5,
#       "sourceReport": "489th Flash Report on Central Sector Infrastructure Projects (July 2026)",
#       "sourcePage": 56,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00027",
#       "pmgId": null,
#       "projectCode": "615820",
#       "legacyOcmsCode": "N06000290",
#       "reportMonth": "2026-04",
#       "projectName": "TIKAK EXTENSION OCP",
#       "agency": "MIS MoCoal Integration Logins",
#       "state": "Assam",
#       "ministry": "Ministry of Coal",
#       "sector": "Coal",
#       "approvalDate": "2022-07-01",
#       "startDate": "2022-07-01",
#       "originalDoc": "2031-07-01",
#       "revisedDoc": null,
#       "originalCost": 159.77,
#       "revisedCost": 159.77,
#       "cumulativeExpenditure": 111.47,
#       "physicalProgress": 88.18,
#       "sourceReport": "486th Flash Report on Central Sector Infrastructure Projects (April 2026)",
#       "sourcePage": 56,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00027",
#       "pmgId": null,
#       "projectCode": "615820",
#       "legacyOcmsCode": "N06000290",
#       "reportMonth": "2026-05",
#       "projectName": "TIKAK EXTENSION OCP",
#       "agency": "MIS MoCoal Integration Logins",
#       "state": "Assam",
#       "ministry": "Ministry of Coal",
#       "sector": "Coal",
#       "approvalDate": "2022-07-01",
#       "startDate": "2022-07-01",
#       "originalDoc": "2031-07-01",
#       "revisedDoc": null,
#       "originalCost": 159.77,
#       "revisedCost": 159.77,
#       "cumulativeExpenditure": 112.47,
#       "physicalProgress": 89.0,
#       "sourceReport": "487th Flash Report on Central Sector Infrastructure Projects (May 2026)",
#       "sourcePage": 55,
#       "matchMethod": "projectCode"
#     },
#     {
#       "canonicalId": "P00027",
#       "pmgId": null,
#       "projectCode": "615820",
#       "legacyOcmsCode": "N06000290",
#       "reportMonth": "2026-06",
#       "projectName": "TIKAK EXTENSION OCP",
#       "agency": "INVALID CO.",
#       "state": "Assam",
#       "ministry": "Ministry of Coal",
#       "sector": "Coal",
#       "approvalDate": "2022-07-01",
#       "startDate": "2022-07-01",
#       "originalDoc": "2031-07-01",
#       "revisedDoc": null,
#       "originalCost": 159.77,
#       "revisedCost": 159.77,
#       "cumulativeExpenditure": 112.8,
#       "physicalProgress": 89.73,
#       "sourceReport": "488th Flash Report on Central Sector Infrastructure Projects (June 2026)",
#       "sourcePage": 60,
#       "matchMethod": "projectCode"
#     },
# ]
# projects = {}

# # 1. Group observations by project
# for row in project_rows:
#     project_id = row.get("pmgId")

#     if project_id not in projects:
#         projects[project_id] = []

#     projects[project_id].append(row)


# # 2. Process each project separately
# for project_id, rows in projects.items():

#     # Sort this project's observations chronologically
#     rows.sort(key=lambda row: row["reportMonth"])

#     # Reset for every new project
#     previous_expenditure = None

#     for row in rows:
#         current_expenditure = row.get("cumulativeExpenditure")

#         expenditure_change = calculate_expenditure_change(
#             current_expenditure,
#             previous_expenditure
#         )

#         row["expenditureChange"] = expenditure_change

#         print("Project ID:", project_id)
#         print("Report Month:", row.get("reportMonth"))
#         print("Current Expenditure:", current_expenditure)
#         print("Previous Expenditure:", previous_expenditure)
#         print("Expenditure Change:", expenditure_change)
#         print()

#         previous_expenditure = current_expenditure
import json

from features.financial_features import calculate_cost_features
from features.temporal_features import (
    calculate_expenditure_change,
    calculate_expenditure_change_percent,
)


# Load observations
with open("data/historical/observations.json") as f:
    observations = json.load(f)

print("Observations type:", type(observations))


# Get observation rows
if isinstance(observations, dict):
    project_rows = observations.get("observations", [])
else:
    project_rows = observations


# Group observations by project
projects = {}

for row in project_rows:
    project_id = row.get("pmgId")

    if project_id is None:
        continue

    if project_id not in projects:
        projects[project_id] = []

    projects[project_id].append(row)


# Process each project
for project_id, rows in projects.items():

    # Sort observations chronologically
    rows.sort(key=lambda row: row.get("reportMonth", ""))

    # Reset previous expenditure for every project
    previous_expenditure = None

    print("=" * 60)
    print("Project ID:", project_id)
    print("=" * 60)

    for row in rows:

        current_expenditure = row.get("cumulativeExpenditure")

        # -----------------------------------
        # Current financial features
        # -----------------------------------

        cost_features = calculate_cost_features(
            row.get("originalCost"),
            row.get("revisedCost"),
            current_expenditure,
        )

        # -----------------------------------
        # Temporal financial features
        # -----------------------------------

        expenditure_change = calculate_expenditure_change(
            current_expenditure,
            previous_expenditure,
        )

        expenditure_change_percent = calculate_expenditure_change_percent(
            current_expenditure,
            previous_expenditure,
        )

        # Store features in observation
        row["expenditureChange"] = expenditure_change
        row["expenditureChangePercent"] = expenditure_change_percent

        # -----------------------------------
        # Print results
        # -----------------------------------

        print("Report Month:", row.get("reportMonth"))
        print("Original Cost:", row.get("originalCost"))
        print("Revised Cost:", row.get("revisedCost"))

        print("Current Expenditure:", current_expenditure)
        print("Previous Expenditure:", previous_expenditure)

        print("Cost Features:", cost_features)

        print("Expenditure Change:", expenditure_change)
        print(
            "Expenditure Change %:",
            expenditure_change_percent
        )

        print()

        # Current becomes previous for next month
        previous_expenditure = current_expenditure