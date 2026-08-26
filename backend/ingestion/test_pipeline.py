from parsers import parse_column2
from normalize import normalize_date, normalize_number, observation_from_extracted
from match_projects import ProjectMatcher


def test_normalize_number_commas_and_percent():
    assert normalize_number("1,250.50") == 1250.50
    assert normalize_number("62.5%") == 62.5
    assert normalize_number("-") is None
    assert normalize_number("NA") is None
    assert normalize_number("") is None


def test_normalize_dates():
    assert normalize_date("31/12/2027") == "2027-12-31"
    assert normalize_date("03/2023") == "2023-03-01"
    assert normalize_date("-") is None


def test_parse_column2_codes():
    cell = (
        "Construction of New Domestic Terminal Building\n"
        "(Airport Authority of India [AAI])\n"
        "(612786)\n"
        "(N04000106) (-)"
    )
    parsed = parse_column2(cell)
    assert parsed["projectCode"] == "612786"
    assert parsed["legacyOcmsCode"] == "N04000106"
    assert parsed["pmgId"] is None
    assert parsed["agency"] == "Airport Authority of India [AAI]"


def test_raw_and_clean_separation():
    record = {
        "reportMonth": "2026-04",
        "sourceReport": "test",
        "sourcePage": 54,
        "raw": {"projectCell": "raw cell", "sourcePage": 54},
        "parsed": {
            "pmgId": "4353",
            "projectCode": "701107",
            "legacyOcmsCode": "N04000091",
            "projectName": "Vijayawada Airport",
            "physicalProgressPercent": "87.2%",
            "cumulativeExpenditure": "523.14",
        },
    }
    obs = observation_from_extracted(record)
    assert obs["raw"]["projectCell"] == "raw cell"
    assert obs["clean"]["physicalProgress"] == 87.2
    assert obs["clean"]["pmgId"] == "4353"


def test_matching_priority_and_conflict():
    matcher = ProjectMatcher()

    def obs(month, pmg, code, name):
        return {
            "raw": {},
            "clean": {
                "reportMonth": month,
                "pmgId": pmg,
                "projectCode": code,
                "legacyOcmsCode": None,
                "projectName": name,
                "cumulativeExpenditure": 1,
                "physicalProgress": 1,
            },
        }

    a = matcher.add_observation(obs("2026-04", "111", "AAA", "One"))
    b = matcher.add_observation(obs("2026-05", "111", "AAA", "One"))
    assert a == b

    other = matcher.add_observation(obs("2026-04", "222", "BBB", "Two"))
    conflict = matcher.add_observation(obs("2026-05", "111", "BBB", "Mixed"))
    assert conflict is None
    assert matcher.conflicts
    assert other != a


def test_shared_legacy_does_not_merge_distinct_codes():
    matcher = ProjectMatcher()

    def obs(month, pmg, code, legacy, name):
        return {
            "raw": {},
            "clean": {
                "reportMonth": month,
                "pmgId": pmg,
                "projectCode": code,
                "legacyOcmsCode": legacy,
                "projectName": name,
            },
        }

    a = matcher.add_observation(obs("2026-04", "1", "AAA", "L1", "Road A"))
    b = matcher.add_observation(obs("2026-04", None, "BBB", "L1", "Road B"))
    assert a != b
    assert any(c["type"] == "shared_secondary_identifier" for c in matcher.conflicts)


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("ok", name)
    print("all tests passed")
