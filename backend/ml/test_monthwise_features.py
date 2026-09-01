import json
from pathlib import Path

from features.monthwise_features import build_monthwise_features


# -----------------------------------------
# Load observations
# -----------------------------------------

path = Path("data/historical/observations.json")

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

observations = data["observations"]


# -----------------------------------------
# Get one project
# -----------------------------------------

project_code = "612786"

project_observations = [
    observation
    for observation in observations
    if observation.get("projectCode") == project_code
]


# -----------------------------------------
# Build features as of June
# -----------------------------------------

features = build_monthwise_features(
    project_observations,
    "2026-06",
)


# -----------------------------------------
# Print important features
# -----------------------------------------

print("=" * 60)
print("MONTHWISE FEATURE TEST")
print("=" * 60)

print("Project:", features["projectCode"])
print("Observation month:", features["observationMonth"])

print("\nPROGRESS")
print("Current progress:", features["progress"]["currentProgress"])
print("Progress delta:", features["progress"]["progressDelta"])
print("Recent velocity:", features["progress"]["recentProgressVelocity"])
print("Trajectory:", features["progress"]["trajectory"])

print("\nSCHEDULE")
print("Remaining progress:", features["schedule"]["remainingProgress"])
print("Remaining days:", features["schedule"]["remainingDays"])
print("Required velocity:", features["schedule"]["requiredVelocity"])
print("Observed velocity:", features["schedule"]["observedVelocity"])
print("Velocity gap:", features["schedule"]["velocityGap"])
print("Velocity ratio:", features["schedule"]["velocityRatio"])
print("Schedule state:", features["schedule"]["scheduleState"])

print("\nFINANCIAL")
print("Cost increase %:", features["financial"]["costIncreasePercent"])
print("Expenditure ratio:", features["financial"]["expenditureRatio"])
print("Expenditure change:", features["financial"]["expenditureChange"])
print("Expenditure change %:", features["financial"]["expenditureChangePercent"])
print("Expenditure per progress:", features["financial"]["expenditurePerProgress"])
print("Progress condition:", features["financial"]["progressCondition"])