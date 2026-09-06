import datetime
from typing import Optional

from fastapi.testclient import TestClient

from features.monthwise_features import build_monthwise_features
from ml.api import app
from ml.data_loader import load_observations


client = TestClient(app)


def _month_end(month: str) -> datetime.date:
    year, month_num = map(int, month.split("-"))
    if month_num == 12:
        next_month = datetime.date(year + 1, 1, 1)
    else:
        next_month = datetime.date(year, month_num + 1, 1)
    return next_month - datetime.timedelta(days=1)


def _parse_date(value: Optional[str]) -> Optional[datetime.date]:
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _post_predict(project_code: str, prediction_month: str):
    return client.post(
        "/predict",
        json={
            "projectCode": project_code,
            "predictionMonth": prediction_month,
        },
    )


def test_predict_normal_project_returns_prediction():
    response = _post_predict("612786", "2026-06")

    assert response.status_code == 200
    payload = response.json()

    assert payload["prediction"]["target"] == "deadline_revision_next_month"
    assert payload["context"]["deadlineDate"] == "2026-07-01"


def test_predict_missing_revised_doc_returns_prediction_unavailable():
    observations = load_observations()
    current = next(
        obs
        for obs in observations
        if obs.get("projectCode") == "619248"
        and obs.get("reportMonth") == "2026-06"
    )

    assert current.get("originalDoc") is not None
    assert current.get("revisedDoc") is None

    response = _post_predict("619248", "2026-06")

    assert response.status_code == 422
    payload = response.json()

    assert payload["detail"]["code"] == "MISSING_COMPLETION_DEADLINE"
    assert "revisedDoc" in payload["detail"]["message"]


def test_predict_long_horizon_project_still_works():
    response = _post_predict("618886", "2026-06")

    assert response.status_code == 200
    payload = response.json()

    assert payload["prediction"]["target"] == "deadline_revision_next_month"


def test_predict_overdue_project_does_not_break_with_negative_remaining_days():
    observations = load_observations()
    by_code: dict[str, list[dict]] = {}

    for obs in observations:
        code = obs.get("projectCode")
        if not code:
            continue
        by_code.setdefault(code, []).append(obs)

    candidate_code = None
    for code, history in by_code.items():
        current = next(
            (
                obs
                for obs in history
                if obs.get("reportMonth") == "2026-06"
            ),
            None,
        )
        if not current:
            continue
        if current.get("physicalProgress") is None or current.get("physicalProgress") >= 100:
            continue
        revised = _parse_date(current.get("revisedDoc"))
        if revised is None:
            continue
        if revised <= _month_end("2026-06"):
            candidate_code = code
            break

    assert candidate_code is not None

    response = _post_predict(candidate_code, "2026-06")
    assert response.status_code == 200
    payload = response.json()

    assert payload["context"]["remainingDays"] <= 0


def test_predict_handles_missing_numeric_features_until_imputer():
    observations = load_observations()
    by_code: dict[str, list[dict]] = {}

    for obs in observations:
        code = obs.get("projectCode")
        if not code:
            continue
        by_code.setdefault(code, []).append(obs)

    candidate_code = None

    for code, history in by_code.items():
        current = next(
            (
                obs
                for obs in history
                if obs.get("reportMonth") == "2026-06"
            ),
            None,
        )
        if not current or not current.get("revisedDoc"):
            continue

        features = build_monthwise_features(
            history,
            "2026-06",
        )
        if not features:
            continue

        schedule = features.get("schedule") or {}
        if schedule.get("velocityRatio") is None:
            candidate_code = code
            break

    assert candidate_code is not None

    response = _post_predict(candidate_code, "2026-06")
    assert response.status_code == 200
