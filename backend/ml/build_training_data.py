import json
from datetime import datetime


def are_consecutive_months(current_month, next_month):
    """
    Check whether two report months are consecutive.

    Examples:
        2026-04 -> 2026-05 = True
        2026-05 -> 2026-06 = True
        2026-04 -> 2026-06 = False
    """

    current = datetime.strptime(current_month, "%Y-%m")
    next_ = datetime.strptime(next_month, "%Y-%m")

    year_difference = next_.year - current.year
    month_difference = next_.month - current.month

    total_month_difference = (
        year_difference * 12 + month_difference
    )

    return total_month_difference == 1


def required_fields():
    """
    Build training labels for the ML model.

    For every project, compare one month's observation
    with the following month's observation.

    Target:
        deadlineExtended = 1
            if the revised completion date changed
            in the next month.

        deadlineExtended = 0
            if the revised completion date stayed the same.

    Only consecutive monthly observations are used.
    """

    path = "data/historical/observations.json"

    with open(path, "r") as f:
        data = json.load(f)

    observations = data["observations"]

    # ---------------------------------------------------------
    # 1. Group observations by project
    # ---------------------------------------------------------

    projects = {}

    for observation in observations:
        project_code = observation.get("projectCode")

        if not project_code:
            continue

        if project_code not in projects:
            projects[project_code] = []

        projects[project_code].append(observation)

    # ---------------------------------------------------------
    # 2. Create training examples
    # ---------------------------------------------------------

    training_rows = []

    for project_code, project_observations in projects.items():

        # Sort observations chronologically
        project_observations.sort(
            key=lambda row: row["reportMonth"]
        )

        # Compare current month with next month
        for i in range(len(project_observations) - 1):

            current = project_observations[i]
            next_observation = project_observations[i + 1]

            current_month = current["reportMonth"]
            next_month = next_observation["reportMonth"]

            # -------------------------------------------------
            # Make sure the observations are actually
            # consecutive months.
            # -------------------------------------------------

            if not are_consecutive_months(
                current_month,
                next_month
            ):
                continue

            current_date = current.get("revisedDoc")
            next_date = next_observation.get("revisedDoc")

            # -------------------------------------------------
            # We cannot determine whether the deadline changed
            # if either date is missing.
            # -------------------------------------------------

            if not current_date or not next_date:
                continue

            # -------------------------------------------------
            # Target / label
            # -------------------------------------------------

            deadline_extended = next_date != current_date

            training_rows.append({
                "projectCode": project_code,
                "observationMonth": current_month,
                "nextMonth": next_month,
                "currentRevisedDate": current_date,
                "nextRevisedDate": next_date,
                "deadlineExtended": int(deadline_extended)
            })

    return training_rows


def main():
    training_rows = required_fields()

    # ---------------------------------------------------------
    # Print sample rows
    # ---------------------------------------------------------

    print("\nSample training examples:\n")

    for row in training_rows[:20]:
        print(row)

    # ---------------------------------------------------------
    # Dataset statistics
    # ---------------------------------------------------------

    total_examples = len(training_rows)

    deadline_extensions = sum(
        row["deadlineExtended"] == 1
        for row in training_rows
    )

    no_extensions = sum(
        row["deadlineExtended"] == 0
        for row in training_rows
    )

    print("\n" + "=" * 60)
    print("TRAINING DATASET SUMMARY")
    print("=" * 60)

    print("Total training examples:", total_examples)
    print("Deadline extensions:", deadline_extensions)
    print("No extensions:", no_extensions)

    if total_examples > 0:
        extension_percentage = (
            deadline_extensions / total_examples
        ) * 100

        print(
            "Extension percentage:",
            round(extension_percentage, 2),
            "%"
        )


if __name__ == "__main__":
    main()