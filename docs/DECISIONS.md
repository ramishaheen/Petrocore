# 360° PETROCORE — Decisions Log

> Architecture Decision Records (ADRs). Newest first.

## ADR-0009 · Full UI parity, integration APIs, and broadened test coverage
**Status:** accepted · **Date:** 2026-06-17
Completed the in-browser experience and acceptance coverage: Competency Passport (L5),
AI Assessment (L7), Training Governance Before/During/After (L9), and an expanded Reports hub
(Institutional Value, Succession, Department Readiness, Training Impact, Governance & Audit).
Added HR/ERP **import/export** integration APIs (§12) and broadened the integration suite to cover
the governance gate, recommendations, import/export round-trip, **PII-at-rest encryption**, and an
**RBAC 403** case (20 tests total). A local Postgres+pgvector workflow now validates DB-backed
changes before every push. Remaining items (nationwide load test, formal a11y audit) are operational
tasks requiring infrastructure outside this repository.

## ADR-0008 · Phases 3–8 completed end-to-end
**Status:** accepted · **Date:** 2026-06-17
All 10 layers now expose working services + APIs: L7 question-bank-driven adaptive assessment with
pgvector evidence matching and confidence/human-review routing; L8 full data-fusion output set
(individual/department gap reports, competency gap matrix, succession insights, recommendations);
L9 Before/During/After training governance with impact write-back to the readiness index; L10 the 8
reports + Executive Dashboard + Institutional Value Engine; §13 enablement (advisory, pilot entry
matrix, calibration). Hardening adds security headers and an end-to-end integration test backed by a
pgvector Postgres CI job. Remaining for full production: load testing at nationwide scale, formal
a11y/RTL audit, and external HR/ERP integration APIs.

## ADR-0007 · Phased delivery & current state
**Status:** superseded by ADR-0008 · **Date:** 2026-06-17
Initial session delivered the runnable foundation (Phase 0 + L1–L8 data models + engine architecture
+ bilingual frontend shell). Rationale retained: a coherent vertical slice + complete data model lets
remaining phases drop in without rework.

## ADR-0006 · AI engines as a graph behind a model gateway
**Status:** accepted
Engines (Assessment, Data Fusion, Learning Governance, Operational Requirements, Institutional Value)
are implemented as explicit step pipelines (LangGraph-style nodes) behind a `ModelGateway`
abstraction (LiteLLM-style) so the LLM is swappable (Claude / DeepSeek / …). Stubs are deterministic
so the platform runs and tests pass without external API keys; wiring a real key flips them live.

## ADR-0005 · Human-in-the-loop governance gate is mandatory
**Status:** accepted
Every AI result carries `source + evidence + confidence`. Results below
`CONFIDENCE_REVIEW_THRESHOLD` route to human review. No recommendation enters a workforce decision
without `gov_decision` review + approval. All writes append to a tamper-evident `audit_log` hash chain.

## ADR-0004 · Multi-tenancy = the L1 hierarchy + Postgres RLS
**Status:** accepted
The institutional hierarchy tree (NOC → … → employee) *is* the tenant tree. Tenant-scoped rows carry
`tenant_id` → `l1_org_node`. Per-request we `SET app.current_tenant` / `app.current_role`; RLS policies
restrict rows to the requester's subtree. Avoids schema-per-tenant sprawl while giving strict isolation.

## ADR-0003 · Bilingual at the data layer, not just UI
**Status:** accepted
Every human-facing entity stores `*_en` and `*_ar` columns. UI uses i18next with RTL mirroring; Arabic
is the default locale. Domain terms keep Arabic labels even in EN UI.

## ADR-0002 · Backend = Python FastAPI
**Status:** accepted (per recommended stack)
The platform is AI-heavy; FastAPI + SQLAlchemy 2.0 + Alembic + pgvector is the natural fit. Frontend is
React + Vite + TS + Tailwind + i18next + TanStack Query + Zustand + Recharts.

## ADR-0001 · Build in the `petrocore` repository
**Status:** accepted
The empty `ramishaheen/petrocore` repo is the home for the platform. Development on branch
`claude/petrocore-platform-build-y9hi7e`.
