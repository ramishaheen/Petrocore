# 360° PETROCORE — Working notes for Claude

Read `docs/ARCHITECTURE.md` first; it is the source of truth for the 10-layer design.

## Non-negotiables (do not regress these)
- **Bilingual everywhere.** Every human-facing entity stores `*_en` and `*_ar`; every UI
  string lives in both `apps/web/src/i18n/{ar,en}.json`. Arabic is the default locale; the UI
  mirrors RTL/LTR. Never hard-code user-facing text in components.
- **Evidence + confidence on every AI output.** Competency results, gaps, and recommendations
  carry a `confidence` (0–1) and link to a source/evidence. Results below
  `CONFIDENCE_REVIEW_THRESHOLD` route to the human governance gate.
- **Human-in-the-loop.** No AI recommendation enters a workforce decision without a
  `gov_decision` review. Every consequential write appends to the tamper-evident `audit_log`
  hash chain via `services/engines/governance.append_audit`.
- **Multi-tenant RLS.** Tenant-scoped tables carry `tenant_id` (an `l1_org_node`). Per request,
  `get_db_for` sets `app.current_tenant`/`app.current_role`. Don't bypass RLS in endpoints.

## Conventions
- Backend: FastAPI + SQLAlchemy 2.0. Models are namespaced by layer (`l1_…`–`l10_…`). New
  cross-cutting writes must call `append_audit`. **Flush before referencing an ORM row's
  generated `id`** (UUID defaults apply at INSERT) — e.g. before passing it to `append_audit`.
- AI calls go through `services/engines/gateway.gateway` (LiteLLM-style), never a vendor SDK
  directly, so the model stays swappable. Stubs are deterministic for offline tests.
- Frontend: React + Vite + TS + Tailwind + TanStack Query + Zustand. Pages read the active
  locale via `useTranslation` and pick `*_ar`/`*_en` accordingly.

## Validating changes locally
```bash
# unit tests (no DB)
cd apps/api && pytest tests/test_engines.py tests/test_security.py tests/test_evidence.py tests/test_value_engine.py
# full suite incl. integration (needs Postgres+pgvector on :5432)
DATABASE_URL=postgresql+psycopg://petrocore@127.0.0.1:5432/petrocore pytest
# frontend
cd apps/web && npm run build
```
CI runs `api-tests`, `api-integration` (Postgres service), and `web-typecheck`. Keep all green.
