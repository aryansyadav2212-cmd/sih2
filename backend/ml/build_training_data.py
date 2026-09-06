"""
Build supervised training data for deadline-extension prediction.

For each project and each observation at month M:

    X = features from observations <= M
    y = deadlineExtendedNextMonth

Target = 1 when next.revisedDoc > current.revisedDoc
        (the deadline was pushed later).

Target = 0 when next.revisedDoc <= current.revisedDoc.

Only consecutive calendar months (M -> M+1) produce
a valid training row. Missing or invalid revisedDoc
values cause the row to be skipped.

Usage (from backend/):

    python -m ml.build_training_data
"""

from datetime import datetime
from pathlib import Path
import json

from features.data_validation import validate_observations
from features.monthwise_features import build_monthwise_features
from ml.data_loader import load_observations, group_observations


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------


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


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT.parent

training_path = BACKEND / "data" / "ml" / "training_dataset.json"


def save_training_data(training_rows, path):
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(training_rows, f, indent=2, default=str)


# ---------------------------------------------------------
# Training data construction
# ---------------------------------------------------------


def build_training_data():
    """
    Build training examples with features and labels.

    Steps:
        1. Load observations and group by project.
        2. For each project, sort observations by reportMonth.
        3. For each consecutive (M, M+1) pair:
           - Build features using observations <= M.
           - Compute target from revisedDoc comparison.
        4. Return training rows and skip counters.
    """

    # ---------------------------------------------------------
    # Load observations
    # ---------------------------------------------------------

    observations = load_observations()

    validation_results = validate_observations(
        observations,
        group_by_project=True,
    )

    validation_lookup = {
        (
            result["observation_id"].get("canonicalId")
            or result["observation_id"].get("projectCode"),
            result["observation_id"].get("reportMonth"),
        ): result
        for result in validation_results
    }

    # ---------------------------------------------------------
    # 1. Group observations by project
    # ---------------------------------------------------------

    projects = group_observations(observations)

    # ---------------------------------------------------------
    # 2. Create training examples
    # ---------------------------------------------------------

    training_rows = []

    skipped_not_consecutive = 0
    skipped_missing_deadline = 0
    skipped_missing_validation = 0
    skipped_invalid_current_only = 0
    skipped_invalid_next_only = 0
    skipped_invalid_both = 0
    eligible_suspicious_pairs = 0

    for project_key, project_observations in projects.items():

        # Observations are already sorted by group_observations(),
        # but keeping the training logic explicit is harmless.
        project_observations.sort(
            key=lambda row: row["reportMonth"]
        )

        # Build month index for quick lookup
        observations_by_month = {
            obs["reportMonth"]: obs
            for obs in project_observations
        }

        months = sorted(observations_by_month.keys())

        # Compare current month with next month
        for i in range(len(months) - 1):

            current_month = months[i]
            next_month = months[i + 1]

            # -------------------------------------------------
            # Only use consecutive calendar months
            # -------------------------------------------------

            if not are_consecutive_months(
                current_month,
                next_month,
            ):
                skipped_not_consecutive += 1
                continue

            current = observations_by_month[current_month]
            next_observation = observations_by_month[next_month]

            current_key = (
                current.get("canonicalId") or current.get("projectCode"),
                current.get("reportMonth"),
            )

            next_key = (
                next_observation.get("canonicalId")
                or next_observation.get("projectCode"),
                next_observation.get("reportMonth"),
            )

            current_validation = validation_lookup.get(current_key)
            next_validation = validation_lookup.get(next_key)

            if (
                not current_validation
                or not next_validation
                or "validity" not in current_validation
                or "validity" not in next_validation
            ):
                skipped_missing_validation += 1
                continue

            current_invalid = (
                current_validation["validity"] == "invalid"
            )

            next_invalid = (
                next_validation["validity"] == "invalid"
            )

            if current_invalid and next_invalid:
                skipped_invalid_both += 1
                continue

            if current_invalid:
                skipped_invalid_current_only += 1
                continue

            if next_invalid:
                skipped_invalid_next_only += 1
                continue

            if (
                current_validation.get("anomaly") == "suspicious"
                or next_validation.get("anomaly") == "suspicious"
            ):
                eligible_suspicious_pairs += 1

            # -------------------------------------------------
            # Validate revisedDoc on both observations
            # -------------------------------------------------

            current_date = current.get("revisedDoc")
            next_date = next_observation.get("revisedDoc")

            if not current_date or not next_date:
                skipped_missing_deadline += 1
                continue

            # -------------------------------------------------
            # Target: deadline extended = pushed later
            #
            # next.revisedDoc > current.revisedDoc
            #     means the deadline was moved further out.
            #
            # next.revisedDoc <= current.revisedDoc
            #     means the deadline stayed or moved earlier.
            # -------------------------------------------------

            deadline_extended = int(
                next_date > current_date
            )

            # -------------------------------------------------
            # Build features using observations <= current month
            # (no data leakage — future months are excluded)
            # -------------------------------------------------

            features = build_monthwise_features(
                project_observations,
                current_month,
            )

            if not features:
                continue

            training_rows.append({
                "projectCode": current.get("projectCode"),
                "canonicalId": current.get("canonicalId"),
                "observationMonth": current_month,
                "features": features,
                "deadlineExtendedNextMonth": deadline_extended,
            })

    return (
        training_rows,
        skipped_not_consecutive,
        skipped_missing_deadline,
        skipped_missing_validation,
        skipped_invalid_current_only,
        skipped_invalid_next_only,
        skipped_invalid_both,
        eligible_suspicious_pairs,
    )


# ---------------------------------------------------------
# Validation and summary
# ---------------------------------------------------------


def print_summary(
    training_rows,
    skipped_not_consecutive,
    skipped_missing_deadline,
    skipped_missing_validation,
    skipped_invalid_current_only,
    skipped_invalid_next_only,
    skipped_invalid_both,
    eligible_suspicious_pairs,
):
    """Print a comprehensive summary of the training dataset."""

    total = len(training_rows)

    positives = sum(
        row["deadlineExtendedNextMonth"] == 1
        for row in training_rows
    )

    negatives = sum(
        row["deadlineExtendedNextMonth"] == 0
        for row in training_rows
    )

    projects = set()
    observation_months = []

    for row in training_rows:
        key = row.get("canonicalId") or row.get("projectCode")
        projects.add(key)
        observation_months.append(row["observationMonth"])

    # Duplicate check
    seen = set()
    duplicates = 0

    for row in training_rows:
        key = (
            row.get("projectCode") or row.get("canonicalId"),
            row["observationMonth"],
        )

        if key in seen:
            duplicates += 1
        else:
            seen.add(key)

    print("\n" + "=" * 60)
    print("TRAINING DATASET SUMMARY")
    print("=" * 60)

    print(f"Total training examples:       {total}")
    print(f"Positive examples (extended):  {positives}")
    print(f"Negative examples (not ext.):  {negatives}")

    if total > 0:
        pct = round(positives / total * 100, 2)
        print(f"Positive percentage:           {pct}%")

    print()
    print(
        f"Skipped (not consecutive month): "
        f"{skipped_not_consecutive}"
    )

    print(
        f"Skipped (missing deadline date): "
        f"{skipped_missing_deadline}"
    )

    print(
        f"Skipped (missing validation metadata): "
        f"{skipped_missing_validation}"
    )

    print(
        f"Skipped (invalid current only): "
        f"{skipped_invalid_current_only}"
    )

    print(
        f"Skipped (invalid next only): "
        f"{skipped_invalid_next_only}"
    )

    print(
        f"Skipped (both observations invalid): "
        f"{skipped_invalid_both}"
    )

    print(
        f"Eligible pairs with suspicious observation: "
        f"{eligible_suspicious_pairs}"
    )

    print()

    print(f"Projects represented:          {len(projects)}")

    if observation_months:
        print(
            f"Earliest observation month:    "
            f"{min(observation_months)}"
        )

        print(
            f"Latest observation month:      "
            f"{max(observation_months)}"
        )

    print()

    if duplicates > 0:
        print(
            f"WARNING: {duplicates} duplicate "
            f"(projectCode + observationMonth) rows found!"
        )
    else:
        print(
            "No duplicate "
            "(projectCode + observationMonth) rows."
        )

    print("=" * 60)


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------


def main():
    (
        training_rows,
        skipped_nc,
        skipped_md,
        skipped_mv,
        skipped_ico,
        skipped_ino,
        skipped_ib,
        suspicious_pairs,
    ) = build_training_data()

    save_training_data(
        training_rows,
        training_path,
    )

    # ---------------------------------------------------------
    # Print sample rows
    # ---------------------------------------------------------

    print("\nSample training examples:\n")

    for row in training_rows[:10]:
        print({
            "projectCode": row["projectCode"],
            "canonicalId": row["canonicalId"],
            "observationMonth": row["observationMonth"],
            "deadlineExtendedNextMonth": row[
                "deadlineExtendedNextMonth"
            ],
            "featureKeys": list(
                row["features"].keys()
            ),
        })

    # ---------------------------------------------------------
    # Summary
    # ---------------------------------------------------------

    print_summary(
        training_rows,
        skipped_nc,
        skipped_md,
        skipped_mv,
        skipped_ico,
        skipped_ino,
        skipped_ib,
        suspicious_pairs,
    )


if __name__ == "__main__":
    main()