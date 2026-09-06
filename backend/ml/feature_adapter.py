from __future__ import annotations

from collections.abc import Mapping
from typing import Any


def flatten_model_features(
    features: Mapping[str, Any],
) -> dict[str, Any]:
    """
    Convert project features into the flat feature representation
    expected by the trained model.

    Supports two representations:

    1. Nested monthwise features:

        {
            "progress": {...},
            "schedule": {...},
            "financial": {...},
        }

    2. Already-flat features:

        {
            "currentProgress": ...,
            "progressDelta": ...,
            ...
        }

    Already-flat mappings are returned unchanged so existing callers
    and SHAP tests remain compatible.
    """

    # --------------------------------------------------
    # Nested monthwise representation
    # --------------------------------------------------

    if (
        "progress" in features
        and "schedule" in features
        and "financial" in features
    ):
        return {
            "currentProgress": features["progress"][
                "currentProgress"
            ],
            "progressDelta": features["progress"][
                "progressDelta"
            ],
            "recentProgressVelocity": features["progress"][
                "recentProgressVelocity"
            ],
            "remainingProgress": features["schedule"][
                "remainingProgress"
            ],
            "remainingDays": features["schedule"][
                "remainingDays"
            ],
            "remainingMonths": features["schedule"][
                "remainingMonths"
            ],
            "observedVelocity": features["schedule"][
                "observedVelocity"
            ],
            "requiredVelocity": features["schedule"][
                "requiredVelocity"
            ],
            "velocityGap": features["schedule"][
                "velocityGap"
            ],
            "velocityRatio": features["schedule"][
                "velocityRatio"
            ],
            "costIncrease": features["financial"][
                "costIncrease"
            ],
            "costIncreasePercent": features["financial"][
                "costIncreasePercent"
            ],
            "costRatio": features["financial"][
                "costRatio"
            ],
            "expenditureRatio": features["financial"][
                "expenditureRatio"
            ],
            "expenditureChange": features["financial"][
                "expenditureChange"
            ],
            "expenditurePerProgress": features["financial"][
                "expenditurePerProgress"
            ],
            "trajectory": features["progress"][
                "trajectory"
            ],
            "scheduleState": features["schedule"][
                "scheduleState"
            ],
            "progressCondition": features["financial"][
                "progressCondition"
            ],
        }

    # --------------------------------------------------
    # Already-flat representation
    # --------------------------------------------------

    return dict(features)