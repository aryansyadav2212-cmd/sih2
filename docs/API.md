# TRACE — API Reference

Base path: `/api/v1` (all endpoints below are relative to it; the service-level
probe `GET /health` is outside the base path).

## `GET /health` (service level)

Liveness/readiness probe. Returns 200 while the process is up.

```json
{
  "status": "ok",
  "service": "trace-backend",
  "port": 3000,
  "mlService": "ok",
  "timestamp": "2026-09-11T..."
}
```

`mlService` is `"ok"` or `"unreachable"` (never a non-2xx status).

---

## `GET /projects`

Paginated project catalog with filters.

**Query params**

| Param | Description |
| --- | --- |
| `page` | 1-based page (default 1) |
| `limit` | page size (default 50) |
| `search` | free text over name/code/ministry/sector/agency/state |
| `ministry`, `sector`, `state`, `agency` | raw observation field equality |
| `scheduleState` | from ML prediction (only predicted projects match) |
| `riskLevel` | `low` \| `medium` \| `high` (predicted projects) |
| `predictionStatus` | `predicted` \| `unavailable` |
| `progressFrom` / `progressTo` | physical progress % range |
| `financialFrom` / `financialTo` | expenditure/original-cost % range |
| `projectStage` | `closure_watch` \| `normal_execution` \| `unknown` |
| `attentionCategory` | `intervention_required` \| `monitor` \| `closure_watch` |
| `sort` | `risk` \| `name` \| `progress` \| `financial` \| `cost` \| `deadline` |

**Response**: `{ total, page, limit, projects: ProjectSummary[] }`

## `GET /projects/facets`

Distinct filter values (ministry, sector, state, agency), ML prediction
coverage, and schedule-state/risk-level distributions for filter dropdowns.

## `GET /projects/stats`

Portfolio-level aggregates: total projects, prediction coverage, risk
distribution, latest report months.

## `GET /projects/attention`

Projects that need human review, grouped:
- `intervention_required` — overdue/stalled/regressing, large velocity gap, or significant cost increase
- `monitor` — medium/high model outlook, behind schedule, or nearing deadline
- `closure_watch` — ≥97% physical progress and otherwise healthy

## `GET /projects/:projectCode`

Single project with observed monthly history:

```json
{
  "project": { "...project fields..." },
  "history": [ { "...monthly observation..." } ]
}
```

`404` if the project code is unknown.

---

## `POST /projects/:projectCode/intelligence`

Generates full project intelligence (ML prediction + external evidence + LLM recommendation).

**Request body**

```json
{ "predictionMonth": "2026-07" }
```

`predictionMonth` must match `^\d{4}-(0[1-9]|1[0-2])$`.

**Response (200)**

```json
{
  "project":     { "projectCode": "612786", "projectName": "...", "agency": "...", "state": "..." },
  "prediction":  { "probability": 0.199, "riskLevel": "low", "target": "deadline_revision_next_month" },
  "context":     { "currentProgress": 8.7, "remainingProgress": 91.3, "deadlineDate": "2026-08-31", "remainingDays": 45, "observedVelocity": 0.3, "requiredVelocity": 2.1, "scheduleState": "behind" },
  "reasons":     [ { "group": "time_pressure", "direction": "increases", "message": "..." } ],
  "externalEvidence": [ { "title": "...", "source": "...", "url": "...", "date": "YYYY-MM-DD", "claim": "...", "quality": "high" } ],
  "recommendation": { "summary": "...", "keyReasons": [...], "recommendedActions": [...], "verificationNeeded": [...] }
}
```

`externalEvidence` is `[]` when Tavily is unavailable/unconfigured;
`recommendation` is `null` when OpenAI is unavailable/unconfigured.
`riskLevel` is one of `low` | `medium` | `high`.

**Errors**

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | body validation failed (`details` has zod flatten) |
| 400 | `INVALID_PREDICTION_REQUEST` | ML rejected the request |
| 404 | `RESOURCE_NOT_FOUND` | project or observation not found |
| 422 | `INSUFFICIENT_DATA` | project/month cannot be predicted |
| 429 | `RATE_LIMIT_EXCEEDED` | ML rate limiting |
| 500 | `INVALID_RESPONSE` | ML returned an invalid response |
| 500 | `INTERNAL_SERVER_ERROR` | unexpected |
| 502 | `RECOMMENDATION_UNAVAILABLE` | prediction ok, LLM step failed |
| 503 | `SERVICE_UNAVAILABLE` | ML service unreachable |

---

## Python ML service (port 8000, not under `/api/v1`)

### `GET /health`

```json
{ "status": "ok", "projects": 2077, "observations": 7590 }
```

### `POST /predict`

```json
{ "projectCode": "612786", "predictionMonth": "2026-07" }
```

Returns `{ project, prediction, context, reasons }` (shape matches the
Express intelligence response's first four fields). 422 with `detail` when a
prediction cannot be constructed for the project/month.

---

## Notes

- `src/routes/ai.ts` and `src/routes/dashboard.ts` define routers that are not
  mounted and therefore not part of the public API.
- `GET /:projectCode/intelligence/health` and `GET /intelligence/schema` are
  registered in `routes/intelligence.ts`; `schema` is safe, `intelligence/health`
  is a legacy stub.