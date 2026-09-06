from __future__ import annotations

import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.tree import DecisionTreeClassifier


# ==================================================
# CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "ml" / "artifacts"

TRAINING_DATA_PATH = (
    BASE_DIR
    / "data"
    / "ml"
    / "training_dataset.json"
)


# ==================================================
# DATA LOADING
# ==================================================

def load_training_data(path: Path) -> pd.DataFrame:
    """Load generated training dataset."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return pd.DataFrame(data)


# ==================================================
# FEATURE FLATTENING
# ==================================================

def flatten_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Flatten nested progress, schedule, and financial
    feature dictionaries into one DataFrame.

    Project identifiers are preserved as metadata so
    extreme rows can be traced back to the source project.
    They are removed before ML training.
    """

    flattened_rows = []

    for _, row in df.iterrows():

        flat_row = {
            # Metadata
            "projectCode": row["projectCode"],
            "canonicalId": row["canonicalId"],
            "observationMonth": row["observationMonth"],

            # Target
            "deadlineExtendedNextMonth": row[
                "deadlineExtendedNextMonth"
            ],
        }

        for group in [
            "progress",
            "schedule",
            "financial",
        ]:
            for key, value in row["features"][group].items():
                flat_row[key] = value

        flattened_rows.append(flat_row)

    return pd.DataFrame(flattened_rows)


# ==================================================
# X / Y PREPARATION
# ==================================================

def prepare_xy(df: pd.DataFrame):
    """Separate ML features from target and metadata."""

    X = df.drop(
        columns=[
            # Metadata — never used by the model
            "projectCode",
            "canonicalId",
            "observationMonth",

            # Target
            "deadlineExtendedNextMonth",
        ]
    )

    y = df["deadlineExtendedNextMonth"]

    return X, y


# ==================================================
# FEATURE TRANSFORMATIONS
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
# LOAD + FLATTEN DATA
# ==================================================

df = load_training_data(
    TRAINING_DATA_PATH
)

df = flatten_features(df)


# ==================================================
# TRACE EXTREME RATIO VALUES TO RAW INPUTS
# ==================================================

# velocityRatio = requiredVelocity / observedVelocity
ratio_df = df[["projectCode", "observationMonth", "velocityRatio", "requiredVelocity", "observedVelocity", "remainingProgress", "remainingMonths", "remainingDays"]].copy()
ratio_df["abs_ratio"] = ratio_df["velocityRatio"].abs()
ratio_df = ratio_df.sort_values("abs_ratio", ascending=False).head(5)

# expenditureRatio = cumulativeExpenditure / revisedCost
ratio_df = df[["projectCode", "observationMonth", "expenditureRatio", "costRatio", "costIncrease"]].copy()
ratio_df["abs_ratio"] = ratio_df["expenditureRatio"].abs()
ratio_df = ratio_df.sort_values("abs_ratio", ascending=False).head(5)

# expenditurePerProgress = expenditureChange / progressDelta
ratio_df = df[["projectCode", "observationMonth", "expenditurePerProgress", "expenditureChange", "progressDelta", "progressCondition"]].copy()
ratio_df["abs_ratio"] = ratio_df["expenditurePerProgress"].abs()
ratio_df = ratio_df.sort_values("abs_ratio", ascending=False).head(5)


# ==================================================
# TEMPORAL TRAIN / TEST SPLIT
# ==================================================

train_df = df[
    df["observationMonth"].isin(
        ["2026-04", "2026-05"]
    )
]

test_df = df[
    df["observationMonth"] == "2026-06"
]


X_train, y_train = prepare_xy(
    train_df
)

X_test, y_test = prepare_xy(
    test_df
)


# ==================================================
# FEATURE DEFINITIONS
# ==================================================

numeric_features = [
    "currentProgress",
    "progressDelta",
    "recentProgressVelocity",
    "remainingProgress",
    "remainingDays",
    "remainingMonths",
    "observedVelocity",
    "requiredVelocity",
    "velocityGap",
    "velocityRatio",
    "costIncrease",
    "costIncreasePercent",
    "costRatio",
    "expenditureRatio",
    "expenditureChange",
    "expenditurePerProgress",
]

categorical_features = [
    "trajectory",
    "scheduleState",
    "progressCondition",
]


# ==================================================
# RAW DATA DIAGNOSTICS
# ==================================================

numeric_train = X_train[numeric_features]


# ==================================================
# APPLY SKEWED-FEATURE TRANSFORMATIONS
# ==================================================
X_train_raw = X_train.copy()
X_train = transform_skewed_features(
    X_train
)

X_test = transform_skewed_features(
    X_test
)


# ==================================================
# PREPROCESSING
# ==================================================

numeric_transformer = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(
                strategy="median"
            ),
        ),
        (
            "scaler",
            StandardScaler(),
        ),
    ]
)


categorical_transformer = OneHotEncoder(
    handle_unknown="ignore"
)


preprocessor = ColumnTransformer(
    transformers=[
        (
            "num",
            numeric_transformer,
            numeric_features,
        ),
        (
            "cat",
            categorical_transformer,
            categorical_features,
        ),
    ]
)


# ==================================================
# FIT PREPROCESSOR ONLY ON TRAINING DATA
# ==================================================

preprocessor.fit(
    X_train
)


X_train_processed = preprocessor.transform(
    X_train
)

X_test_processed = preprocessor.transform(
    X_test
)


# ==================================================
# PROCESSED DATA DIAGNOSTICS
# ==================================================

processed = (
    X_train_processed.toarray()
    if hasattr(
        X_train_processed,
        "toarray",
    )
    else X_train_processed
)


feature_names = (
    preprocessor
    .get_feature_names_out()
)

max_values = np.max(
    np.abs(processed),
    axis=0,
)


# ==================================================
# FIND MOST EXTREME VALUE
# ==================================================

max_position = np.unravel_index(
    np.abs(processed).argmax(),
    processed.shape,
)

row_position = max_position[0]

feature_position = max_position[1]


# ==================================================
# ORIGINAL FLATTENED ROW
# ==================================================

original_index = X_train.index[
    row_position
]


# ==================================================
# LOGISTIC REGRESSION
# ==================================================

model = LogisticRegression(
    class_weight="balanced",
    max_iter=1000,
    solver="liblinear",
)

model.fit(X_train_processed, y_train)

# Inspect Logistic Regression coefficients
feature_names = preprocessor.get_feature_names_out()
coefficients = model.coef_[0]

feature_coefficients = list(zip(feature_names, coefficients))
feature_coefficients.sort(key=lambda x: x[1])


from sklearn.metrics import (
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
)

y_pred = model.predict(X_test_processed)

y_probability = model.predict_proba(
    X_test_processed
)[:, 1]

confusion = confusion_matrix(
    y_test,
    y_pred,
)

precision = precision_score(
    y_test,
    y_pred,
)

recall = recall_score(
    y_test,
    y_pred,
)

f1 = f1_score(
    y_test,
    y_pred,
)

roc_auc = roc_auc_score(
    y_test,
    y_probability,
)

pr_auc = average_precision_score(
    y_test,
    y_probability,
)



"""
TN
FP
FN
TP
Precision
Recall
"""
thresholds = [round(value, 2) for value in np.arange(0.10, 0.91, 0.05)]

for threshold in thresholds:
    y_pred = (y_probability >= threshold).astype(int)

    precision = precision_score(
        y_test,
        y_pred,
    )

    recall = recall_score(
        y_test,
        y_pred,
    )

    f1 = f1_score(
        y_test,
        y_pred,
    )

    cm = confusion_matrix(
        y_test,
        y_pred,
    )

    tn, fp, fn, tp = cm.ravel()


# ==================================================
# TREE-BASED BASELINES
# ==================================================

tree_models = {
    "Decision Tree": DecisionTreeClassifier(
        class_weight="balanced",
        max_depth=5,
        random_state=42,
    ),
    "Random Forest": RandomForestClassifier(
        class_weight="balanced",
        max_depth=8,
        n_estimators=300,
        n_jobs=-1,
        random_state=42,
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        learning_rate=0.05,
        max_depth=3,
        n_estimators=100,
        random_state=42,
    ),
}

model_results = {
    "Logistic Regression": {
        "confusion": confusion,
        "precision": precision_score(y_test, model.predict(X_test_processed)),
        "recall": recall_score(y_test, model.predict(X_test_processed)),
        "f1": f1_score(y_test, model.predict(X_test_processed)),
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "probability": y_probability,
    }
}


def evaluate_classifier(name, classifier):
    classifier.fit(X_train_processed, y_train)
    predictions = classifier.predict(X_test_processed)
    probabilities = classifier.predict_proba(X_test_processed)[:, 1]
    cm = confusion_matrix(y_test, predictions)

    result = {
        "confusion": cm,
        "precision": precision_score(y_test, predictions),
        "recall": recall_score(y_test, predictions),
        "f1": f1_score(y_test, predictions),
        "roc_auc": roc_auc_score(y_test, probabilities),
        "pr_auc": average_precision_score(y_test, probabilities),
        "probability": probabilities,
    }
    model_results[name] = result

    for threshold in thresholds:
        threshold_predictions = (probabilities >= threshold).astype(int)
        threshold_cm = confusion_matrix(y_test, threshold_predictions)


for model_name, classifier in tree_models.items():
    evaluate_classifier(model_name, classifier)

# Save the trained preprocessor and the best model
joblib.dump(preprocessor, ARTIFACTS_DIR / "preprocessor.joblib")
joblib.dump(tree_models["Gradient Boosting"], ARTIFACTS_DIR / "model.joblib")

# ==================================================
# RULE-BASED COMPARISON ON JUNE TEST PERIOD
# ==================================================

rule_test_df = test_df.copy()
rule_target = y_test
rule_masks = {
    "Rule 2": (
        rule_test_df["currentProgress"].ge(75)
        & rule_test_df["remainingDays"].le(60)
    ),
    "Rule 5": (
        rule_test_df["currentProgress"].ge(90)
        & rule_test_df["remainingDays"].le(60)
        & rule_test_df["scheduleState"].isin(
            ["stalled", "insufficient_observed_velocity", "behind"]
        )
    ),
}

rule_results = {}
for rule_name, rule_mask in rule_masks.items():
    rule_predictions = rule_mask.fillna(False).astype(int).to_numpy()
    rule_cm = confusion_matrix(rule_target, rule_predictions)
    rule_results[rule_name] = {
        "confusion": rule_cm,
        "precision": precision_score(rule_target, rule_predictions),
        "recall": recall_score(rule_target, rule_predictions),
        "f1": f1_score(rule_target, rule_predictions),
        "fp": int(rule_cm[0, 1]),
        "fn": int(rule_cm[1, 0]),
    }


# ==================================================
# MODEL COMPARISON
# ==================================================

# ==================================================
# TEMPORAL VALIDATION
# ==================================================

temporal_experiments = [
    ("2026-05", ["2026-04"]),
    ("2026-06", ["2026-04", "2026-05"]),
    ("2026-07", ["2026-04", "2026-05", "2026-06"]),
]


def create_temporal_models():
    return {
        "Logistic Regression": LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            solver="liblinear",
        ),
        "Decision Tree": DecisionTreeClassifier(
            class_weight="balanced",
            max_depth=5,
            random_state=42,
        ),
        "Random Forest": RandomForestClassifier(
            class_weight="balanced",
            max_depth=8,
            n_estimators=300,
            n_jobs=-1,
            random_state=42,
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            learning_rate=0.05,
            max_depth=3,
            n_estimators=100,
            random_state=42,
        ),
    }


temporal_thresholds = {
    "Logistic Regression": [0.50],
    "Decision Tree": [0.50, 0.60],
    "Random Forest": [0.50],
    "Gradient Boosting": [0.35, 0.40, 0.50],
}


def temporal_preprocessor():
    return ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_features,
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore"),
                categorical_features,
            ),
        ]
    )


def print_temporal_metrics(
    test_month,
    model_name,
    probabilities,
    actual,
    threshold,
):
    predictions = (probabilities >= threshold).astype(int)
    cm = confusion_matrix(actual, predictions)
    tn, fp, fn, tp = cm.ravel()
    precision = precision_score(actual, predictions, zero_division=0)
    recall = recall_score(actual, predictions, zero_division=0)
    f1 = f1_score(actual, predictions, zero_division=0)

    print(
        f"{test_month} | {model_name} | threshold={threshold:.2f} | "
        f"cm=[[{tn}, {fp}], [{fn}, {tp}]] | "
        f"precision={precision:.4f} | recall={recall:.4f} | f1={f1:.4f} | "
        f"roc_auc={roc_auc_score(actual, probabilities):.4f} | "
        f"pr_auc={average_precision_score(actual, probabilities):.4f} | "
        f"FP={fp} | FN={fn} | predicted_positive={int(predictions.sum())} | "
        f"coverage={100 * predictions.mean():.2f}%"
    )


temporal_results = []
for test_month, train_months in temporal_experiments:
    train_temporal = df[df["observationMonth"].isin(train_months)]
    test_temporal = df[df["observationMonth"] == test_month]

    if train_temporal.empty or test_temporal.empty:
        continue

    X_train_temporal, y_train_temporal = prepare_xy(train_temporal)
    X_test_temporal, y_test_temporal = prepare_xy(test_temporal)
    X_train_temporal = transform_skewed_features(X_train_temporal)
    X_test_temporal = transform_skewed_features(X_test_temporal)

    temporal_transformer = temporal_preprocessor()
    X_train_temporal_processed = temporal_transformer.fit_transform(
        X_train_temporal
    )
    X_test_temporal_processed = temporal_transformer.transform(
        X_test_temporal
    )

    for model_name, classifier in create_temporal_models().items():
        classifier.fit(
            X_train_temporal_processed,
            y_train_temporal,
        )
        probabilities = classifier.predict_proba(
            X_test_temporal_processed
        )[:, 1]

        for threshold in temporal_thresholds[model_name]:
            print_temporal_metrics(
                test_month,
                model_name,
                probabilities,
                y_test_temporal,
                threshold,
            )
            temporal_results.append(
                {
                    "test_month": test_month,
                    "model": model_name,
                    "threshold": threshold,
                }
            )