# TRACE — Deployment Guide

Three independent services. Env-var conventions:

| Variable | Service | Default | Required | Notes |
| --- | --- | --- | --- | --- |
| `PORT` | Express | `3000` | no | |
| `CORS_ORIGIN` | Express | (allow all) | no | comma-separated allowlist for production |
| `ML_SERVICE_URL` | Express | `http://127.0.0.1:8000` | no | incl. scheme/port, no trailing `/` |
| `OPENAI_API_KEY` | Express | — | no* | *without it, `recommendation` is `null` |
| `OPENAI_MODEL` | Express | `gpt-5-mini` | no | |
| `TAVILY_API_KEY` | Express | — | no** | **without it, `externalEvidence` is `[]` |
| `DATABASE_URL` | Express | — | no | only used by `backend/scripts/` Prisma utilities |
| `VITE_API_URL` | Frontend | dev: `http://localhost:3000/api/v1` | yes (prod) | inlined at build time |

## Express API (Render / Railway / Fly / any Node+Bun host)

1. Build command: `cd backend && bun install`
2. Start command: `bun src/index.ts` (or `bun start`)
3. Env vars: `PORT` (set by platform), `ML_SERVICE_URL`, `OPENAI_API_KEY`,
   `OPENAI_MODEL`, `TAVILY_API_KEY`, `CORS_ORIGIN`.
4. Liveness probe: `GET /health` — always 2xx while the process is up; the
   `mlService` field reports whether `/predict` is reachable.
5. No database is required at runtime. Committed datasets and model artifacts
   ship with the repository.

If the ML service can reach the internet and the Express service, keep them on
the same network (Render "internal services" or one instance running both).

## Python ML service (Render / Railway / Fly / Docker)

1. Build command: `cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
2. Start command: `.venv/bin/uvicorn ml.api:app --host 0.0.0.0 --port $PORT`
3. Working directory MUST be `backend/` (imports are `ml.*`, `features.*`).
4. Liveness probe: `GET /health`.
5. `PORT` is supplied by the platform; uvicorn reads it from the shell.

### Train & tune (requires data pipeline, not needed to serve)
Model artifacts (`backend/ml/artifacts/`) are already committed for serving.
Retraining: `cd backend && .venv/bin/python ml/train_baseline.py`.

## Frontend (Netlify / Vercel / Cloudflare Pages)

1. Build command: `cd frontend && npm ci && npm run build`
2. Publish directory: `frontend/dist`
3. Build-time env: `VITE_API_URL=https://<your-api-host>/api/v1`

**Important:** `VITE_` variables are baked into the bundle at **build time**,
and `VITE_API_URL` must point to the deployed backend (a bare `https://api...`
hostname must include the `/api/v1` prefix — the app's other requests join it
with paths like `/projects`). There is deliberately **no** production localhost
fallback, so an unset URL fails loudly rather than silently hitting `localhost`.

CORS: set `CORS_ORIGIN` on the Express service to the frontend origin(s), e.g.
`https://track.paimana.in,https://www.track.paimana.in`. If it is left unset,
CORS remains fully open (acceptable for a non-sensitive demo, not for production
with real data).

## Recommended deployment order

1. Backend (Express).
2. ML service (Python) — backend health flips to `mlService: ok`.
3. Frontend — set `VITE_API_URL` to the live API, build, deploy.
4. `curl https://<api>/health` and a sample `/intelligence` request to confirm.

## Production hardening (future work)

- Restrict CORS to the real frontend origin (`CORS_ORIGIN`).
- Add rate limiting and auth if the API is publicly reachable.
- `ML_SERVICE_URL` should be an internal hostname, not `127.0.0.1`.
- Serve the frontend through CDN caching since the app is fully static.
- dockerize (single `Dockerfile` per service) once a concrete host is chosen.