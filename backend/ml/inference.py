from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap

from ml.feature_adapter import flatten_model_features
from ml.shap_explanations import (
    build_prediction_explanation,
    map_local_shap_values,
)


# ==================================================
# CONFIGURATION
# ==================================================

ML_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = ML_DIR / "artifacts"

PREPROCESSOR_PATH = ARTIFACTS_DIR / "preprocessor.joblib"
MODEL_PATH = ARTIFACTS_DIR / "model.joblib"


# ==================================================
# LOAD TRAINED ARTIFACTS
# ==================================================

preprocessor = joblib.load(PREPROCESSOR_PATH)
model = joblib.load(MODEL_PATH)

# Create SHAP explainer once.
explainer = shap.TreeExplainer(model)


# ==================================================
# FEATURE TRANSFORMATION
# ==================================================

def transform_skewed_features(X):
    X = X.copy()

    for column in ["expenditureRatio", "velocityRatio"]:
        X[column] = X[column].apply(
            lambda value: np.log1p(value)
            if pd.notna(value)
            else value
        )

    X["costRatio"] = X["costRatio"].apply(
        lambda value: np.log(value)
        if pd.notna(value) and value > 0
        else value
    )

    return X
# ==================================================
# MODEL INPUT PREPARATION
# ==================================================


def prepare_model_input(features):
    """
    Convert one project's nested monthwise feature dictionary
    into the exact transformed representation expected by
    the trained model.

    Pipeline:

        nested monthwise features
                ↓
        flatten_model_features()
                ↓
        pandas DataFrame
                ↓
        skewed-feature transformations
                ↓
        fitted preprocessor
                ↓
        model input
    """

    model_features = flatten_model_features(
        features
    )

    df = pd.DataFrame([
        model_features
    ])

    transformed_df = transform_skewed_features(
        df
    )

    processed_features = preprocessor.transform(
        transformed_df
    )

    return processed_features


# ==================================================
# PREDICTION
# ==================================================


def predict_deadline_revision(features):
    """
    Predict the probability that the project's
    completion deadline will be revised in the next month.
    """

    processed_features = prepare_model_input(
        features
    )

    probability = model.predict_proba(
        processed_features
    )[0, 1]

    return float(probability)


# ==================================================
# RISK LEVEL
# ==================================================


def get_risk_level(probability):
    """
    Convert the predicted probability into a product-level
    risk category.

    These thresholds are initial product thresholds and
    should be validated later using calibration and
    business requirements.
    """

    if probability is None:
        raise ValueError(
            "probability cannot be None"
        )

    if not 0 <= probability <= 1:
        raise ValueError(
            "probability must be between 0 and 1"
        )

    if probability < 0.30:
        return "low"

    if probability < 0.60:
        return "medium"

    return "high"


# ==================================================
# COMPLETE PREDICTION
# ==================================================


def predict_project(features):
    """
    Generate the complete prediction and explanation
    for one project.

    Returns:

        {
            "probability": ...,
            "riskLevel": ...,
            "explanation": ...
        }
    """

    # --------------------------------------------------
    # 1. Prepare model input
    # --------------------------------------------------

    processed_features = prepare_model_input(
        features
    )

    # --------------------------------------------------
    # 2. Generate probability
    # --------------------------------------------------

    probability = model.predict_proba(
        processed_features
    )[0, 1]

    probability = float(probability)

    # --------------------------------------------------
    # 3. Convert probability to product risk level
    # --------------------------------------------------

    risk_level = get_risk_level(
        probability
    )

    # --------------------------------------------------
    # 4. Generate SHAP values
    # --------------------------------------------------

    shap_values = explainer.shap_values(
        processed_features
    )

    # --------------------------------------------------
    # 5. Map transformed SHAP values back to
    #    original model features
    # --------------------------------------------------

    mapped_shap = map_local_shap_values(
        model,
        preprocessor,
        features,
        shap_values,
    )

    # --------------------------------------------------
    # 6. Convert SHAP explanation list into dictionary
    # --------------------------------------------------

    clean_shap = {
        item["feature_name"]: item["shap_contribution"]
        for item in mapped_shap
    }

    # --------------------------------------------------
    # 7. Build human-readable explanation
    # --------------------------------------------------

    explanation_features = flatten_model_features(
    features
)

    explanation = build_prediction_explanation(
        probability,
        clean_shap,
        explanation_features,
    )

    return {
        "probability": probability,
        "riskLevel": risk_level,
        "explanation": explanation,
    }


# ==================================================
# BASIC PREDICTION RESULT
# ==================================================


def build_prediction_result(features):
    """
    Return the basic prediction result without
    explanation/SHAP information.
    """

    probability = predict_deadline_revision(
        features
    )

    risk_level = get_risk_level(
        probability
    )

    return {
        "probability_of_revision": probability,
        "risk_level": risk_level,
    }


# ==================================================
# SHAP EXPLANATION
# ==================================================


def explain_prediction(features):
    """
    Generate a complete explanation for one prediction.

    Pipeline:

        features
            ↓
        prepare_model_input()
            ↓
        fitted preprocessor
            ↓
        SHAP TreeExplainer
            ↓
        transformed SHAP values
            ↓
        map to original 19 features
            ↓
        feature → SHAP dictionary
            ↓
        grouped + human-readable explanation
    """

    # --------------------------------------------------
    # 1. Prepare exactly the same model input used
    #    for prediction.
    # --------------------------------------------------

    processed_features = prepare_model_input(
        features
    )

    # --------------------------------------------------
    # 2. Generate SHAP values in the transformed
    #    feature space.
    # --------------------------------------------------

    shap_values = explainer.shap_values(
        processed_features
    )

    # --------------------------------------------------
    # 3. Map transformed SHAP values back to the
    #    original model features.
    # --------------------------------------------------

    mapped_shap = map_local_shap_values(
        model,
        preprocessor,
        features,
        shap_values,
    )

    # --------------------------------------------------
    # 4. Convert SHAP list into feature → contribution
    #    dictionary.
    # --------------------------------------------------

    clean_shap = {
        item["feature_name"]: item["shap_contribution"]
        for item in mapped_shap
    }

    # --------------------------------------------------
    # 5. Generate prediction probability.
    # --------------------------------------------------

    probability = model.predict_proba(
        processed_features
    )[0, 1]

    probability = float(probability)

    # --------------------------------------------------
    # 6. Build final structured explanation.
    # --------------------------------------------------

    explanation = build_prediction_explanation(
        probability,
        clean_shap,
        features,
    )

    return explanation


# ==================================================
# TEST
# ==================================================


if __name__ == "__main__":

    features = {
        "currentProgress": 75.0,
        "progressDelta": 5.0,
        "recentProgressVelocity": 5.0,
        "trajectory": "stable",
        "remainingProgress": 25.0,
        "remainingDays": 31.0,
        "remainingMonths": 1.0185,
        "observedVelocity": 5.0,
        "requiredVelocity": 24.5464,
        "velocityGap": 19.5464,
        "velocityRatio": 4.9093,
        "scheduleState": "behind",
        "costIncrease": 0.0,
        "costIncreasePercent": 0.0,
        "costRatio": 1.0,
        "expenditureRatio": 0.5777,
        "expenditureChange": 11.0,
        "expenditurePerProgress": 2.2,
        "progressCondition": "progressing",
    }

    print("\nComplete prediction:")

    print(
        predict_project(features)
    )