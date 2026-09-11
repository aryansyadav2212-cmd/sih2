# TRACE — Architecture

## Overview

TRACE (frontend title: "PAIMANA AI — National Infrastructure Intelligence") is
a three-service system that turns monthly Indian infrastructure project reports
into per-project risk intelligence.

```
┌──────────────┐   HTTPS (API)   ┌──────────────────┐   HTTP    ┌──────────────────────┐
│   frontend   │ ──────────────▶ │  express backend  │ ───────▶ │  python ML service    │
│  React/Vite  │                 │  (Bun / TS)       │          │  FastAPI / sklearn     │
│  (static)    │                 └──────────────────┘          └──────────────────────┘
                                      │  │
                                      │  └────────────▶ OpenAI      (recommendation)
                                      └───────────────▶ Tavily      (external evidence)
```

The three services are independently deployable and agree on a shared dataset,
`backend/data/historical/observations.json`.

## Services

### 1. Frontend (`frontend/`)
- React 19 + Vite 8 (TypeScript), react-router v7, single-page app.
- Talks only to the Express backend through `src/api/client.ts`, configured via
  the `VITE_API_URL` build-time env var.
- No secrets. Renders project lists, category views, and the project detail
  "intelligence" page. Degrades gracefully with inline error banners when the
  API is unreachable.

### 2. Express backend (`backend/src/`)
- Entry `src/index.ts`: Express 5, JSON body parsing, CORS, mounts `/api/v1`.
- Routes:
  - `routes/projects.ts` — project catalog (list / facets / stats / attention),
    backed by the observations JSON snapshot.
  - `routes/intelligence.ts` — `POST /:projectCode/intelligence`, the main
    orchestration endpoint.
  - `routes/ai.ts`, `routes/dashboard.ts` — currently unused stubs (not mounted).
- Services:
  - `prediction.service.ts` — HTTP client for the ML service `/predict` + `/health`.
  - `evidence.service.ts` — Tavily search, domain/relevance/recency filtering.
  - `llm.service.ts` — OpenAI Responses API with retry + schema validation.
  - `intelligence.service.ts` — orchestrates the three features above.
  - `projectCatalog.service.ts` — reads `data/historical/observations.json`
    (portable path resolved from `import.meta.url`).
  - `riskIndex.service.ts` — computes a blended 0–1 risk index.
- `src/lib/prisma.ts` — Postgres client, used **only** by `scripts/` import
  utilities, never by the running API.

### 3. Python ML service (`backend/ml/`)
- Entry `ml/api.py`: FastAPI. Loads the trained model + historical observations
  once at startup.
- `ml/inference.py` — loads `ml/artifacts/model.joblib` + `preprocessor.joblib`
  (paths resolved from `__file__`), `shap.TreeExplainer` prepared at startup.
- `ml/data_loader.py` — loads observations from
  `backend/data/historical/observations.json` (path resolved via `__file__`).
- Endpoints: `GET /health`, `POST /predict`.

Supporting libraries (not servers):
- `backend/features/` — feature engineering (schedule, financial, risk,
  progress-trajectory, data-validation) + tests.
- `backend/ingestion/` — one-off PDF → observations pipeline.

## Data flow (`POST /api/v1/projects/:code/intelligence`)

1. Express validates `predictionMonth` (YYYY-MM, zod).
2. `prediction.service` → ML `POST /predict` with `{projectCode, predictionMonth}`.
   ML computes features from observations and returns
   project / prediction / context / reasons.
3. `evidence.service` (Tavily) searches the project name/code/state, filters to
   official (`*.gov.in`) and trusted-news domains, returns ≤ 3 items.
   **Best-effort**: any failure yields `[]`.
4. `llm.service` (OpenAI) writes a recommendation from prediction + context +
   reasons + evidence. **Best-effort**: any failure yields `null`.
5. Express flattens the ML response so the API exposes top-level
   `project`, `prediction`, `context`, `reasons`, `externalEvidence`,
   `recommendation` (nullable).

## Failure semantics

| Feature | On external failure |
| --- | --- |
| ML prediction | endpoint returns a typed error (project/month not predictable) |
| External evidence | empty list (degraded) |
| LLM recommendation | `recommendation: null` (degraded) |
| Health probe | `GET /health` always 2xx while process is up; `mlService` field reports dependency state |

## Reproducibility

- Python deps pinned in `backend/requirements.txt`
  (test-only extras in `backend/requirements-dev.txt`).
- Model is committed to git (`backend/ml/artifacts/*.joblib`) so training data
  isn't needed to serve predictions.
- Dataset snapshot `backend/data/historical/observations.json` is committed, so
  both the API and ML service run without Postgres/Prisma.

## Known dead-weight (do not extend)
- `src/routes/ai.ts`, `src/routes/dashboard.ts` — never mounted.
- `test/` (repo root) — standalone prototype pages, not referenced by the app.
- `ai/`, `database/` (repo root) — empty directories.
- `backend/ml/artifacts/gradient_boosting.joblib` — 0-byte placeholder, unused.