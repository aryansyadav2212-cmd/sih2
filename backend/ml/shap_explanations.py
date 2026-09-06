"""Map local SHAP values from a fitted sklearn pipeline to raw features."""

from __future__ import annotations

from features import feature_pipeline

from collections.abc import Mapping

import numpy as np

from ml.feature_adapter import flatten_model_features

def map_local_shap_values(model, preprocessor, observation, shap_values):
    """Return one local SHAP contribution for each original model feature.

    ``shap_values`` must describe one model output for one transformed
    observation.  Unknown one-hot categories have no corresponding encoded
    column, so their contribution is returned as ``None``.
    """
    values = _one_observation_values(shap_values)
    expected_features = preprocessor.transform(observation_to_frame(observation)).shape[1]
    if len(values) != expected_features:
        raise ValueError(
            f"Expected {expected_features} SHAP values, received {len(values)}."
        )
    if hasattr(model, "n_features_in_") and model.n_features_in_ != expected_features:
        raise ValueError("Model and fitted preprocessor have different feature counts.")

    numeric_transformer, numeric_names = _fitted_transformer(preprocessor, "num")
    encoder, categorical_names = _fitted_transformer(preprocessor, "cat")
    numeric_indices = _output_indices(preprocessor, "num")
    categorical_indices = _output_indices(preprocessor, "cat")
    encoded_names = encoder.get_feature_names_out(categorical_names)

    if len(numeric_names) != len(numeric_indices):
        raise ValueError("Numeric transformer must produce one column per numeric feature.")
    if len(encoded_names) != len(categorical_indices):
        raise ValueError("Categorical encoder output does not match the fitted preprocessor.")

    raw = _raw_values(observation)
    explanations = [
        {
            "feature_name": name,
            "raw_value": raw[name],
            "shap_contribution": float(values[index]),
        }
        for name, index in zip(numeric_names, numeric_indices)
    ]

    offset = 0
    for name, categories in zip(categorical_names, encoder.categories_):
        category_count = len(categories)
        feature_encoded_names = encoded_names[offset : offset + category_count]
        feature_indices = categorical_indices[offset : offset + category_count]
        raw_value = raw[name]
        matches = np.flatnonzero(np.asarray(categories, dtype=object) == raw_value)
        contribution = None
        if len(matches):
            contribution = float(values[feature_indices[matches[0]]])
        explanations.append(
            {
                "feature_name": name,
                "raw_value": raw_value,
                "shap_contribution": contribution,
                "encoded_feature_name": (
                    feature_encoded_names[matches[0]] if len(matches) else None
                ),
            }
        )
        offset += category_count

    return explanations

def observation_to_frame(observation):
    """
    Turn a nested or flat mapping, Series, or one-row DataFrame
    into a one-row frame containing the model features.
    """
    import pandas as pd

    if isinstance(observation, pd.DataFrame):
        if len(observation) != 1:
            raise ValueError(
                "observation must contain exactly one row."
            )

        if "currentProgress" in observation.columns:
            return observation

        observation = observation.iloc[0].to_dict()

    elif isinstance(observation, pd.Series):
        observation = observation.to_dict()

    elif isinstance(observation, Mapping):
        observation = dict(observation)

    else:
        raise TypeError(
            "observation must be a mapping, pandas Series, "
            "or one-row DataFrame."
        )

    model_features = flatten_model_features(observation)

    return pd.DataFrame([model_features])
def _raw_values(observation):
    return observation_to_frame(observation).iloc[0]


def _fitted_transformer(preprocessor, name):
    for transformer_name, transformer, columns in preprocessor.transformers_:
        if transformer_name == name:
            if not isinstance(columns, (list, tuple, np.ndarray)):
                columns = np.asarray(preprocessor.feature_names_in_)[columns].tolist()
            return transformer, list(columns)
    raise ValueError(f"Fitted preprocessor has no {name!r} transformer.")


def _output_indices(preprocessor, name):
    output = preprocessor.output_indices_[name]
    if isinstance(output, slice):
        return np.arange(output.start, output.stop)
    return np.asarray(output)


def _one_observation_values(shap_values):
    values = np.asarray(getattr(shap_values, "values", shap_values))
    values = np.squeeze(values)
    if values.ndim != 1:
        raise ValueError("shap_values must be one-dimensional for one observation/output.")
    return values


def group_shap_contributions(clean_shap):
    """
    Groups SHAP values by meaningful categories.
        """
    GROUPS = {
        "time_pressure": [
            "remainingDays",
            "remainingMonths",
        ],

        "progress_execution": [
            "requiredVelocity",
            "observedVelocity",
            "velocityGap",
            "velocityRatio",
            "currentProgress",
            "progressDelta",
            "recentProgressVelocity",
            "trajectory",
            "scheduleState",
            "progressCondition",
            "remainingProgress"
        ],

        "financial_signals": [
            "costIncrease",
            "costIncreasePercent",
            "costRatio",
            "expenditureRatio",
            "expenditureChange",
            "expenditurePerProgress",
        ],
    }

    result = {}

    for group_name, features in GROUPS.items():
        total = 0

        for feature in features:
            shap_value = clean_shap.get(feature)

            if shap_value is None:
                continue

            total += shap_value

        result[group_name] = total

    return result


def rank_shap_groups(grouped_shap):
    return sorted(
        grouped_shap.items(),
        key=lambda item: abs(item[1]),
        reverse=True
    )


def get_shap_direction(contribution):
    if contribution > 0:
        return "increases"
    elif contribution < 0:
        return "decreases"
    else:
        return "neutral"


def combined_explanation_with_direction(clean_shap):
    grouped_shap = group_shap_contributions(clean_shap)
    ranked_shap = rank_shap_groups(grouped_shap)

    return [
        {
            "group": group,
            "value": value,
            "direction": get_shap_direction(value),
        }
        for group, value in ranked_shap
    ]




def build_time_pressure_reason(contribution, feature_values):
    remaining_days = feature_values.get("remainingDays")

    if remaining_days is None:
        return None

    if remaining_days <= 0:
        message = (
            "The current completion deadline has already passed."
        )
    elif remaining_days <= 30:
        message = (
            f"Only {remaining_days:.0f} days remain before "
            "the current completion deadline."
        )
    elif remaining_days <= 60:
        message = (
            f"Only {remaining_days:.0f} days remain before "
            "the current completion deadline."
        )
    else:
        return None

    return {
        "group": "time_pressure",
        "contribution": contribution,
        "direction": get_shap_direction(contribution),
        "message": message,
    }

##############
def build_progress_execution_reason(contribution, feature_values):
    current_progress = feature_values.get("currentProgress")
    observed_velocity = feature_values.get("observedVelocity")
    required_velocity = feature_values.get("requiredVelocity")
    schedule_state = feature_values.get("scheduleState")

    if schedule_state == "stalled":
        message = (
            "Recent reported progress is currently stalled."
        )

    elif schedule_state == "regressing":
        message = (
            "Recent reported physical progress has declined."
        )

    elif schedule_state == "overdue_incomplete":
        message = (
            "The project is incomplete despite the current "
            "completion deadline having passed."
        )

    elif (
        observed_velocity is not None
        and required_velocity is not None
        and observed_velocity < required_velocity
    ):
        if (
            current_progress is not None
            and current_progress >= 0
            and current_progress <= 100
        ):
            message = (
                f"The project is {current_progress:.1f}% complete, "
                f"but recent progress is {observed_velocity:.2f} "
                f"percentage points/month versus approximately "
                f"{required_velocity:.2f} percentage points/month "
                "required to meet the deadline."
            )
        else:
            message = (
                f"Recent progress is {observed_velocity:.2f} "
                f"percentage points/month versus approximately "
                f"{required_velocity:.2f} percentage points/month "
                "required to meet the deadline."
            )

    elif schedule_state == "behind":
        message = (
            "The current execution pace is behind the pace "
            "required to meet the deadline."
        )

    else:
        return None

    return {
        "group": "progress_execution",
        "contribution": contribution,
        "direction": get_shap_direction(contribution),
        "message": message,
    }
        ###################
def build_financial_reason(contribution, feature_values):
    cost_increase_percent = feature_values.get(
        "costIncreasePercent"
    )
    expenditure_change = feature_values.get(
        "expenditureChange"
    )

    if (
        cost_increase_percent is not None
        and cost_increase_percent > 0
    ):
        message = (
            f"The revised project cost is "
            f"{cost_increase_percent:.1f}% higher than "
            "the original cost."
        )

    elif (
        expenditure_change is not None
        and expenditure_change > 0
    ):
        message = (
            f"Cumulative expenditure increased by "
            f"{expenditure_change:.2f} since the previous "
            "monthly observation."
        )

    else:
        return None

    return {
        "group": "financial_signals",
        "contribution": contribution,
        "direction": get_shap_direction(contribution),
        "message": message,
    }

############
def build_human_readable_reasons(
    clean_shap,
    feature_values,
    max_reasons=3,
):
    grouped_shap = group_shap_contributions(clean_shap)
    ranked_shap = rank_shap_groups(grouped_shap)

    reasons = []

    for group, contribution in ranked_shap:
        if contribution == 0:
            continue

        if group == "time_pressure":
            reason = build_time_pressure_reason(
                contribution,
                feature_values,
            )

        elif group == "progress_execution":
            reason = build_progress_execution_reason(
                contribution,
                feature_values,
            )

        elif group == "financial_signals":
            reason = build_financial_reason(
                contribution,
                feature_values,
            )

        else:
            reason = None

        if reason is not None:
            reasons.append(reason)

        if len(reasons) >= max_reasons:
            break

    return reasons




    #####################################################################

def get_risk_level(probability):
    if probability is None:
        raise ValueError("probability cannot be None")

    if not 0 <= probability <= 1:
        raise ValueError("probability must be between 0 and 1")

    if probability < 0.30:
        return "low"
    elif probability < 0.60:
        return "medium"
    else:
        return "high"


def build_prediction_explanation(
    probability,
    clean_shap,
    feature_values,
    max_reasons=3,
):
    """Build the final project-level prediction explanation."""

    risk_level = get_risk_level(probability)

    reasons = build_human_readable_reasons(
        clean_shap,
        feature_values,
        max_reasons=max_reasons,
    )

    context_features = [
        "currentProgress",
        "remainingProgress",
        "remainingDays",
        "observedVelocity",
        "requiredVelocity",
        "scheduleState",
    ]

    context = {
        feature: feature_values.get(feature)
        for feature in context_features
    }

    return {
        "prediction": {
            "probability": probability,
            "riskLevel": risk_level,
            "target": "deadline_revision_next_month",
        },
        "reasons": reasons,
        "context": context,
    }
