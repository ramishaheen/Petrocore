# Deployment

Two deployable surfaces: the **web** app (static) and the **API** (FastAPI + Postgres/pgvector).

## Web (Vercel) — demo vs live

The web build has two modes, controlled by `VITE_DEMO` (baked in via `vite.config.ts`):

| Mode | How | Data source |
|------|-----|-------------|
| **Demo** (current preview) | `VITE_DEMO=1` (set in `apps/web/vercel.json`) | baked-in fixtures, no backend |
| **Live** | unset `VITE_DEMO`, set `VITE_API_BASE_URL` | the deployed API |

To switch the Vercel project to **live data**:
1. Deploy the API (below) and note its URL, e.g. `https://petrocore-api.onrender.com`.
2. In the Vercel project → **Settings → Environment Variables**: set
   `VITE_API_BASE_URL = https://petrocore-api.onrender.com/api/v1`.
3. Edit `apps/web/vercel.json` → change `buildCommand` to `npm run build` (drop `VITE_DEMO=1`), commit.
4. Redeploy. The same UI now reads from the live API (auth, RLS, assessments, fusion, governance — all real).

> Tip: keep the demo project as-is and add a **second** Vercel project for the live build, so you have both.

## API + Database

### Option A — Render Blueprint (one click)
The repo ships `render.yaml`. In Render → **New → Blueprint** → pick this repo. It provisions
Postgres 16 (pgvector) + the API, runs migrations + seed, and exposes `/health` and `/docs`.
Set `PII_ENCRYPTION_KEY` (a Fernet key) and, optionally, `AI_API_KEY`. Update `API_CORS_ORIGINS`
to your web origin.

### Option B — Docker Compose (self-host / VPS)
```bash
cp .env.example .env          # set SECRET_KEY, PII_ENCRYPTION_KEY, API_CORS_ORIGINS
docker compose up --build -d
docker compose exec api python -m app.seed.seed_all
```
Put the API behind HTTPS and set `API_CORS_ORIGINS` to your web origin.

### Notes
- `DATABASE_URL` accepts managed-Postgres URLs (`postgres://` / `postgresql://`); the app
  normalizes them to the psycopg driver (`config.sqlalchemy_url`).
- **RLS enforcement** requires the API to connect as a **non-superuser** DB role (see
  `docs/ARCHITECTURE.md` §4). Managed Postgres app users are typically non-superusers — good.
- Generate a production `PII_ENCRYPTION_KEY`:
  `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
