from progress_trajectory import (
    build_progress_features,
    classify_trajectory,
    interval_features,
    project_trajectory,
)


def _obs(month, progress, code="X"):
    return {
        "canonicalId": "P1",
        "projectCode": code,
        "pmgId": "1",
        "reportMonth": month,
        "physicalProgress": progress,
        "projectName": "Test",
    }


def test_stable_progress():
    rows = [
        _obs("2026-04", 65),
        _obs("2026-05", 70),
        _obs("2026-06", 75),
        _obs("2026-07", 80),
    ]
    result = project_trajectory(rows)
    deltas = [item["monthlyProgressVelocity"] for item in result["intervals"]]
    assert deltas == [5, 5, 5]
    assert result["recentProgressVelocity"] == 5
    assert result["trajectory"] == "stable"


def test_accelerating_progress():
    rows = [
        _obs("2026-04", 10),
        _obs("2026-05", 12),
        _obs("2026-06", 17),
        _obs("2026-07", 25),
    ]
    result = project_trajectory(rows)
    assert [item["progressDelta"] for item in result["intervals"]] == [2, 5, 8]
    assert result["trajectory"] == "accelerating"


def test_decelerating_progress():
    rows = [
        _obs("2026-04", 10),
        _obs("2026-05", 17),
        _obs("2026-06", 21),
        _obs("2026-07", 23),
    ]
    result = project_trajectory(rows)
    assert [item["progressDelta"] for item in result["intervals"]] == [7, 4, 2]
    assert result["trajectory"] == "decelerating"


def test_zero_progress():
    rows = [
        _obs("2026-04", 40),
        _obs("2026-05", 40),
        _obs("2026-06", 40),
        _obs("2026-07", 40),
    ]
    result = project_trajectory(rows)
    assert [item["monthlyProgressVelocity"] for item in result["intervals"]] == [0, 0, 0]
    assert result["recentProgressVelocity"] == 0
    assert result["flags"]["zeroProgress"] is True
    assert result["trajectory"] == "stable"


def test_missing_observation():
    rows = [
        _obs("2026-04", 65),
        _obs("2026-05", 70),
        _obs("2026-07", 80),
    ]
    result = project_trajectory(rows)
    assert result["flags"]["hasGap"] is True
    first, second = result["intervals"]
    assert first["isConsecutiveMonth"] is True
    assert first["monthlyProgressVelocity"] == 5
    assert second["fromMonth"] == "2026-05"
    assert second["toMonth"] == "2026-07"
    assert second["elapsedMonths"] == 2
    assert second["isConsecutiveMonth"] is False
    assert second["monthlyProgressVelocity"] is None
    assert second["progressDelta"] == 10
    assert second["intervalVelocity"] == 5


def test_zero_to_ninety_nine_jump():
    rows = [
        _obs("2026-04", 0),
        _obs("2026-05", 99),
    ]
    result = project_trajectory(rows)
    interval = result["intervals"][0]
    assert interval["progressDelta"] == 99
    assert interval["monthlyProgressVelocity"] == 99
    assert interval["largeJump"] is True
    assert result["progressByMonth"]["2026-04"] == 0
    assert result["progressByMonth"]["2026-05"] == 99


def test_completed_progress_has_no_positive_velocity():
    rows = [
        _obs("2026-04", 100),
        _obs("2026-05", 100),
        _obs("2026-06", 100.4),
    ]
    result = project_trajectory(rows)
    assert [item["monthlyProgressVelocity"] for item in result["intervals"]] == [0, 0]
    assert result["flags"]["at100"] is True
    assert all(
        item["monthlyProgressVelocity"] is not None and item["monthlyProgressVelocity"] <= 0
        for item in result["intervals"]
    )


def test_insufficient_observations():
    single = project_trajectory([_obs("2026-04", 40)])
    assert single["trajectory"] == "insufficient_data"
    assert single["recentProgressVelocity"] is None
    assert single["intervals"] == []

    one_delta = project_trajectory([_obs("2026-04", 40), _obs("2026-05", 45)])
    assert one_delta["trajectory"] == "insufficient_data"
    assert one_delta["recentProgressVelocity"] == 5

    missing_progress = project_trajectory(
        [_obs("2026-04", None), _obs("2026-05", 10), _obs("2026-06", 12)]
    )
    assert missing_progress["intervals"][0]["progressDelta"] is None
    assert missing_progress["intervals"][0]["monthlyProgressVelocity"] is None
    assert classify_trajectory([2]) == "insufficient_data"


def test_build_groups_by_canonical_id():
    observations = [
        _obs("2026-04", 65, "612786"),
        _obs("2026-05", 70, "612786"),
        _obs("2026-06", 75, "612786"),
        _obs("2026-07", 80, "612786"),
        {**_obs("2026-04", 10, "OTHER"), "canonicalId": "P2"},
    ]
    feature_set = build_progress_features(observations)
    assert feature_set["projectCount"] == 2
    kadapa = next(p for p in feature_set["projects"] if p["projectCode"] == "612786")
    assert kadapa["trajectory"] == "stable"
    assert kadapa["recentProgressVelocity"] == 5


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("ok", name)
    print("all tests passed")
