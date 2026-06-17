# 360° PETROCORE — Decisions Log

> Architecture Decision Records (ADRs). Newest first.

## ADR-0007 · Phased delivery & current state
**Status:** accepted · **Date:** 2026-06-17
This session delivers a **runnable foundation**: Phase 0 (scaffold, Docker, Postgres+pgvector+RLS,
JWT auth + RBAC, i18n AR-RTL/EN-LTR) plus the foundation & intelligence **data models** for L1–L8,
the AI **engine architecture** (graph + model gateway abstractions) with deterministic stubs, and a
bilingual frontend shell with the key screens. Phases 5–8 are scoped in `ARCHITECTURE.md`.
Rationale: a coherent vertical slice + complete data model is more valuable than partial breadth,
and lets remaining phases drop in without rework.

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
