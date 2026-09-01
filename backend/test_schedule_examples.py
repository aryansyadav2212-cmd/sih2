import json

with open("data/historical/observations.json") as f:
    data = json.load(f)

rows = data["observations"]

projects = {}

for row in rows:
    code = row.get("projectCode")

    if code:
        projects.setdefault(code, []).append(row)


extended_project = None
not_extended_project = None

for code, project_rows in projects.items():

    # We need all four months
    months = {row["reportMonth"] for row in project_rows}

    if not {"2026-04", "2026-05", "2026-06", "2026-07"}.issubset(months):
        continue

    project_rows = sorted(
        project_rows,
        key=lambda x: x["reportMonth"]
    )

    # Get revised completion dates
    dates = [
        row.get("revisedDoc")
        for row in project_rows
        if row.get("revisedDoc")
    ]

    if not dates:
        continue

    # Remove duplicates while preserving order
    unique_dates = list(dict.fromkeys(dates))

    # Deadline was extended
    if len(unique_dates) > 1 and extended_project is None:
        extended_project = project_rows

    # Deadline did not change
    elif len(unique_dates) == 1 and not_extended_project is None:
        not_extended_project = project_rows

    # Stop once we have both
    if extended_project and not_extended_project:
        break


def print_project(title, project_rows):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)

    print("Project:", project_rows[0]["projectCode"])
    print("Name:", project_rows[0]["projectName"])

    for row in project_rows:
        print(
            row["reportMonth"],
            "| progress:", row.get("physicalProgress"),
            "| revised date:", row.get("revisedDoc")
        )


if extended_project:
    print_project(
        "PROJECT WITH DEADLINE EXTENSION",
        extended_project
    )

if not_extended_project:
    print_project(
        "PROJECT WITHOUT DEADLINE EXTENSION",
        not_extended_project
    )