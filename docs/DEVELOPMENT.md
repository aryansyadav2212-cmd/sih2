# TRACE — Development Guide

Prerequisites: Node ≥ 20 (or Bun), Python ≥ 3.9, and the ML artifacts already
committed (they are).

## 1. Environment variables

Copy the templates and fill in values (never commit real secrets):

```bash
cp .env.example backend/.env                # API keys, ML URL, port
cp frontend/.env.example frontend/.env      # optional: VITE_API_URL override
```

`backend/.env` is loaded automatically by Bun at startup
(`backend/.gitignore` excludes it). Reference: `docs/DEPLOYMENT.md` lists every
variable with defaults.

## 2. Start the three services (three terminals)

### a) Python ML service — port 8000

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn ml.api:app --host 0.0.0.0 --port 8000
```

Import paths (`ml.*`, `features.*`) assume the working directory is `backend/`.

### b) Express API — port 3000

```bash
cd backend
bun install
bun start          # or: bun dev (watch mode)
```

### c) Frontend — http://localhost:5173

```bash
cd frontend
npm install
npm run dev
```

The dev frontend calls the API at `http://localhost:3000/api/v1` by default
(`VITE_API_URL` overrides).

## 3. Verify end-to-end

```bash
curl http://localhost:3000/health
# {"status":"ok","service":"trace-backend","mlService":"ok",...}

curl http://localhost:8000/health
# {"status":"ok","projects":2077,"observations":7590}

curl -X POST http://localhost:3000/api/v1/projects/612786/intelligence \
     -H "Content-Type: application/json" \
     -d '{"predictionMonth":"2026-07"}'
```

## 4. Tests & checks

```bash
# Frontend: typecheck (build-time too), lint, build
cd frontend
npx tsc -p tsconfig.app.json --noEmit     # real typecheck (full repo tsc -b also ok)
npx oxlint
npm run build

# Backend (TS): typecheck
cd backend
bun run typecheck                         # tsc --noEmit (6 pre-existing errors remain)

# Backend (Python): unit + FastAPI tests
cd backend
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m pytest ml features -q
```

## 5. Project data / model

- Dataset snapshot: `backend/data/historical/observations.json` — shared by the
  Express catalog service and the FastAPI model at startup. Rebuild with the
  `backend/ingestion/` pipeline if the source PDFs change.
- Model artifacts: `backend/ml/artifacts/{preprocessor,model}.joblib` — committed
  to git; retrain with `backend/ml/train_baseline.py`.

## 6. Conventions

- Backend TS: 4-space indent, `import ... from` with `.ts` extension where the
  existing code does, zod schemas for request/response contracts.
- Python: type-annotated, docstring-heavy; imports as `ml.*` / `features.*`.
- Don't commit `.env`, artifacts dumps, or generated Prisma output.