from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ml.data_loader import load_observations, group_observations
from features.monthwise_features import build_monthwise_features
from ml.inference import predict_project


app = FastAPI(
    title="PAIMANA ML Service",
    version="1.0.0",
)


# ---------------------------------------------------------
# Load project history once when the service starts
# ---------------------------------------------------------

observations = load_observations()
projects = group_observations(observations)


# ---------------------------------------------------------
# Request schema
# ---------------------------------------------------------

class PredictionRequest(BaseModel):
    projectCode: str = Field(min_length=1)
    predictionMonth: str = Field(
        pattern=r"^\d{4}-\d{2}$"
    )


# ---------------------------------------------------------
# Helper functions
# ---------------------------------------------------------

def get_project_history(
    project_code: str,
) -> list[dict[str, Any]]:
    """
    Resolve a projectCode to its complete observation history.

    data_loader groups primarily by canonicalId, so projectCode
    cannot always be used directly as a dictionary key.
    """
    for history in projects.values():
        for observation in history:
            if observation.get("projectCode") == project_code:
                return history

    return []


def get_exact_observation(
    history: list[dict[str, Any]],
    prediction_month: str,
) -> dict[str, Any] | None:
    """
    Return the observation for exactly the requested month.

    We intentionally do not accept the latest observation before
    the requested month because that could silently produce a
    prediction for the wrong month.
    """
    for observation in history:
        if observation.get("reportMonth") == prediction_month:
            return observation

    return None


def normalize_reasons(
    reasons: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Convert internal Python/SHAP explanation fields into the
    public API contract.
    """
    normalized: list[dict[str, Any]] = []

    for reason in reasons:
        group = reason.get("group")

        if group == "financial_signals":
            group = "financial"

        normalized.append(
            {
                "group": group,
                "direction": reason.get("direction"),
                "message": reason.get("message"),
            }
        )

    return normalized

def build_api_response(
    current_observation,
    prediction_result,
):
    """
    Build the public API response from the current observation
    and the ML prediction result.
    """

    explanation = prediction_result["explanation"]

    prediction = explanation["prediction"]
    reasons = explanation["reasons"]
    context = explanation["context"]

    normalized_reasons = normalize_reasons(
        reasons
    )

    deadline_date = current_observation.get(
        "revisedDoc"
    )

    if not deadline_date:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Prediction unavailable",
                "code": "MISSING_COMPLETION_DEADLINE",
                "message": "Current observation is missing revisedDoc",
            },
        )

    return {
        "project": {
            "projectCode": current_observation.get(
                "projectCode"
            ),
            "projectName": current_observation.get(
                "projectName"
            ),
            "agency": current_observation.get(
                "agency"
            ),
            "state": current_observation.get(
                "state"
            ),
        },
        "prediction": {
            "probability": float(
                prediction["probability"]
            ),
            "riskLevel": prediction["riskLevel"],
            "target": prediction["target"],
        },
        "context": {
            "currentProgress": context[
                "currentProgress"
            ],
            "remainingProgress": context[
                "remainingProgress"
            ],
            "deadlineDate": deadline_date,
            "remainingDays": context[
                "remainingDays"
            ],
            "observedVelocity": context[
                "observedVelocity"
            ],
            "requiredVelocity": context[
                "requiredVelocity"
            ],
            "scheduleState": context[
                "scheduleState"
            ],
        },
        "reasons": normalized_reasons,
    }
# ---------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------

@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "projects": len(projects),
        "observations": len(observations),
    }


# ---------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------

@app.post("/predict")
def predict(request: PredictionRequest) -> dict[str, Any]:

    # 1. Find project history
    history = get_project_history(request.projectCode)

    if not history:
        raise HTTPException(
            status_code=404,
            detail=f"Project {request.projectCode} was not found",
        )

    # 2. Require an exact observation for the requested month
    current_observation = get_exact_observation(
        history,
        request.predictionMonth,
    )

    if current_observation is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No observation found for project "
                f"{request.projectCode} in "
                f"{request.predictionMonth}"
            ),
        )

    if not current_observation.get("revisedDoc"):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Prediction unavailable",
                "code": "MISSING_COMPLETION_DEADLINE",
                "message": "Current observation is missing revisedDoc",
            },
        )

    # 3. Build features using only information available
    #    up to the prediction month.
    features = build_monthwise_features(
        history,
        request.predictionMonth,
    )

    if not features:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unable to build features for project "
                f"{request.projectCode} in "
                f"{request.predictionMonth}"
            ),
        )

    # Defensive check against accidental month mismatch.
    if features.get("observationMonth") != request.predictionMonth:
        raise HTTPException(
            status_code=422,
            detail=(
                "Feature construction returned a different "
                "observation month than requested"
            ),
        )

    # 4. Run ML prediction + SHAP explanation
    try:
        prediction_result = predict_project(features)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"ML prediction failed: {str(error)}",
        ) from error

    # 5. Convert internal result to public API response
    return build_api_response(
        current_observation,
        prediction_result,
    )
