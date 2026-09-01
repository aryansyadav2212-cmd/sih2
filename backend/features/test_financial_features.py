from features.financial_features import financial_features


# def test_progressing():

#     previous = {
#         "cumulativeExpenditure": 100.0,
#         "physicalProgress": 60.0
#     }

#     current = {
#         "cumulativeExpenditure": 110.0,
#         "physicalProgress": 65.0
#     }

#     result = financial_features(current, previous)

#     assert result["expenditureChange"] == 10.0
#     assert result["progressChange"] == 5.0
#     assert result["expenditurePerProgress"] == 2.0
#     assert result["progressCondition"] == "progressing"


# def test_no_progress():

#     previous = {
#         "cumulativeExpenditure": 100.0,
#         "physicalProgress": 60.0
#     }

#     current = {
#         "cumulativeExpenditure": 110.0,
#         "physicalProgress": 60.0
#     }

#     result = financial_features(current, previous)

#     assert result["expenditureChange"] == 10.0
#     assert result["progressChange"] == 0.0
#     assert result["expenditurePerProgress"] is None
#     assert result["progressCondition"] == "no_progress"


# def test_regression():

#     previous = {
#         "cumulativeExpenditure": 100.0,
#         "physicalProgress": 60.0
#     }

#     current = {
#         "cumulativeExpenditure": 110.0,
#         "physicalProgress": 58.0
#     }

#     result = financial_features(current, previous)

#     assert result["expenditureChange"] == 10.0
#     assert result["progressChange"] == -2.0
#     assert result["expenditurePerProgress"] is None
#     assert result["progressCondition"] == "regression"


# def test_first_observation():

#     current = {
#         "cumulativeExpenditure": 100.0,
#         "physicalProgress": 60.0
#     }

#     result = financial_features(current, None)

#     assert result["expenditureChange"] is None
#     assert result["progressChange"] is None
#     assert result["expenditurePerProgress"] is None
#     assert result["progressCondition"] == "insufficient_data"


# def run_tests():

#     test_progressing()
#     test_no_progress()
#     test_regression()
#     test_first_observation()

#     print("All financial feature tests passed!")


# if __name__ == "__main__":
#     run_tests()


import json

with open("data/historical/observations.json", "r", encoding="utf-8") as f:
    observations = json.load(f)


project_observations = []

for observation in observations["observations"]:
    if observation["canonicalId"] == "P00022":
        project_observations.append(observation)


project_observations = sorted(
    project_observations,
    key=lambda observation: observation["reportMonth"]
)


for i in range(len(project_observations)):

    current = project_observations[i]

    if i == 0:
        previous = None
    else:
        previous = project_observations[i - 1]

    result = financial_features(current, previous)

    print(current["reportMonth"], result)