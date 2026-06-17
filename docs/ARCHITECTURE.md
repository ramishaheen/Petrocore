# 360° PETROCORE — Architecture

> Living document. Updated after every build phase.

## 1. North star

360° PETROCORE is **integrated workforce intelligence**. Operational data flows **up** through
measurable competencies → analyzable gaps → development reports → readiness indicators that
support fast, fair decisions at individual, department, company, and sector level.

```
inputs ─► competencies ─► gaps ─► development reports ─► readiness indicators ─► decisions
   ▲                                                                                  │
   └────────────────── governance / evidence / confidence (cross-cutting) ◄───────────┘
```

## 2. The 10 layers (bounded modules)

Each layer is a bounded module: its own DB schema namespace, models, schemas, services, and API surface.

### Foundation — الطبقات التأسيسية
- **L1 · Strategy & Institutional Context** — institutional hierarchy tree (NOC → subsidiary → activity → department → section → job → employee) + strategic context elements. Drives every comparison/benchmark.
- **L2 · HR, Jobs & Performance Architecture** — employees, job catalog, org assignments, appraisals, KPIs. Establishes job → role → competency-requirement linkage.
- **L3 · Competency Dictionary & Professional Standards** — the unified professional reference. Competencies calibrated by role, admin level (1–5), experience band, responsibility, risk, activity. Families: Technical, HSE, Behavioral, Leadership, Digital, Evidence Standards.
- **L4 · Department Planning & Operational Requirements** — Operational Requirements Engine: department plans/KPIs → critical operational requirements → readiness priorities.

### Intelligence — طبقات الذكاء
- **L5 · Employee 360° Profile** (Competency Passport / جواز الجدارة المهني) — single trusted profile, Readiness Index (0–100), dual approval chain (Line Manager + HR = Trusted Profile).
- **L6 · Asset, Equipment & Critical Role Context** — links competencies to assets/equipment and flags critical roles for succession + risk heatmaps.
- **L7 · AI-Driven Assessment & Evidence Validation** — AI Assessment Engine: adaptive path, scenario generation, evidence reading, consistency check, confidence scoring, audit trail, human-review routing below threshold.
- **L8 · AI Data Fusion & Gap Analysis** — AI Data Fusion Engine: normalize → context-match → gap-analyze → impact-prioritize → confidence-score. Produces all gap outputs.

### Decision — طبقات القرار والتطوير
- **L9 · Training, Learning & Development Governance** — Learning Governance Engine: gap → needs → program → impact (Before/During/After lifecycle), profile write-back.
- **L10 · Dashboards, Reports & Decision Support** — Outputs Hub: 8 reports + Executive Workforce Readiness Dashboard.

## 3. AI / intelligence engines

Implemented as named services orchestrated via a graph (LangGraph-style) behind a model gateway
(LiteLLM-style) so the underlying LLM is swappable (DeepSeek / Claude / etc.).

| Engine | Layer | Pipeline |
|--------|-------|----------|
| AI Assessment Engine | L7 | adaptive path → scenario gen → evidence read → consistency check → confidence score |
| AI Data Fusion Engine | L8 | normalize → context match → gap analysis → impact prioritization → confidence score |
| Learning Governance Engine | L9 | gap → needs → program → impact |
| Operational Requirements Engine | L4 | plans → critical roles → readiness priorities |
| Institutional Value Engine | §12 | rolls up 6 value dimensions |

**Guardrails (Human-AI Governance & Decision Assurance):** every result → source + evidence + confidence;
every recommendation → human review + governance approval before use; everything stored with a
tamper-evident audit trail; pgvector for semantic evidence ↔ requirement matching.

## 4. Multi-tenancy & security

- **Tenant tree:** the L1 institutional hierarchy *is* the tenant tree. Every tenant-scoped row carries `tenant_id` (a hierarchy node, usually a leaf section).
- **Isolation:** PostgreSQL Row-Level Security. `SET app.current_tenant` / `app.current_role` per request. A row is visible when the caller is global (`PLATFORM_ADMIN`/`NOC_EXECUTIVE` or tenant `*`), the row is global, the tenant matches exactly, **or the row's tenant node is a descendant of the caller's tenant** — subtree access tested via the org-node materialized `path` (so a `COMPANY_ADMIN` bound to a subsidiary sees rows at its child sections).
- **⚠️ RLS requires a non-superuser app role.** Postgres bypasses RLS for superusers and `BYPASSRLS` roles. The dev/CI `petrocore` role is a superuser, so RLS policies are *defined and `FORCE`d* but only **enforced in production when the API connects as a dedicated least-privilege role** (no `SUPERUSER`, no `BYPASSRLS`, `GRANT`ed CRUD on the app tables). Create that role and point `DATABASE_URL` at it before go-live. Application-layer tenant scoping (`tenant_id` filters + RBAC) is the second line of defense.
- **RBAC:** roles in §3 of the spec (EMPLOYEE … PLATFORM_ADMIN, CONSULTANT). Enforced at API + RLS. Tenant-scoped bulk imports require a concrete target tenant (global users must pass `tenant_id`) so data is never written as a wildcard row.
- **PII:** field-level encryption (Fernet), encryption at rest + in transit, least-privilege, full audit log.

## 5. Service topology (dev)

```
web (Vite) ─► api (FastAPI) ─► db (Postgres16 + pgvector)
                   │   └─► redis ─► worker (Celery)
                   └─► ai-gateway (LiteLLM-style model gateway)
```

## 6. Repository layout

```
apps/
  api/            FastAPI backend (all 10 layers as modules)
    app/
      core/       config, security, RBAC, RLS session, worker
      db/         engine, base, session, RLS helpers
      models/     SQLAlchemy models per layer (l1_… l10_…)
      schemas/    Pydantic schemas
      api/v1/     routers per layer
      services/   business logic + engines/ (AI engines)
      seed/       bilingual seed data
    alembic/      migrations
    tests/
  web/            React + Vite + TS frontend (AR-RTL / EN-LTR)
services/
  ai-gateway/     model gateway (swappable LLM)
docs/             ARCHITECTURE.md · DATA_MODEL.md · DECISIONS.md
```

## 7. Build plan (phased)

| Phase | Scope | State |
|-------|-------|-------|
| 0 | Scaffold, Docker, Postgres+pgvector+RLS, Auth+RBAC, i18n | ✅ done |
| 1 | Foundation L1–L4 (hierarchy, HR, dictionary, ops requirements) | ✅ done |
| 2 | Intelligence L5–L6 (360° profile, assets/critical roles) | ✅ done |
| 3 | AI Assessment & Evidence (L7) — question bank, scenarios, pgvector evidence matching, confidence + human-review routing, audit trail | ✅ done |
| 4 | AI Data Fusion & Gap Analysis (L8) — individual/department reports, competency gap matrix, readiness index, succession insights, recommendations | ✅ done |
| 5 | Training Governance (L9 + Before/During/After) — needs, learner cohorts, program design, nomination, impact write-back | ✅ done |
| 6 | Outputs & Dashboards (L10 + 8 reports) + Institutional Value Engine | ✅ done |
| 7 | Governance gate, Readiness Diagnostic, Enablement (advisory, pilot entry matrix, calibration/scale-up) | ✅ done |
| 8 | Hardening — security headers, RBAC-403 tests, governance/import tests, HR/ERP integration APIs, end-to-end integration suite + Postgres CI job | ✅ done (nationwide load test & formal a11y audit remain as ops tasks) |

Legend: ✅ complete · 🟡 substantial · 🟧 scaffolded · ⬜ planned.

### Integration (§12 Scalable & Integrable)
`integration` — bulk **import** (competencies, jobs, employees; idempotent upsert,
PII encrypted on ingest, audit-logged) and **export** (employees JSON, readiness
register CSV; RLS-scoped). The entry points for HR/ERP system integration.

### Backend API surface (51 endpoints across the 10 layers + integration)
`auth` · `org` (L1) · `competencies` (L3) · `profiles` (L5) · `assessments` (L7:
questions, scenario, grade, run, evidence, evidence/match, audit) · `gaps` (L8:
analyze, department, succession, recommend, reports) · `training` (L9: needs,
cohorts, programs, nominate, stage, impact) · `governance` (decisions, resolve,
audit/verify) · `dashboards` (executive, diagnostic) · `reports` (employee,
decision-matrix, talent-discovery, succession, department-readiness,
training-impact, governance-audit, institutional-value) · `enablement`
(advisory, pilot-entry, calibration).
