# PAIMANA Backend Data Pipeline — Validation Layer Inspection Report

**Date:** 2026-09-03  
**Status:** READ-ONLY INSPECTION (NO FILES MODIFIED)  
**Scope:** Schema availability, existing validation, feature engineering, temporal handling, denominator guarding

---

## EXECUTIVE SUMMARY

The current PAIMANA pipeline processes raw observations → feature engineering → ML training without an explicit validation layer. Domain validation is **minimal and dispersed**:

- **Existing validation focus:** Type conversion, null handling, temporal continuity (consecutive months only)
- **Missing validation:** Physical progress ranges, cost logic, date validity, anomaly flagging
- **Denominator handling:** Comprehensive guards exist in feature modules to prevent division by zero
- **Observations:** All raw observations pass through unchanged; filtering occurs only at training data construction

**Critical finding:** The 9 observations with extreme cost ratios (< 0.10) exist in raw data and propagate untouched through all features. This is **correct behavior** — validation should preserve them, flag them, but not delete or rewrite them.

---

## RULE-BY-RULE COMPATIBILITY TABLE

| Rule | Concept | Currently Implemented? | Where? | Reliability |
|------|---------|----------------------|--------|-------------|
| **Rule 1a** | Progress 0–100 range | **NO** | None | N/A |
| **Rule 1b** | Progress missing → insufficient | **PARTIAL** | financial_features; returns None | Good |
| **Rule 1c** | Cost >= 0 | **PARTIAL** | normalize.py accepts negatives; financial_features guards | Fair |
| **Rule 1d** | Cost missing → insufficient | **YES** | financial_features, schedule_feasibility | Good |
| **Rule 2** | costRatio < 0.10 → suspicious | **NO** | None; ratio calculated but never flagged | N/A |
| **Rule 2b** | costRatio > 3.00 → suspicious | **NO** | None | N/A |
| **Rule 3** | expenditureRatio >= 0.30 AND progress <= 5% → suspicious | **NO** | None | N/A |
| **Rule 4** | Progress regression → suspicious | **PARTIAL** | Tracked as progressCondition="regression"; not flagged anomaly | Fair |
| **Rule 5a** | startDate > originalDoc → invalid | **NO** | None | N/A |
| **Rule 5b** | startDate > revisedDoc → invalid | **NO** | None | N/A |
| **Rule 5c** | approvalDate > startDate → suspicious | **NO** | None | N/A |
| **Rule 6** | Gap detection (Apr → Jun) | **YES** | progress_trajectory.py, monthwise_features.py | Good |
| **Rule 6b** | Insufficient trajectory evidence on gap | **YES** | trajectory flag "hasGap" | Good |
| **Rule 7** | Single-observation projects | **YES** | Handled gracefully; trajectory="insufficient_data" | Good |
| **Rule 8a** | velocityRatio denominator guards | **YES** | schedule_feasibility.py, velocity_ratio_and_reason() | Excellent |
| **Rule 8b** | expenditureRatio denominator guards | **YES** | financial_features.py, calculate_cost_features() | Excellent |
| **Rule 8c** | expenditurePerProgress denominator guards | **YES** | financial_features.py, financial_features() | Excellent |
| **Rule 9** | cumulativeExp > revisedCost → suspicious | **NO** | None; condition can occur (data shows 116x overspend) | N/A |

---

## DETAILED SCHEMA & FIELD AVAILABILITY

### Raw Observation Schema (data/historical/observations.json)

**Identifiers:**
- `projectCode`: string, optional, nullable
- `canonicalId`: string, optional, nullable
- `pmgId`: string, optional, nullable
- `legacyOcmsCode`: string, optional, nullable

**Metadata:**
- `projectName`: string, optional, nullable
- `agency`: string, optional, nullable
- `state`: string, optional, nullable
- `ministry`: string, optional, nullable
- `sector`: string, optional, nullable
- `reportMonth`: string (YYYY-MM format), required for temporal sorting
- `serialNumber`: int, optional

**Dates:**
- `approvalDate`: string (ISO date YYYY-MM-DD or YYYY-MM), optional, nullable
- `startDate`: string (ISO date), optional, nullable
- `originalDoc`: string (ISO date), optional, nullable (Rule 5 calls this `originalCompletionDate`)
- `revisedDoc`: string (ISO date), optional, nullable (Rule 5 calls this `revisedCompletionDate`)

**Financials:**
- `originalCost`: float, optional, nullable
- `revisedCost`: float, optional, nullable
- `cumulativeExpenditure`: float, optional, nullable

**Progress:**
- `physicalProgress`: float (0–100 intended, but **not validated**), optional, nullable

**Source metadata:**
- `sourceReport`: string
- `sourcePage`: int/string

---

## EXISTING VALIDATION CODE & FUNCTIONS

### 1. Type Conversion & Normalization
**File:** `ingestion/normalize.py`

- `normalize_number()` — Converts strings/numbers to float, handles negatives via `()` notation
- `normalize_date()` — Converts to ISO YYYY-MM-DD; does **NOT validate** date logic (e.g., `startDate > completionDate`)
- `normalize_text()` — Strips whitespace, applies NULL_TOKENS filter
- `_to_float()` in financial_features.py — Safe conversion, returns None on error

**Validation level:** Type casting only, no domain rules

---

### 2. Denominator Guards (EXCELLENT)

#### velocityRatio
**File:** `features/schedule_feasibility.py`, function `velocity_ratio_and_reason()`

```python
def velocity_ratio_and_reason(
    required_velocity: Optional[float],
    observed_velocity: Optional[float],
) -> tuple[Optional[float], Optional[str]]:
    if required_velocity is None:
        return None, "required_velocity_undefined"
    if observed_velocity is None:
        return None, "observed_velocity_unavailable"
    if observed_velocity == 0:
        return None, "observed_velocity_zero"
    if observed_velocity < 0:
        return None, "observed_velocity_negative"
    if required_velocity is not None and observed_velocity > 0:
        return _round(required_velocity / observed_velocity), None
    return None, "observed_velocity_unavailable"
```

**Guards:**
- ✓ Division by zero (`== 0`)
- ✓ Negative denominator (`< 0`)
- ✓ Missing denominator (None check)
- ✓ Provides reason codes for None cases

#### expenditureRatio
**File:** `features/financial_features.py`, function `calculate_cost_features()`

```python
if revised_cost > 0:
    expenditure_ratio = (
        cumulative_expenditure / revised_cost
    )
else:
    expenditure_ratio = None
```

**Guards:**
- ✓ Division by zero (`> 0` check)
- ✓ Zero/negative returns None
- ✓ Missing inputs return None (earlier check)

#### expenditurePerProgress
**File:** `features/financial_features.py`, function `financial_features()`

```python
if (
    expenditure_change is not None
    and progress_change is not None
    and progress_change > 0
):
    expenditure_per_progress = (
        expenditure_change / progress_change
    )
else:
    expenditure_per_progress = None
```

**Guards:**
- ✓ Division by zero (`> 0` check)
- ✓ Zero/negative progress returns None
- ✓ Missing inputs return None

#### costRatio
**File:** `features/financial_features.py`, function `calculate_cost_features()`

```python
if original_cost > 0:
    cost_ratio = revised_cost / original_cost
else:
    cost_ratio = None
```

**Guards:**
- ✓ Division by zero (`> 0` check)
- **Note:** Does NOT validate that revisedCost >= originalCost (allows ratios like 0.0004)

---

### 3. Temporal Continuity & Gap Detection

#### progress_trajectory.py
- **Function:** `months_between(from_month, to_month)`
  - Returns None if months not parseable or elapsed <= 0
  - Enables gap detection
  
- **Function:** `interval_features(from_obs, to_obs)`
  - Sets `"gap": elapsed > 1`
  - Sets `"isConsecutiveMonth": consecutive == 1`
  - Allows `monthlyProgressVelocity` for consecutive only
  - Allows `intervalVelocity` even across gaps

- **Function:** `project_trajectory(rows)`
  - Deduplicates months (if multiple obs for same month, keeps last)
  - Flags `"duplicateMonthDropped": had_duplicate_month`

#### monthwise_features.py
- **Function:** `_are_consecutive_months(month_a, month_b)`
  - Validates exactly 1-month gap
  
- **Function:** `build_monthwise_features()`
  - **Critical:** Sets `previous = None` if gap detected
  - Only passes consecutive previous observation to financial_features()
  - Ensures `expenditureChange` and `progressChange` not calculated across gaps

#### build_training_data.py
- **Function:** `are_consecutive_months(current_month, next_month)`
  - Requires consecutive months to create training row
  - Counts `skipped_not_consecutive`

**Finding:** Temporal continuity is well-guarded. Single-observation projects are handled gracefully.

---

### 4. Progress Regression

**File:** `features/financial_features.py`, function `financial_features()`

```python
if progress_change > 0:
    progress_condition = "progressing"
elif progress_change == 0:
    progress_condition = "no_progress"
else:
    progress_condition = "regression"
```

**File:** `features/schedule_feasibility.py`, function `schedule_state()`

```python
if (
    observed_velocity > 0
    and remaining_days is not None
    and remaining_days > 0
    and velocity_gap is not None
    and velocity_gap > 0
):
    return "behind"
```
(and separately: `"regressing"` for `observed_velocity < 0`)

**Finding:** Regression is tracked via:
- `progressCondition = "regression"` (month-to-month)
- `scheduleState = "regressing"` (trajectory-level)
- NOT flagged as anomaly; just tracked

---

### 5. Training Data Filtering

**File:** `ml/build_training_data.py`

Rows are **skipped if:**
1. Not consecutive calendar months → `skipped_not_consecutive`
2. Missing `revisedDoc` on either current or next month → `skipped_missing_deadline`
3. `build_monthwise_features()` returns empty dict (rare, means observation has no data)

**No filtering by:**
- Cost ratios
- Progress ranges
- Progress regression
- Extreme expenditure
- Expense anomalies

All 7590 observations with positive costs are accepted for feature engineering.

---

## CONFLICTS & RISKS

### Risk 1: No Explicit Data Validity Check
**Issue:** Progress values > 100 pass through unchanged.

**Example:** Project 619070 has `physicalProgress = 100.0` and `schedule_state = "completed"`. If a project had `physicalProgress = 105.0`, it would be accepted.

**Impact:** Feature engineering assumes 0–100, but doesn't validate.

**Files affected:** 
- `features/schedule_feasibility.py` line 200: `if current_progress >= 100:`
- No check for `> 100`

---

### Risk 2: No Date Logic Validation
**Issue:** No check that `startDate <= revisedDoc` or `approvalDate <= startDate`.

**Example:** Project could have `startDate = 2026-12-31` and `revisedDoc = 2026-01-01`.

**Impact:** `remaining_days` calculation in schedule_feasibility.py could return negative/nonsensical values.

**Files affected:**
- `features/schedule_feasibility.py`, `project_schedule_feasibility()`
- `ingestion/normalize.py` (accepts any valid ISO date)

---

### Risk 3: Extreme Cost Ratios Unchecked
**Issue:** Observations with `revisedCost / originalCost = 0.0004` (1/2486) are propagated to training data.

**Reality:** This is in the raw data (project 618886) and IS legitimate (albeit a data quality issue).

**Impact:** Creates extreme feature values in ML training.

**Current behavior:** Correct — should flag as suspicious, not delete.

---

### Risk 4: No Anomaly Tracking Structure
**Issue:** No way to currently attach validation metadata (validity, anomaly, evidence) to observations.

**Impact:** Can't easily filter/report/investigate anomalies after feature engineering.

**Recommendation:** Validation layer should output a status dict for each observation, not modify the observation itself.

---

### Risk 5: Progress Regression Not Flagged as Anomaly
**Issue:** Current system calculates `progressCondition = "regression"` but treats it like any other condition.

**Example:** Project 618737 has 0% progress across all 4 months. Not flagged anomalous, just recorded as "no_progress".

**Impact:** Model sees this as a normal input; doesn't know it's suspicious.

---

## MISSING INFORMATION & UNRESOLVED QUESTIONS

### Q1: Should costRatio be validated strictly?
The spec allows `costRatio < 0.10` to be suspicious (not invalid). But should we **hard-reject** ratios like 0.0001 before feature engineering?

**Answer needed:** Domain experts. Is 0.0001 data entry error or legitimate scope reduction?

### Q2: What constitutes "sufficient data" for trajectory?
Current rule: 2+ consecutive velocities for `"sufficient_data"`. Is this correct?

**Answer needed:** Define minimum observations for meaningful trajectory.

### Q3: Should expenditure exceed revised cost?
Observed: Project 618886 spent 116x revised cost. Is this:
- A cost-overrun tracking situation (valid)?
- A data entry error (invalid)?
- A suspicious misalignment (flag but keep)?

**Answer needed:** Domain experts clarify expenditure semantics.

### Q4: Can revisedDoc be earlier than originalDoc?
Observed: No examples in current data, but logically possible (deadline pulled forward).

**Answer needed:** Is `revisedDoc < originalDoc` allowed or invalid?

### Q5: Should single-month projects be excluded?
Currently: Handled gracefully, trajectory="insufficient_data".

**Question:** Are single-month observations useful for ML, or should they be filtered pre-training?

---

## EXISTING FEATURE-ENGINEERING ASSUMPTIONS

### progress_trajectory.py
- Assumes `reportMonth` can be parsed as YYYY-MM
- Assumes duplicate months within same project are rare (dedupes to latest)
- Explicitly flags large jumps (>= 20%) as suspicious but doesn't reject them
- Handles zero progress gracefully
- Does NOT validate progress in 0–100 range

### schedule_feasibility.py
- Assumes `currentProgress >= 100` means complete (doesn't validate < 0)
- Assumes date fields are valid ISO dates (doesn't validate logic)
- Requires `revisedDoc` OR `originalDoc` to calculate schedule state
- Allows `velocityRatio` to be None (does NOT require velocity estimates)

### financial_features.py
- Explicitly returns None for ratios with zero denominators
- Allows negative costs (no validation)
- Does NOT validate cost logic (e.g., revisedCost >= originalCost)
- Tracks `progressCondition` but doesn't flag as anomaly

### monthwise_features.py
- Requires `_are_consecutive_months()` before using previous observation
- Creates empty dict if no observations available (training data filters this out)
- Uses **string comparison** for `<= prediction_month` (works because YYYY-MM sorts lexicographically)

---

## DENOMINATOR RISK SUMMARY

**Identified extreme denominators in raw data:**

| Feature | Denominator | Min Value | Count < 0.01 | Risk |
|---------|------------|-----------|-------------|------|
| velocityRatio | observedVelocity | 0 (filtered) | 0 | None (returns None when 0) |
| expenditureRatio | revisedCost | 0.1 | 4 obs | Low (returns None when ≤ 0) |
| expenditurePerProgress | progressChange | 0.0001 | ~100 obs | None (returns None when ≤ 0) |
| costRatio | originalCost | 0.0001 | 4 obs | Low (returns None when ≤ 0) |

**Finding:** Denominator guards are **comprehensive and excellent**. No extreme ratios enter the training data from division by zero.

---

## TRAINING DATASET CONSTRUCTION

**File:** `ml/build_training_data.py`

### Input Filtering
- Requires `canonicalId` OR `projectCode` to group
- Requires `reportMonth` for sorting
- Requires `revisedDoc` on both current and next observation
- Requires consecutive calendar months

### Output
- 7590 total observations → → → ~1000 training rows (estimated from skipped counts)
- Rows: `{projectCode, canonicalId, observationMonth, features{progress, schedule, financial}, deadlineExtendedNextMonth}`
- No suspicious/anomaly metadata attached

---

## CURRENT ML PIPELINE (train_baseline.py)

### What enters ML:
1. Training dataset features (already flattened)
2. Features are numeric/categorical
3. Missing values are represented as None or NaN

### How missing values are handled:
- **Numeric:** `SimpleImputer(strategy="median")` replaces None with column median
- **Categorical:** `OneHotEncoder(handle_unknown="ignore")` handles missing implicitly

### Current diagnostics added (from earlier work):
- Target distribution by scheduleState ✓
- Extreme ratio inspection ✓
- Raw feature diagnostics ✓

### What's NOT done:
- Suspicious observation flagging
- Anomaly detection
- Data quality reporting per observation

---

## RECOMMENDED IMPLEMENTATION BOUNDARY

### Validation Layer SHOULD Handle:
1. ✓ Physical progress range check (0–100)
2. ✓ Cost numeric validity (non-negative or at least consistent)
3. ✓ Date logic validation (startDate <= completionDate)
4. ✓ Anomaly flagging (costRatio < 0.10, expenditure > 30% ∧ progress < 5%)
5. ✓ Regression detection (compare consecutive months)
6. ✓ Insufficient data classification (missing values, single observation, gaps)
7. ✓ Output: Structured validation record (validity, anomaly flags, evidence quality) SEPARATE from observation

### Feature Engineering SHOULD Keep:
1. ✓ Temporal gap detection (already in place)
2. ✓ Denominator guards (already in place)
3. ✓ None-handling for missing values (already in place)
4. ✓ Large-jump detection for velocity (already in place)
5. ✓ Consecutive-month enforcement for financial features (already in place)

### ML Preprocessing SHOULD:
1. ✓ Use validation metadata to optionally filter suspicious observations
2. ✓ Handle missing values via imputation (already in place)
3. ✓ Log which observations were excluded and why

### What SHOULD NOT Be Added Yet:
1. ✗ Hard caps on feature values (e.g., max velocity ratio)
2. ✗ Automatic deletion/rewriting of observations
3. ✗ Semantic fixes (e.g., "correcting" reversed dates)
4. ✗ Machine-learning-based anomaly detection (should be deterministic domain rules)

---

## IMPLEMENTATION STRUCTURE (RECOMMENDED)

```
observations.json
    ↓
[proposed] validation_layer.py
    ├─ Rule 1: numeric_validity()
    ├─ Rule 2: cost_consistency()
    ├─ Rule 3: financial_progress_alignment()
    ├─ Rule 4: progress_regression_check()
    ├─ Rule 5: date_logic_validation()
    ├─ Rule 6: temporal_continuity()
    ├─ Rule 7: evidence_sufficiency()
    ├─ Rule 8: extreme_ratio_check()
    ├─ Rule 9: expenditure_consistency()
    ↓
validation_records.json
{
  "observationId": {...},
  "validity": "valid" | "invalid",
  "anomalies": ["costRatio_extreme", "progress_regression", ...],
  "evidence": "sufficient" | "insufficient",
  "reasons": {...},
  "observation": {...original unchanged...}
}
    ↓
[keep existing] feature_engineering
    ↓
[keep existing] ml/build_training_data.py
```

---

## EXPLICIT STATEMENT

**NO FILES WERE MODIFIED**

This is a read-only inspection report only. All code, data, and structure remain unchanged.

- ✓ No code edited
- ✓ No files created (except this report)
- ✓ No observations deleted or modified
- ✓ No data pipeline altered

---

## NEXT STEPS (FOR SEPARATE REVIEW)

1. **Clarify domain semantics** on extreme cost ratios and expenditure overruns
2. **Define anomaly thresholds** (preliminary: costRatio < 0.10, > 3.00; expenditureRatio >= 0.30 ∧ progress <= 5%)
3. **Design validation output structure** (suggest: observation + metadata dict, not modification)
4. **Implement validation layer** as a pure function: `(observation) → (observation, validation_record)`
5. **Decide ML filtering strategy** (keep all, flag suspicious, exclude invalid)

---

**Report complete. Inspection scope: FULL.**
