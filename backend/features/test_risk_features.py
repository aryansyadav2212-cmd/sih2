import json

from features.risk_feature import schedule_risk_signal


DATA_FILE = "data/features/schedule_feasibility.json"


# ---------------------------------------------------------
# Unit tests
# ---------------------------------------------------------

def test_completed_project():
    schedule = {
        "scheduleState": "completed",
        "velocityRatio": None,
        "remainingProgress": 0,
    }

    result = schedule_risk_signal(schedule)

    assert result == "low"


def test_on_track_project():
    schedule = {
        "scheduleState": "on_track",
        "velocityRatio": 0.8,
        "remainingProgress": 20,
    }

    result = schedule_risk_signal(schedule)

    assert result == "low"


def test_behind_project():
    schedule = {
        "scheduleState": "behind",
        "velocityRatio": 1.5,
        "remainingProgress": 20,
    }

    result = schedule_risk_signal(schedule)

    assert result == "medium"


def test_severely_behind_project():
    schedule = {
        "scheduleState": "behind",
        "velocityRatio": 2.5,
        "remainingProgress": 20,
    }

    result = schedule_risk_signal(schedule)

    assert result == "high"


def test_behind_but_almost_complete():
    schedule = {
        "scheduleState": "behind",
        "velocityRatio": 2.5,
        "remainingProgress": 2,
    }

    result = schedule_risk_signal(schedule)

    assert result == "medium"


def test_overdue_project():
    schedule = {
        "scheduleState": "overdue_incomplete",
        "velocityRatio": None,
        "remainingProgress": 20,
    }

    result = schedule_risk_signal(schedule)

    assert result == "high"


def test_stalled_project():
    schedule = {
        "scheduleState": "stalled",
        "velocityRatio": None,
        "remainingProgress": 40,
    }

    result = schedule_risk_signal(schedule)

    assert result == "high"


def test_regressing_project():
    schedule = {
        "scheduleState": "regressing",
        "velocityRatio": None,
        "remainingProgress": 40,
    }

    result = schedule_risk_signal(schedule)

    assert result == "high"


def test_unknown_state():
    schedule = {
        "scheduleState": "something_new",
        "velocityRatio": None,
        "remainingProgress": None,
    }

    result = schedule_risk_signal(schedule)

    assert result == "medium"


def run_rule_tests():
    test_completed_project()
    test_on_track_project()
    test_behind_project()
    test_severely_behind_project()
    test_behind_but_almost_complete()
    test_overdue_project()
    test_stalled_project()
    test_regressing_project()
    test_unknown_state()

    print("All rule tests passed!")
    print()


# ---------------------------------------------------------
# Real-data analysis
# ---------------------------------------------------------

def analyze_real_projects():

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    projects = data["projects"]

    counts = {
        "high": 0,
        "medium": 0,
        "low": 0,
    }

    behind_high = 0
    behind_medium = 0

    severe_behind = []

    for project in projects:

        risk = schedule_risk_signal(project)

        counts[risk] += 1

        # Count how our rule treats behind projects
        if project.get("scheduleState") == "behind":

            if risk == "high":
                behind_high += 1

            elif risk == "medium":
                behind_medium += 1

        # Collect severely behind projects
        if (
            project.get("scheduleState") == "behind"
            and project.get("velocityRatio") is not None
            and project.get("velocityRatio") > 2
            and project.get("remainingProgress") is not None
            and project.get("remainingProgress") > 5
        ):
            severe_behind.append(project)

    # -----------------------------------------------------
    # Overall risk
    # -----------------------------------------------------

    print("=" * 40)
    print("Schedule Risk Analysis")
    print("=" * 40)

    print(f"High:   {counts['high']}")
    print(f"Medium: {counts['medium']}")
    print(f"Low:    {counts['low']}")
    print(f"Total:  {len(projects)}")

    # -----------------------------------------------------
    # Behind breakdown
    # -----------------------------------------------------

    print()
    print("=" * 40)
    print("Behind Project Breakdown")
    print("=" * 40)

    print(f"Behind → High:   {behind_high}")
    print(f"Behind → Medium: {behind_medium}")

    # -----------------------------------------------------
    # Severe projects
    # -----------------------------------------------------

    print()
    print("=" * 40)
    print("Severely Behind Projects")
    print("=" * 40)

    print(f"Count: {len(severe_behind)}")
    print()

    # Show only first 10
    for project in severe_behind[:10]:

        print("-" * 40)

        print(f"Project ID: {project.get('canonicalId')}")
        print(f"Project: {project.get('projectName')}")
        print(f"Current Progress: {project.get('currentProgress')}")
        print(f"Remaining Progress: {project.get('remainingProgress')}")
        print(f"Target Date: {project.get('targetDate')}")
        print(f"Observed Velocity: {project.get('observedVelocity')}")
        print(f"Required Velocity: {project.get('requiredVelocity')}")
        print(f"Velocity Ratio: {project.get('velocityRatio')}")
        print(f"Trajectory: {project.get('trajectory')}")
        print(f"Schedule State: {project.get('scheduleState')}")


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def main():

    run_rule_tests()

    analyze_real_projects()


if __name__ == "__main__":
    main()