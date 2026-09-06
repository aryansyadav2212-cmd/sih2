
import json
from collections import defaultdict
from datetime import date

import pandas as pd


# ------------------------------------------------------------
# Load historical observations
# ------------------------------------------------------------

with open("data/historical/observations.json", "r") as f:
    historical = json.load(f)


# ------------------------------------------------------------
# Group observations by project
# ------------------------------------------------------------

obs_by_project = defaultdict(list)

for obs in historical["observations"]:
    obs_by_project[obs["canonicalId"]].append(obs)

for project_obs in obs_by_project.values():
    project_obs.sort(key=lambda x: x["reportMonth"])


# ------------------------------------------------------------
# Helper: next calendar month
# ------------------------------------------------------------

def next_month(month):
    year, m = map(int, month.split("-"))

    if m == 12:
        return f"{year + 1}-01"

    return f"{year}-{m + 1:02d}"


# ------------------------------------------------------------
# Build qualifying project-month cases
#
# Conditions:
#   - next observation is the consecutive calendar month
#   - current physical progress >= 90%
#   - current revised deadline exists
#   - current project is <= 60 days from deadline
#   - next-month physical progress exists
# ------------------------------------------------------------

results = []

for project_obs in obs_by_project.values():

    for i, current in enumerate(project_obs[:-1]):

        next_obs = project_obs[i + 1]

        # Require consecutive months
        if next_obs["reportMonth"] != next_month(current["reportMonth"]):
            continue

        # Required current-month data
        if current.get("physicalProgress") is None:
            continue

        if current.get("revisedDoc") is None:
            continue

        # Parse dates
        try:
            deadline = date.fromisoformat(current["revisedDoc"])
            report_date = date.fromisoformat(
                current["reportMonth"] + "-01"
            )
        except ValueError:
            continue

        remaining_days = (deadline - report_date).days

        # High-progress + deadline-close condition
        if current["physicalProgress"] >= 90 and remaining_days <= 60:

            # Required next-month progress
            if next_obs.get("physicalProgress") is None:
                continue

            # Deadline extension event
            deadline_extended = (
                next_obs.get("revisedDoc") is not None
                and next_obs["revisedDoc"] > current["revisedDoc"]
            )

            # Physical progress change
            progress_change = (
                next_obs["physicalProgress"]
                - current["physicalProgress"]
            )

            # Extension magnitude
            extension_days = None

            if deadline_extended:
                old_deadline = pd.Timestamp(current["revisedDoc"])
                new_deadline = pd.Timestamp(next_obs["revisedDoc"])

                extension_days = (
                    new_deadline - old_deadline
                ).days

            results.append({
                "projectCode": current["projectCode"],
                "canonicalId": current["canonicalId"],
                "currentMonth": current["reportMonth"],
                "nextMonth": next_obs["reportMonth"],
                "currentProgress": current["physicalProgress"],
                "nextProgress": next_obs["physicalProgress"],
                "progressChange": progress_change,
                "deadlineExtended": deadline_extended,
                "deadlineExtensionDays": extension_days,
                "remainingDays": remaining_days,
            })


# ------------------------------------------------------------
# Convert to DataFrame
# ------------------------------------------------------------

target_check = pd.DataFrame(results)


# ------------------------------------------------------------
# Basic progress analysis
# ------------------------------------------------------------

print("\nNumber of qualifying cases:", len(target_check))


print("\nProgress change distribution:")
print(
    target_check["progressChange"].describe()
)


print("\nMost common progress changes:")
print(
    target_check["progressChange"]
    .value_counts()
    .sort_index()
    .head(30)
)


print("\nFraction with exactly 0% progress change:")
print(
    (target_check["progressChange"] == 0).mean()
)


print("\nFraction with positive progress change:")
print(
    (target_check["progressChange"] > 0).mean()
)


print("\nFraction with negative progress change:")
print(
    (target_check["progressChange"] < 0).mean()
)


# ------------------------------------------------------------
# Deadline extension analysis
# ------------------------------------------------------------

extended = target_check[
    target_check["deadlineExtended"]
].copy()


print("\nDeadline extension days:")

print(
    extended["deadlineExtensionDays"].describe()
)


print("\nMost common extension lengths:")

print(
    extended["deadlineExtensionDays"]
    .value_counts()
    .head(20)
)


# ------------------------------------------------------------
# Extension size vs physical progress
# ------------------------------------------------------------

print("\nExtension size vs next-month progress:")


def extension_bucket(days):

    if days <= 31:
        return "30-31 days"

    elif days <= 61:
        return "32-61 days"

    elif days <= 92:
        return "62-92 days"

    else:
        return ">92 days"


extended["extensionBucket"] = (
    extended["deadlineExtensionDays"]
    .apply(extension_bucket)
)


# Explicit ordering makes the output easier to read
bucket_order = [
    "30-31 days",
    "32-61 days",
    "62-92 days",
    ">92 days",
]

extended["extensionBucket"] = pd.Categorical(
    extended["extensionBucket"],
    categories=bucket_order,
    ordered=True,
)


print(
    extended
    .groupby(
        "extensionBucket",
        observed=True
    )["progressChange"]
    .agg(
        ["count", "mean", "median", "min", "max"]
    )
)


# ------------------------------------------------------------
# Post-extension progress analysis
#
# Compare subsequent physical-progress changes for qualifying
# cases with and without a deadline extension.  Horizons are
# matched by calendar month, rather than observation position,
# because a project's historical observations can contain gaps.
# ------------------------------------------------------------

def months_after(month, months):
    """Return the YYYY-MM value for a calendar-month horizon."""
    year, m = map(int, month.split("-"))
    total_months = year * 12 + (m - 1) + months
    return f"{total_months // 12}-{total_months % 12 + 1:02d}"


# A project's observations are already sorted, but use the report month as
# the lookup key so the target horizon is selected even when months are absent.
progress_by_project_month = {
    canonical_id: {
        observation["reportMonth"]: observation.get("physicalProgress")
        for observation in project_obs
    }
    for canonical_id, project_obs in obs_by_project.items()
}

post_extension_changes = []

for case in results:
    project_progress = progress_by_project_month[case["canonicalId"]]

    for horizon in (1, 2, 3):
        horizon_month = months_after(case["currentMonth"], horizon)
        horizon_progress = project_progress.get(horizon_month)

        if horizon_progress is None:
            continue

        post_extension_changes.append({
            "horizonMonths": horizon,
            "deadlineExtended": case["deadlineExtended"],
            "progressChange": horizon_progress - case["currentProgress"],
        })


post_extension_progress = pd.DataFrame(
    post_extension_changes,
    columns=["horizonMonths", "deadlineExtended", "progressChange"],
)

comparison_rows = []

for horizon in (1, 2, 3):
    for deadline_extended in (True, False):
        changes = post_extension_progress.loc[
            (post_extension_progress["horizonMonths"] == horizon)
            & (post_extension_progress["deadlineExtended"] == deadline_extended),
            "progressChange",
        ]
        case_count = len(changes)

        comparison_rows.append({
            "Horizon": f"{horizon} month{'s' if horizon > 1 else ''}",
            "Deadline extended": deadline_extended,
            "Cases": case_count,
            "Mean progress change": changes.mean(),
            "Median progress change": changes.median(),
            "% zero change": (changes == 0).mean() * 100 if case_count else None,
            "% positive change": (changes > 0).mean() * 100 if case_count else None,
            "% negative change": (changes < 0).mean() * 100 if case_count else None,
        })


post_extension_comparison = pd.DataFrame(comparison_rows)

print("\nPost-extension progress by calendar-month horizon:")
print(
    post_extension_comparison.to_string(
        index=False,
        formatters={
            "Mean progress change": "{:.2f}".format,
            "Median progress change": "{:.2f}".format,
            "% zero change": "{:.1f}%".format,
            "% positive change": "{:.1f}%".format,
            "% negative change": "{:.1f}%".format,
        },
    )
)


# ------------------------------------------------------------
# Repeated extensions and eventual completion
#
# A qualifying case is followed from its current observation onward.
# Project-level results use each qualifying project's earliest case so a
# project is not counted more than once in the extension-count cohorts.
# ------------------------------------------------------------

def is_deadline_extension(previous, current):
    """Return whether a later observation moves the known deadline later."""
    previous_deadline = previous.get("revisedDoc")
    current_deadline = current.get("revisedDoc")

    if previous_deadline is None or current_deadline is None:
        return False

    try:
        return date.fromisoformat(current_deadline) > date.fromisoformat(
            previous_deadline
        )
    except ValueError:
        return False


def case_trajectory(case):
    """Return the observation sequence beginning with a qualifying case."""
    project_obs = obs_by_project[case["canonicalId"]]

    for index, observation in enumerate(project_obs):
        if observation["reportMonth"] == case["currentMonth"]:
            return project_obs[index:], index

    return [], None


case_outcomes = []

for case in results:
    trajectory, start_index = case_trajectory(case)
    subsequent_observations = trajectory[1:]
    later_progress = [
        observation["physicalProgress"]
        for observation in trajectory
        if observation.get("physicalProgress") is not None
    ]

    # "Another" excludes the current-to-next-month event that defines
    # deadlineExtended for this qualifying case.
    additional_extensions = sum(
        is_deadline_extension(previous, current)
        for previous, current in zip(
            subsequent_observations,
            subsequent_observations[1:],
        )
    )

    case_outcomes.append({
        "canonicalId": case["canonicalId"],
        "currentMonth": case["currentMonth"],
        "eventuallyCompleted": any(progress == 100 for progress in later_progress),
        "hasAnotherExtension": additional_extensions > 0,
        "additionalExtensions": additional_extensions,
        "startIndex": start_index,
    })


case_outcomes_df = pd.DataFrame(case_outcomes)

print("\nEventual completion for qualifying cases:")
print("Reached 100%:", int(case_outcomes_df["eventuallyCompleted"].sum()))
print("Remained below 100%:", int((~case_outcomes_df["eventuallyCompleted"]).sum()))
print(
    "Received another deadline extension:",
    int(case_outcomes_df["hasAnotherExtension"].sum()),
)


# Use the first qualifying month per project for an independent project-level
# extension cohort.  Count every later observed increase in revisedDoc,
# including the current-to-next-month extension when present.
first_case_by_project = {}

for case in results:
    canonical_id = case["canonicalId"]
    if (
        canonical_id not in first_case_by_project
        or case["currentMonth"] < first_case_by_project[canonical_id]["currentMonth"]
    ):
        first_case_by_project[canonical_id] = case


project_outcomes = []

for case in first_case_by_project.values():
    trajectory, _ = case_trajectory(case)
    progress_values = [
        observation["physicalProgress"]
        for observation in trajectory
        if observation.get("physicalProgress") is not None
    ]
    extension_count = sum(
        is_deadline_extension(previous, current)
        for previous, current in zip(trajectory, trajectory[1:])
    )

    if extension_count == 0:
        extension_cohort = "0 extensions"
    elif extension_count == 1:
        extension_cohort = "1 extension"
    elif extension_count == 2:
        extension_cohort = "2 extensions"
    else:
        extension_cohort = "3+ extensions"

    project_outcomes.append({
        "canonicalId": case["canonicalId"],
        "extensions": extension_count,
        "extensionCohort": extension_cohort,
        "eventuallyCompleted": any(progress == 100 for progress in progress_values),
    })


project_outcomes_df = pd.DataFrame(project_outcomes)
completion_by_extension_count = (
    project_outcomes_df
    .groupby("extensionCohort", observed=True)["eventuallyCompleted"]
    .agg(["count", "sum", "mean"])
    .reindex(["0 extensions", "1 extension", "2 extensions", "3+ extensions"])
    .rename(columns={
        "count": "Projects",
        "sum": "Completed projects",
        "mean": "Completion rate",
    })
)

print("\nExtensions per qualifying project and eventual completion:")
print(
    completion_by_extension_count.to_string(
        formatters={"Completion rate": "{:.1%}".format},
    )
)
print("\nNumber of deadline extensions per qualifying project:")
print(project_outcomes_df["extensions"].value_counts().sort_index())


# Compare progress only after the revised deadline in force for each observed
# month has passed.  This does not infer missing months or use a superseded
# deadline after a later extension has been recorded.
def is_after_observation_deadline(observation):
    try:
        report_date = date.fromisoformat(observation["reportMonth"] + "-01")
        deadline = date.fromisoformat(observation["revisedDoc"])
        return report_date > deadline
    except (KeyError, TypeError, ValueError):
        return False


post_deadline_outcomes = []

for case in results:
    trajectory, _ = case_trajectory(case)

    progress_after_deadline = [
        observation["physicalProgress"]
        for observation in trajectory
        if (
            observation.get("physicalProgress") is not None
            and is_after_observation_deadline(observation)
        )
    ]

    if not progress_after_deadline:
        continue

    post_deadline_outcomes.append({
        "eventuallyCompletedAfterDeadline": any(
            progress == 100 for progress in progress_after_deadline
        ),
        "latestProgressAfterDeadline": progress_after_deadline[-1],
    })


post_deadline_outcomes_df = pd.DataFrame(post_deadline_outcomes)

print("\nPhysical progress after the applicable revised deadline passed:")
print("Cases with post-deadline progress data:", len(post_deadline_outcomes_df))
print(
    "Reached 100% after deadline:",
    int(post_deadline_outcomes_df["eventuallyCompletedAfterDeadline"].sum()),
)
print(
    "Still below 100% after deadline:",
    int((~post_deadline_outcomes_df["eventuallyCompletedAfterDeadline"]).sum()),
)
print(
    "Latest post-deadline progress (mean / median): {:.2f}% / {:.2f}%".format(
        post_deadline_outcomes_df["latestProgressAfterDeadline"].mean(),
        post_deadline_outcomes_df["latestProgressAfterDeadline"].median(),
    )
)


# ------------------------------------------------------------
# Exploratory deadline-miss target feasibility
#
# A case is one project under one applicable revised deadline.  An observation
# belongs to a case only when its own report month is after that observation's
# revised deadline; a later revised deadline therefore cannot be evaluated
# against a superseded one.  The outcome uses the latest usable progress among
# those post-deadline observations, or "missing" when none is available.
# ------------------------------------------------------------

def observation_deadline(observation):
    """Return parsed report date and in-force deadline, or None if invalid."""
    try:
        return (
            date.fromisoformat(observation["reportMonth"] + "-01"),
            date.fromisoformat(observation["revisedDoc"]),
        )
    except (KeyError, TypeError, ValueError):
        return None


def usable_progress(observation):
    """Return numeric physical progress, without treating missing values as 0."""
    value = observation.get("physicalProgress")

    if value is None or isinstance(value, bool):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def progress_bucket(progress):
    if progress is None:
        return "missing"
    if progress == 100:
        return "100%"
    if progress >= 90:
        return "90-99.99%"
    if progress >= 75:
        return "75-89.99%"
    return "<75%"


post_deadline_cases = defaultdict(list)
post_deadline_months = []

for canonical_id, project_obs in obs_by_project.items():
    for observation in project_obs:
        dates = observation_deadline(observation)

        if dates is None:
            continue

        report_date, deadline = dates

        if report_date <= deadline:
            continue

        # The normalized deadline is part of the key, keeping separate
        # deadline revisions separate even when their observations interleave.
        case_key = (canonical_id, deadline.isoformat())
        post_deadline_cases[case_key].append(observation)
        post_deadline_months.append(observation["reportMonth"])


deadline_miss_rows = []
projects_with_usable_post_deadline_progress = set()

for (canonical_id, deadline), observations in post_deadline_cases.items():
    latest_usable_progress = None

    # Observations are sorted by reportMonth.  Search backwards to select the
    # latest actual progress value while retaining a missing-only case.
    for observation in reversed(observations):
        progress = usable_progress(observation)
        if progress is not None:
            latest_usable_progress = progress
            projects_with_usable_post_deadline_progress.add(canonical_id)
            break

    deadline_miss_rows.append({
        "canonicalId": canonical_id,
        "deadline": deadline,
        "latestPostDeadlineProgress": latest_usable_progress,
        "progressBucket": progress_bucket(latest_usable_progress),
    })


deadline_miss_df = pd.DataFrame(deadline_miss_rows)
deadline_miss_total = len(deadline_miss_df)
completed_after_deadline = (
    deadline_miss_df["latestPostDeadlineProgress"] == 100
).sum()
below_100_after_deadline = (
    deadline_miss_df["latestPostDeadlineProgress"].notna()
    & (deadline_miss_df["latestPostDeadlineProgress"] < 100)
).sum()
deadline_miss_bucket_order = ["100%", "90-99.99%", "75-89.99%", "<75%", "missing"]
deadline_miss_distribution = (
    deadline_miss_df["progressBucket"]
    .value_counts()
    .reindex(deadline_miss_bucket_order, fill_value=0)
    .to_frame("Cases")
)
deadline_miss_distribution["Percentage"] = (
    deadline_miss_distribution["Cases"] / deadline_miss_total * 100
    if deadline_miss_total
    else 0
)

print("\nDeadline-miss target feasibility (exploratory):")
print("Post-deadline project/deadline cases:", deadline_miss_total)
print("Post-deadline observations represented:", len(post_deadline_months))
print(
    "Reached 100%:",
    f"{completed_after_deadline} "
    f"({completed_after_deadline / deadline_miss_total:.1%})"
    if deadline_miss_total else "0 (n/a)",
)
print(
    "Below 100%:",
    f"{below_100_after_deadline} "
    f"({below_100_after_deadline / deadline_miss_total:.1%})"
    if deadline_miss_total else "0 (n/a)",
)
print(
    "Projects with usable post-deadline progress:",
    len(projects_with_usable_post_deadline_progress),
)
print(
    "Report months represented:",
    f"{min(post_deadline_months)} to {max(post_deadline_months)}"
    if post_deadline_months else "none",
)
print("\nLatest usable post-deadline physical progress:")
print(
    deadline_miss_distribution.to_string(
        formatters={"Percentage": "{:.1f}%".format},
    )
)


# ------------------------------------------------------------
# Eventual deadline-miss target feasibility with censoring
#
# Each case begins at the first observation for a revised deadline.  Its
# outcome can use only later observations while that same deadline is still
# in force.  A revision before outcome evidence is available therefore leaves
# the old-deadline case censored instead of reusing a superseded deadline.
# ------------------------------------------------------------

def deadline_distance_bucket(days_until_deadline):
    if days_until_deadline > 180:
        return ">180 days"
    if days_until_deadline >= 91:
        return "91-180 days"
    if days_until_deadline >= 61:
        return "61-90 days"
    if days_until_deadline >= 31:
        return "31-60 days"
    if days_until_deadline >= 1:
        return "1-30 days"
    return "deadline already passed"


deadline_case_rows = []

for canonical_id, project_obs in obs_by_project.items():
    current_case = None

    for observation in project_obs:
        dates = observation_deadline(observation)

        # A missing or invalid deadline cannot establish a prediction case or
        # safely provide post-deadline evidence for an existing one.
        if dates is None:
            if current_case is not None:
                current_case["observations"].append(observation)
            continue

        report_date, deadline = dates

        if current_case is None or deadline != current_case["deadline"]:
            if current_case is not None:
                deadline_case_rows.append(current_case)

            current_case = {
                "canonicalId": canonical_id,
                "deadline": deadline,
                "predictionMonth": observation["reportMonth"],
                "predictionDate": report_date,
                "observations": [observation],
            }
        else:
            current_case["observations"].append(observation)

    if current_case is not None:
        deadline_case_rows.append(current_case)


deadline_target_rows = []

for case in deadline_case_rows:
    # The first row is the prediction-time observation.  Only later rows may
    # establish the target, preventing future progress from becoming a feature.
    future_post_deadline_progress = []

    for observation in case["observations"][1:]:
        dates = observation_deadline(observation)

        if dates is None:
            continue

        report_date, observation_deadline_date = dates

        if (
            observation_deadline_date == case["deadline"]
            and report_date > case["deadline"]
        ):
            progress = usable_progress(observation)
            if progress is not None:
                future_post_deadline_progress.append(progress)

    if future_post_deadline_progress:
        # Reaching 100% in any available post-deadline observation means the
        # case is not a miss; otherwise the known case is a miss.
        missed = not any(progress == 100 for progress in future_post_deadline_progress)
        outcome = "missed" if missed else "not missed"
    else:
        missed = None
        outcome = "censored/unknown"

    days_until_deadline = (case["deadline"] - case["predictionDate"]).days

    deadline_target_rows.append({
        "canonicalId": case["canonicalId"],
        "predictionMonth": case["predictionMonth"],
        "daysUntilDeadline": days_until_deadline,
        "distanceBucket": deadline_distance_bucket(days_until_deadline),
        "outcome": outcome,
        "missed": missed,
    })


deadline_target_df = pd.DataFrame(deadline_target_rows)
known_target_df = deadline_target_df[deadline_target_df["missed"].notna()].copy()
total_target_cases = len(deadline_target_df)
known_target_cases = len(known_target_df)
censored_target_cases = total_target_cases - known_target_cases
missed_target_cases = int(known_target_df["missed"].sum())
not_missed_target_cases = known_target_cases - missed_target_cases

target_bucket_order = [
    ">180 days",
    "91-180 days",
    "61-90 days",
    "31-60 days",
    "1-30 days",
    "deadline already passed",
]
target_bucket_rows = []

for bucket in target_bucket_order:
    bucket_cases = deadline_target_df[
        deadline_target_df["distanceBucket"] == bucket
    ]
    bucket_known = bucket_cases[bucket_cases["missed"].notna()]
    bucket_missed = int(bucket_known["missed"].sum())

    target_bucket_rows.append({
        "Prediction distance": bucket,
        "Total cases": len(bucket_cases),
        "Known outcomes": len(bucket_known),
        "Censored cases": len(bucket_cases) - len(bucket_known),
        "Miss count": bucket_missed,
        "Non-miss count": len(bucket_known) - bucket_missed,
        "Miss rate among known": (
            bucket_missed / len(bucket_known)
            if len(bucket_known)
            else None
        ),
    })


target_bucket_summary = pd.DataFrame(target_bucket_rows)


def format_known_miss_rate(value):
    return "n/a" if pd.isna(value) else f"{value:.1%}"


print("\nEventual deadline-miss target feasibility (censoring-aware):")
print("Total project/deadline cases:", total_target_cases)
print("Known outcome cases:", known_target_cases)
print("Censored/unknown cases:", censored_target_cases)
print(
    "Known outcome percentage:",
    f"{known_target_cases / total_target_cases:.1%}"
    if total_target_cases else "n/a",
)
print("\nAmong known outcome cases:")
print("Deadline missed:", missed_target_cases)
print("Deadline not missed:", not_missed_target_cases)
print(
    "Miss rate:",
    f"{missed_target_cases / known_target_cases:.1%}"
    if known_target_cases else "n/a",
)
print("\nOutcome availability by prediction-time distance to deadline:")
print(
    target_bucket_summary.to_string(
        index=False,
        na_rep="n/a",
        formatters={"Miss rate among known": format_known_miss_rate},
    )
)
print(
    "\nPrediction months represented in known cases:",
    f"{known_target_df['predictionMonth'].min()} to "
    f"{known_target_df['predictionMonth'].max()}"
    if known_target_cases else "none",
)
