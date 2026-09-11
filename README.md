# TRACE — Transparency, Risk and Compliance Evaluator

TRACE is an AI-powered national infrastructure tracking dashboard ("PAIMANA AI").
It turns monthly project reports into per-project risk intelligence: an ML model
scores upcoming schedule/cost risk, external evidence search surfaces supporting
news, and an LLM writes an actionable recommendation.

## Architecture (three independently deployable services)

```
┌──────────────┐   HTTPS    ┌──────────────────┐   HTTP    ┌─────────────────┐
│   frontend   │ ─────────▶ │  express backend  │ ───────▶ │  python ML       │
│  React/Vite  │            │  (Bun / Node)     │          │  (FastAPI/ML)    │
└──────────────┘            └──────────────────┘          └─────────────────┘
                                 │      │
                                 │      └─▶ OpenAI (recommendation, best-effort)
                                 └─▶ Tavily (external evidence, best-effort)
```

- `frontend/` — React 19 + Vite app, calls the backend via `VITE_API_URL`.
- `backend/` — Express API (TypeScript, runs on Bun). Orchestrates ML + OpenAI + Tavily.
- `backend/ml/` — FastAPI ML service (Python). Loads the trained model from
  `ml/artifacts/` and historical data from `data/historical/observations.json`.
- `backend/features/` — feature engineering library used to train/inspect the model.
- `backend/ingestion/` — one-off PDF ingestion pipeline (builds `data/historical/`).

Both the Express backend and the ML service read the same
`backend/data/historical/observations.json` snapshot, so the API works with the
data-only backend even when Prisma/Postgres are not provisioned.

## Quick start (development)

```bash
# 1. Python ML service (port 8000) — from backend/
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/pip install .  # if a package is added (none currently)
.venv/bin/uvicorn ml.api:app --port 8000

# 2. Express API (port 3000) — from backend/ (Bun reads backend/.env)
bun src/index.ts

# 3. Frontend (http://localhost:5173) — from frontend/
npm install
npm run dev
```

See `docs/DEVELOPMENT.md` for details and `docs/DEPLOYMENT.md` for production.

## Documentation

- `docs/ARCHITECTURE.md` — system design, data flow, service responsibilities.
- `docs/DEVELOPMENT.md` — local setup, env vars, commands, tests.
- `docs/DEPLOYMENT.md` — deploying each service (Render/Railway + Netlify/Vercel).
- `docs/API.md` — public HTTP API reference.