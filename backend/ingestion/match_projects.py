"""Match monthly PAIMANA observations into stable project identities.

Priority: pmgId > projectCode > legacyOcmsCode.

Conflicts are reported rather than silently merged when two different
entities would be joined, or when the same identifier appears twice in
one month.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Optional

MONTH_ORDER = ["2026-04", "2026-05", "2026-06", "2026-07"]


def _ids(clean: dict[str, Any]) -> dict[str, Optional[str]]:
    return {
        "pmgId": clean.get("pmgId"),
        "projectCode": clean.get("projectCode"),
        "legacyOcmsCode": clean.get("legacyOcmsCode"),
    }


def _next_entity_id(n: int) -> str:
    return f"P{n:05d}"


class ProjectMatcher:
    def __init__(self) -> None:
        self.entities: dict[str, dict[str, Any]] = {}
        self.index = {
            "pmgId": {},
            "projectCode": {},
            "legacyOcmsCode": {},
        }
        self.conflicts: list[dict[str, Any]] = []
        self.unmatched: list[dict[str, Any]] = []
        self.duplicates: list[dict[str, Any]] = []
        self.identifier_changes: list[dict[str, Any]] = []
        self._counter = 0

    def _create_entity(self, clean: dict[str, Any], match_method: str) -> str:
        self._counter += 1
        entity_id = _next_entity_id(self._counter)
        ids = _ids(clean)
        self.entities[entity_id] = {
            "canonicalId": entity_id,
            "pmgId": ids["pmgId"],
            "projectCode": ids["projectCode"],
            "legacyOcmsCode": ids["legacyOcmsCode"],
            "seenPmgIds": {ids["pmgId"]} if ids["pmgId"] else set(),
            "seenProjectCodes": {ids["projectCode"]} if ids["projectCode"] else set(),
            "seenLegacyOcmsCodes": {ids["legacyOcmsCode"]} if ids["legacyOcmsCode"] else set(),
            "matchMethod": match_method,
            "observations": [],
        }
        self._index_entity(entity_id, ids)
        return entity_id

    def _index_entity(self, entity_id: str, ids: dict[str, Optional[str]]) -> None:
        for field, value in ids.items():
            if not value:
                continue
            existing = self.index[field].get(value)
            if existing and existing != entity_id:
                self.conflicts.append(
                    {
                        "type": "index_collision",
                        "field": field,
                        "value": value,
                        "entities": [existing, entity_id],
                    }
                )
                continue
            self.index[field][value] = entity_id

    def _primary_method(self, ids: dict[str, Optional[str]]) -> Optional[str]:
        if ids["pmgId"]:
            return "pmgId"
        if ids["projectCode"]:
            return "projectCode"
        if ids["legacyOcmsCode"]:
            return "legacyOcmsCode"
        return None

    def add_observation(self, observation: dict[str, Any]) -> Optional[str]:
        clean = observation["clean"]
        ids = _ids(clean)
        method = self._primary_method(ids)
        if method is None:
            self.unmatched.append(
                {
                    "reason": "no_identifiers",
                    "reportMonth": clean.get("reportMonth"),
                    "projectName": clean.get("projectName"),
                    "sourcePage": clean.get("sourcePage"),
                }
            )
            return None

        primary_value = ids[method]
        entity_id = self.index[method].get(primary_value)

        foreign_hits = {}
        for field, value in ids.items():
            if not value:
                continue
            owner = self.index[field].get(value)
            if owner and owner != entity_id:
                foreign_hits[field] = {"value": value, "entity": owner}

        identity_conflicts = {
            field: hit
            for field, hit in foreign_hits.items()
            if field in ("pmgId", "projectCode")
        }
        secondary_conflicts = {
            field: hit
            for field, hit in foreign_hits.items()
            if field not in identity_conflicts
        }

        if entity_id and identity_conflicts:
            self.conflicts.append(
                {
                    "type": "conflicting_identifiers",
                    "matchedBy": method,
                    "ids": ids,
                    "entity": entity_id,
                    "foreignHits": identity_conflicts,
                    "reportMonth": clean.get("reportMonth"),
                    "projectName": clean.get("projectName"),
                    "sourcePage": clean.get("sourcePage"),
                }
            )
            self.unmatched.append(
                {
                    "reason": "conflicting_identifiers",
                    "matchedBy": method,
                    "ids": ids,
                    "entity": entity_id,
                    "foreignHits": identity_conflicts,
                    "reportMonth": clean.get("reportMonth"),
                    "projectName": clean.get("projectName"),
                    "observation": observation,
                }
            )
            return None

        for field, hit in secondary_conflicts.items():
            self.conflicts.append(
                {
                    "type": "shared_secondary_identifier",
                    "field": field,
                    "value": hit["value"],
                    "existingEntity": hit["entity"],
                    "matchedEntity": entity_id,
                    "matchedBy": method,
                    "ids": ids,
                    "reportMonth": clean.get("reportMonth"),
                    "projectName": clean.get("projectName"),
                }
            )

        if entity_id is None:
            entity_id = self._create_entity(clean, method)
            entity = self.entities[entity_id]
            tagged = {
                **observation,
                "match": {
                    "canonicalId": entity_id,
                    "method": method,
                    "status": "new",
                },
            }
            entity["observations"].append(tagged)
            return entity_id

        entity = self.entities[entity_id]
        self._record_identifier_drift(entity, ids, clean)
        self._merge_identifiers(entity_id, ids)

        month = clean.get("reportMonth")
        already = [obs for obs in entity["observations"] if obs["clean"]["reportMonth"] == month]
        if already:
            self.duplicates.append(
                {
                    "canonicalId": entity_id,
                    "reportMonth": month,
                    "ids": ids,
                    "projectName": clean.get("projectName"),
                    "existingSerial": already[0]["clean"].get("serialNumber"),
                    "newSerial": clean.get("serialNumber"),
                }
            )

        tagged = {
            **observation,
            "match": {
                "canonicalId": entity_id,
                "method": method,
                "status": "duplicate_month" if already else "matched",
            },
        }
        entity["observations"].append(tagged)
        return entity_id

    def _record_identifier_drift(
        self, entity: dict[str, Any], ids: dict[str, Optional[str]], clean: dict[str, Any]
    ) -> None:
        checks = (
            ("pmgId", "seenPmgIds"),
            ("projectCode", "seenProjectCodes"),
            ("legacyOcmsCode", "seenLegacyOcmsCodes"),
        )
        for field, seen_key in checks:
            value = ids[field]
            if not value:
                continue
            seen = entity[seen_key]
            if seen and value not in seen:
                self.identifier_changes.append(
                    {
                        "canonicalId": entity["canonicalId"],
                        "field": field,
                        "previous": sorted(seen),
                        "new": value,
                        "reportMonth": clean.get("reportMonth"),
                        "projectName": clean.get("projectName"),
                    }
                )

    def _merge_identifiers(self, entity_id: str, ids: dict[str, Optional[str]]) -> None:
        entity = self.entities[entity_id]
        if ids["pmgId"]:
            entity["seenPmgIds"].add(ids["pmgId"])
            if entity["pmgId"] is None:
                entity["pmgId"] = ids["pmgId"]
        if ids["projectCode"]:
            entity["seenProjectCodes"].add(ids["projectCode"])
            if entity["projectCode"] is None:
                entity["projectCode"] = ids["projectCode"]
        if ids["legacyOcmsCode"]:
            entity["seenLegacyOcmsCodes"].add(ids["legacyOcmsCode"])
            if entity["legacyOcmsCode"] is None:
                entity["legacyOcmsCode"] = ids["legacyOcmsCode"]
        self._index_entity(entity_id, ids)

    def to_projects(self) -> list[dict[str, Any]]:
        projects = []
        for entity in self.entities.values():
            months = sorted(
                {obs["clean"]["reportMonth"] for obs in entity["observations"]}
            )
            names = [
                obs["clean"]["projectName"]
                for obs in entity["observations"]
                if obs["clean"].get("projectName")
            ]
            projects.append(
                {
                    "canonicalId": entity["canonicalId"],
                    "pmgId": entity["pmgId"],
                    "projectCode": entity["projectCode"],
                    "legacyOcmsCode": entity["legacyOcmsCode"],
                    "projectName": names[-1] if names else None,
                    "monthsPresent": months,
                    "observationCount": len(entity["observations"]),
                    "observations": [
                        {
                            "match": obs["match"],
                            "raw": obs["raw"],
                            "clean": obs["clean"],
                        }
                        for obs in sorted(
                            entity["observations"],
                            key=lambda o: o["clean"]["reportMonth"] or "",
                        )
                    ],
                }
            )
        projects.sort(key=lambda p: p["canonicalId"])
        return projects


def match_monthly_observations(
    monthly: list[tuple[str, list[dict[str, Any]]]]
) -> dict[str, Any]:
    matcher = ProjectMatcher()
    month_counts = {}
    for month, observations in monthly:
        month_counts[month] = len(observations)
        for observation in observations:
            matcher.add_observation(observation)

    projects = matcher.to_projects()
    return {
        "projects": projects,
        "unmatched": matcher.unmatched,
        "conflicts": matcher.conflicts,
        "duplicates": matcher.duplicates,
        "identifierChanges": matcher.identifier_changes,
        "monthCounts": month_counts,
    }


def coverage_sets(projects: list[dict[str, Any]]) -> dict[str, Any]:
    by_month = defaultdict(set)
    for project in projects:
        for month in project["monthsPresent"]:
            by_month[month].add(project["canonicalId"])

    all_months = [m for m in MONTH_ORDER if m in by_month]
    matched_all = set.intersection(*(by_month[m] for m in all_months)) if all_months else set()
    only_one = {
        project["canonicalId"]
        for project in projects
        if len(project["monthsPresent"]) == 1
    }

    first_seen = defaultdict(list)
    missing_later = []
    for project in projects:
        months = project["monthsPresent"]
        if not months:
            continue
        first = min(months)
        first_seen[first].append(project["canonicalId"])
        if not months:
            continue
        start = MONTH_ORDER.index(first) if first in MONTH_ORDER else 0
        for later in MONTH_ORDER[start + 1 :]:
            if later not in months and later in by_month:
                missing_later.append(
                    {
                        "canonicalId": project["canonicalId"],
                        "pmgId": project["pmgId"],
                        "projectCode": project["projectCode"],
                        "missingMonth": later,
                        "lastSeen": max(m for m in months if m < later) if any(m < later for m in months) else None,
                    }
                )
                break

    return {
        "byMonth": {month: len(ids) for month, ids in by_month.items()},
        "matchedAcrossAllMonths": len(matched_all),
        "matchedAcrossAllMonthIds": sorted(matched_all),
        "onlyOneMonth": len(only_one),
        "firstSeenByMonth": {month: len(ids) for month, ids in first_seen.items()},
        "missingFromALaterReport": missing_later,
    }
