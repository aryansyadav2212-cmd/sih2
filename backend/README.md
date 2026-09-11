# TRACE backend

Express (TypeScript) API that orchestrates project intelligence:
ML prediction (Python FastAPI) + external evidence (Tavily) + LLM recommendation (OpenAI).

Runs on [Bun](https://bun.dev). Bun loads `backend/.env` automatically.

## Setup

```bash
bun install
cp .env.example .env   # then fill in real values
```

## Run

```bash
bun start              # production-ish run (bun src/index.ts)
bun dev                # watch mode (bun --watch src/index.ts)
```

The server listens on `PORT` (default 3000).

`GET /health` reports process liveness plus ML-service reachability.

## Dependencies

Expects the Python ML service (see `backend/ml/`) reachable at `ML_SERVICE_URL`
and the OpenAI + Tavily APIs. If `OPENAI_API_KEY` or `TAVILY_API_KEY` are unset,
the server still boots; the corresponding intelligence features degrade
gracefully (`recommendation: null` / empty `externalEvidence`).

## Checks

```bash
bun run typecheck      # tsc --noEmit
```

Note: Prisma/Postgres (`DATABASE_URL`) is only used by `scripts/` import
utilities, not by the running API — project data comes from
`data/historical/observations.json`.

Full API documentation lives in `docs/API.md` (repo root).