from datetime import date

from schedule_feasibility import (
    build_schedule_feasibility,
    month_end,
    project_schedule_feasibility,
    velocity_ratio_and_reason,
)


def _observation(**kwargs):
    row = {
        "canonicalId": "P1",
        "projectCode": "AAA",
        "pmgId": "1",
        "projectName": "Test",
        "reportMonth": "2026-07",
        "physicalProgress": 80,
        "revisedDoc": "2026-12-01",
        "originalDoc": "2026-09-01",
    }
    row.update(kwargs)
    return row


def _trajectory(**kwargs):
    row = {
        "canonicalId": "P1",
        "projectCode": "AAA",
        "pmgId": "1",
        "projectName": "Test",
        "recentProgressVelocity": 5.0,
        "recentIntervalCount": 3,
        "trajectory": "stable",
        "intervals": [
            {"monthlyProgressVelocity": 5.0},
            {"monthlyProgressVelocity": 5.0},
            {"monthlyProgressVelocity": 5.0},
        ],
        "flags": {"largeJump": False, "hasGap": False},
    }
    row.update(kwargs)
    return row


def test_completed_project():
    result = project_schedule_feasibility(
        _observation(physicalProgress=100),
        _trajectory(),
    )
    assert result["scheduleState"] == "completed"
    assert result["remainingProgress"] == 0
    assert result["requiredVelocity"] == 0
    assert result["velocityGap"] is None
    assert result["velocityRatio"] is None


def test_on_track_project():
    result = project_schedule_feasibility(
        _observation(physicalProgress=90, revisedDoc="2026-09-01"),
        _trajectory(recentProgressVelocity=20.0),
    )
    assert result["remainingDays"] > 0
    assert result["velocityGap"] < 0
    assert result["scheduleState"] == "on_track"


def test_behind_project():
    result = project_schedule_feasibility(
        _observation(physicalProgress=80, revisedDoc="2026-09-01"),
        _trajectory(recentProgressVelocity=5.0),
    )
    assert result["scheduleState"] == "behind"
    assert result["velocityGap"] > 0


def test_overdue_incomplete():
    result = project_schedule_feasibility(
        _observation(physicalProgress=88, revisedDoc="2026-07-01"),
        _trajectory(recentProgressVelocity=3.0),
    )
    assert result["remainingDays"] == 0
    assert result["requiredVelocity"] is None
    assert result["scheduleState"] == "overdue_incomplete"


def test_no_target_date():
    result = project_schedule_feasibility(
        _observation(revisedDoc=None, originalDoc=None),
        _trajectory(),
    )
    assert result["targetDateType"] == "none"
    assert result["targetDate"] is None
    assert result["scheduleState"] == "no_target"


def test_zero_velocity_stalled():
    result = project_schedule_feasibility(
        _observation(physicalProgress=40, revisedDoc="2027-07-01"),
        _trajectory(recentProgressVelocity=0.0),
    )
    assert result["observedVelocity"] == 0
    assert result["scheduleState"] == "stalled"
    assert result["velocityRatio"] is None
    assert result["velocityRatioUndefinedReason"] == "observed_velocity_zero"


def test_null_velocity_insufficient_evidence():
    result = project_schedule_feasibility(
        _observation(physicalProgress=40, revisedDoc="2027-07-01"),
        _trajectory(recentProgressVelocity=None, recentIntervalCount=0, intervals=[]),
    )
    assert result["observedVelocity"] is None
    assert result["scheduleState"] == "insufficient_observed_velocity"
    assert result["velocityRatioUndefinedReason"] == "observed_velocity_unavailable"


def test_negative_velocity_regressing():
    result = project_schedule_feasibility(
        _observation(physicalProgress=40, revisedDoc="2027-07-01"),
        _trajectory(recentProgressVelocity=-2.0),
    )
    assert result["observedVelocity"] == -2.0
    assert result["scheduleState"] == "regressing"
    assert result["velocityRatioUndefinedReason"] == "observed_velocity_negative"


def test_revised_preferred_over_original():
    result = project_schedule_feasibility(
        _observation(revisedDoc="2026-12-01", originalDoc="2026-09-01"),
        _trajectory(),
    )
    assert result["targetDateType"] == "revised"
    assert result["targetDate"] == "2026-12-31"


def test_original_fallback():
    result = project_schedule_feasibility(
        _observation(revisedDoc=None, originalDoc="2026-09-01"),
        _trajectory(),
    )
    assert result["targetDateType"] == "original"
    assert result["targetDate"] == "2026-09-30"


def test_missing_target():
    result = project_schedule_feasibility(
        _observation(revisedDoc=None, originalDoc=None, physicalProgress=50),
        _trajectory(),
    )
    assert result["scheduleState"] == "no_target"
    assert result["remainingDays"] is None
    assert result["requiredVelocity"] is None


def test_gap_does_not_use_interval_velocity():
    trajectory = _trajectory(
        recentProgressVelocity=1.35,
        recentIntervalCount=1,
        trajectory="insufficient_data",
        flags={"largeJump": False, "hasGap": True},
        intervals=[
            {"monthlyProgressVelocity": None, "intervalVelocity": 1.74, "gap": True},
            {"monthlyProgressVelocity": 1.35, "intervalVelocity": 1.35, "gap": False},
        ],
    )
    result = project_schedule_feasibility(
        _observation(physicalProgress=15, revisedDoc="2030-07-01"),
        trajectory,
    )
    assert result["observedVelocity"] == 1.35
    assert result["latestConsecutiveMonthlyVelocity"] == 1.35
    assert result["flags"]["hasGap"] is True
    assert result["observedVelocityEvidence"] == "single_interval"
    assert result["observedVelocity"] != 1.74


def test_large_jump_preserved():
    result = project_schedule_feasibility(
        _observation(physicalProgress=48, revisedDoc=None, originalDoc="2022-07-01"),
        _trajectory(
            recentProgressVelocity=14.0,
            flags={"largeJump": True, "hasGap": False},
            intervals=[
                {"monthlyProgressVelocity": 0.0},
                {"monthlyProgressVelocity": 0.0},
                {"monthlyProgressVelocity": 42.0},
            ],
        ),
    )
    assert result["flags"]["largeJump"] is True
    assert result["latestConsecutiveMonthlyVelocity"] == 42.0
    assert result["observedVelocity"] == 14.0


def test_velocity_ratio_positive():
    ratio, reason = velocity_ratio_and_reason(10.0, 5.0)
    assert ratio == 2.0
    assert reason is None


def test_velocity_ratio_zero():
    ratio, reason = velocity_ratio_and_reason(10.0, 0.0)
    assert ratio is None
    assert reason == "observed_velocity_zero"


def test_velocity_ratio_null():
    ratio, reason = velocity_ratio_and_reason(10.0, None)
    assert ratio is None
    assert reason == "observed_velocity_unavailable"


def test_velocity_ratio_negative():
    ratio, reason = velocity_ratio_and_reason(10.0, -1.0)
    assert ratio is None
    assert reason == "observed_velocity_negative"


def test_as_of_date_uses_last_calendar_day():
    result = project_schedule_feasibility(
        _observation(reportMonth="2026-07"),
        _trajectory(),
    )
    assert result["asOfDate"] == "2026-07-31"
    assert month_end("2026-02") == date(2026, 2, 28)
    assert month_end("2028-02-01") == date(2028, 2, 29)


def test_target_date_uses_last_calendar_day():
    result = project_schedule_feasibility(
        _observation(revisedDoc="2026-09-01"),
        _trajectory(),
    )
    assert result["targetDate"] == "2026-09-30"


def test_canonical_id_join_does_not_merge_shared_codes():
    observations = [
        _observation(canonicalId="P00163", projectCode="619051", reportMonth="2026-07", physicalProgress=15, revisedDoc="2030-07-01"),
        _observation(canonicalId="P01982", projectCode="619051", reportMonth="2026-05", physicalProgress=11.45, revisedDoc="2030-09-01"),
    ]
    trajectories = [
        _trajectory(canonicalId="P00163", projectCode="619051", recentProgressVelocity=1.35, recentIntervalCount=1),
        _trajectory(canonicalId="P01982", projectCode="619051", recentProgressVelocity=None, recentIntervalCount=0, intervals=[]),
    ]
    result = build_schedule_feasibility(observations, trajectories)
    by_id = {row["canonicalId"]: row for row in result["projects"]}
    assert set(by_id) == {"P00163", "P01982"}
    assert by_id["P00163"]["asOfMonth"] == "2026-07"
    assert by_id["P00163"]["currentProgress"] == 15
    assert by_id["P00163"]["observedVelocity"] == 1.35
    assert by_id["P01982"]["asOfMonth"] == "2026-05"
    assert by_id["P01982"]["currentProgress"] == 11.45
    assert by_id["P01982"]["observedVelocity"] is None


def _load_real_schedule():
    import json
    from pathlib import Path

    backend = Path(__file__).resolve().parent.parent
    observations = json.loads((backend / "data/historical/observations.json").read_text())["observations"]
    trajectories = json.loads((backend / "data/features/progress_trajectory.json").read_text())["projects"]
    return build_schedule_feasibility(observations, trajectories)


def test_real_named_projects():
    result = _load_real_schedule()
    by_id = {row["canonicalId"]: row for row in result["projects"]}

    kadapa = by_id["P00001"]
    assert kadapa["projectCode"] == "612786"
    assert kadapa["asOfDate"] == "2026-07-31"
    assert kadapa["targetDate"] == "2026-09-30"
    assert kadapa["targetDateType"] == "revised"
    assert kadapa["observedVelocity"] == 5.0
    assert kadapa["scheduleState"] == "behind"

    calicut = by_id["P00014"]
    assert calicut["projectCode"] == "612789"
    assert calicut["scheduleState"] == "behind"

    leh = by_id["P00015"]
    assert leh["projectCode"] == "400010"
    assert leh["asOfDate"] == leh["targetDate"] == "2026-07-31"
    assert leh["scheduleState"] == "overdue_incomplete"

    nabinagar = by_id["P00163"]
    assert nabinagar["projectCode"] == "619051"
    assert nabinagar["flags"]["hasGap"] is True
    assert nabinagar["observedVelocityEvidence"] == "single_interval"
    assert nabinagar["scheduleState"] == "behind"

    suburban = by_id["P00280"]
    assert suburban["projectCode"] == "701745"
    assert suburban["targetDateType"] == "original"
    assert suburban["flags"]["largeJump"] is True
    assert suburban["latestConsecutiveMonthlyVelocity"] == 42.0
    assert suburban["scheduleState"] == "overdue_incomplete"


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("ok", name)
    print("all tests passed")
