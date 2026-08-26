"""Normalize extracted PAIMANA fields without inventing missing values."""

from __future__ import annotations

import re
from datetime import date
from typing import Any, Optional

from parsers import is_null_token

DATE_FIELDS = (
    "approvalDate",
    "startDate",
    "originalCompletionDate",
    "revisedCompletionDate",
)

NUMERIC_FIELDS = (
    "originalCost",
    "revisedCost",
    "cumulativeExpenditure",
    "physicalProgressPercent",
)

IDENTITY_FIELDS = ("pmgId", "projectCode", "legacyOcmsCode")
TEXT_FIELDS = ("projectName", "agency", "state", "ministry", "sector")


def normalize_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).replace("\u00a0", " ")
    text = text.replace("\r", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if is_null_token(text):
        return None
    return text


def normalize_identifier(value: Any) -> Optional[str]:
    text = normalize_text(value)
    if text is None:
        return None
    text = text.strip("()[]{} ")
    if is_null_token(text):
        return None
    return text


def normalize_number(value: Any) -> Optional[float]:
    if value is None or (isinstance(value, float) and value != value):
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)

    text = str(value).replace("\u00a0", " ").strip()
    text = text.replace("\n", " ").replace("%", "")
    text = re.sub(r"\s+", "", text)
    if is_null_token(text):
        return None

    negative = False
    if text.startswith("(") and text.endswith(")"):
        negative = True
        text = text[1:-1]
    text = text.replace(",", "")
    text = re.sub(r"[^0-9.\-]", "", text)
    if text in {"", "-", ".", "-."}:
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    return -number if negative else number


def normalize_date(value: Any) -> Optional[str]:
    """Return ISO date YYYY-MM-DD. MM/YYYY is stored as the first of that month."""
    if value is None:
        return None
    if isinstance(value, date):
        return value.isoformat()

    text = normalize_text(value)
    if text is None:
        return None
    if "T" in text and re.match(r"\d{4}-\d{2}-\d{2}", text):
        return text[:10]
    iso = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", text)
    if iso:
        return text

    dmy = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if dmy:
        day, month, year = map(int, dmy.groups())
        if 1 <= month <= 12 and 1 <= day <= 31:
            return date(year, month, day).isoformat()
        return None

    my = re.fullmatch(r"(\d{1,2})/(\d{4})", text)
    if my:
        month, year = map(int, my.groups())
        if 1 <= month <= 12:
            return date(year, month, 1).isoformat()
        return None

    return None


def normalize_serial(value: Any) -> Optional[int]:
    number = normalize_number(value)
    if number is None:
        return None
    return int(number)


def observation_from_extracted(record: dict[str, Any]) -> dict[str, Any]:
    parsed = record.get("parsed") or record
    raw = record.get("raw") or {}

    clean = {
        "pmgId": normalize_identifier(parsed.get("pmgId")),
        "projectCode": normalize_identifier(parsed.get("projectCode")),
        "legacyOcmsCode": normalize_identifier(parsed.get("legacyOcmsCode")),
        "projectName": normalize_text(parsed.get("projectName")),
        "agency": normalize_text(parsed.get("agency")),
        "state": normalize_text(parsed.get("state")),
        "ministry": normalize_text(parsed.get("ministry")),
        "sector": normalize_text(parsed.get("sector")),
        "approvalDate": normalize_date(parsed.get("approvalDate")),
        "startDate": normalize_date(parsed.get("startDate")),
        "originalDoc": normalize_date(parsed.get("originalCompletionDate")),
        "revisedDoc": normalize_date(parsed.get("revisedCompletionDate")),
        "originalCost": normalize_number(parsed.get("originalCost")),
        "revisedCost": normalize_number(parsed.get("revisedCost")),
        "cumulativeExpenditure": normalize_number(parsed.get("cumulativeExpenditure")),
        "physicalProgress": normalize_number(parsed.get("physicalProgressPercent")),
        "serialNumber": normalize_serial(parsed.get("serialNumber")),
        "reportMonth": record.get("reportMonth"),
        "sourceReport": record.get("sourceReport"),
        "sourcePage": record.get("sourcePage") or (raw.get("sourcePage") if isinstance(raw, dict) else None),
    }

    return {
        "raw": {
            **raw,
            "parsedTokens": {
                key: parsed.get(key)
                for key in (
                    "serialNumber",
                    "projectName",
                    "agency",
                    "projectCode",
                    "legacyOcmsCode",
                    "pmgId",
                    "state",
                    "ministry",
                    "sector",
                    "approvalDate",
                    "startDate",
                    "originalCompletionDate",
                    "revisedCompletionDate",
                    "originalCost",
                    "revisedCost",
                    "cumulativeExpenditure",
                    "physicalProgressPercent",
                )
            },
        },
        "clean": clean,
    }
