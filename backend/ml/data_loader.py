from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any


DEFAULT_OBSERVATIONS_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "historical"
    / "observations.json"
)


def load_observations(
    path: Path = DEFAULT_OBSERVATIONS_PATH,
) -> list[dict[str, Any]]:
    """
    Load raw observations from observations.json.

    The source file is returned without modifying its contents.
    """

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data["observations"]


def group_observations(
    observations: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """
    Group observations by the project's canonical identity.

    canonicalId is preferred when available; projectCode is used
    as the fallback, matching the existing training-data pipeline.

    Each project's observations are sorted chronologically.
    """

    projects: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for observation in observations:
        canonical_id = observation.get("canonicalId")
        project_code = observation.get("projectCode")

        key = canonical_id or project_code

        if not key:
            continue

        projects[key].append(observation)

    for project_observations in projects.values():
        project_observations.sort(
            key=lambda observation: observation["reportMonth"]
        )

    return dict(projects)


def get_project_observations(
    projects: dict[str, list[dict[str, Any]]],
    project_code: str,
) -> list[dict[str, Any]]:
    """
    Find a project's observation history using its external projectCode.

    The grouping dictionary is keyed by canonicalId when available,
    so projectCode cannot necessarily be used directly as a dictionary
    key. This function resolves the projectCode to its corresponding
    grouped project history.
    """

    for project_observations in projects.values():
        for observation in project_observations:
            if observation.get("projectCode") == project_code:
                return project_observations

    return []