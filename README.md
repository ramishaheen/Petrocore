# 360° PETROCORE

**AI-Driven Competency & Workforce Readiness Intelligence Platform**

*From Competency Assessment to Workforce Readiness Intelligence.*

Built for the National Oil Corporation (Libya) ecosystem · Delivered by Murzuq Training Academy / Dr. Rami Shaheen Group.

360° PETROCORE is an **integrated institutional intelligence architecture** — not a single
assessment tool. It turns employee, competency, and training data into **readiness
intelligence**: it measures readiness, exposes gaps, and governs development end-to-end,
with every result tied to a **source + evidence + confidence score**, and every decision
gated by **human-in-the-loop governance**.

## Non-negotiable principles

1. **Integrated intelligence** — every feature traces back to one of the 10 layers (`docs/ARCHITECTURE.md`).
2. **Bilingual by design** — full Arabic (RTL, primary) + English (LTR). Domain terms keep Arabic labels.
3. **Human-in-the-loop AI** — AI recommends, humans review, evidence validates, governance approves. Never auto-commit a workforce decision.
4. **Evidence-based** — every competency result, gap, and recommendation links to a source, supporting evidence, and a confidence score.
5. **Multi-tenant** — NOC is the parent; subsidiaries → activities → departments are nested tenants with PostgreSQL Row-Level Security (RLS).

## Architecture at a glance — the 10 layers

| Group | Layers |
|-------|--------|
| **Foundation** (الطبقات التأسيسية) | L1 Strategy & Institutional Context · L2 HR/Jobs/Performance · L3 Competency Dictionary & Standards · L4 Department Planning & Operational Requirements |
| **Intelligence** (طبقات الذكاء) | L5 Employee 360° Profile · L6 Asset/Equipment & Critical Role · L7 AI Assessment & Evidence Validation · L8 AI Data Fusion & Gap Analysis |
| **Decision** (طبقات القرار) | L9 Training & Development Governance · L10 Dashboards, Reports & Decision Support |

See `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, and `docs/DECISIONS.md`.

## Tech stack

- **Frontend:** React + Vite + TypeScript, Tailwind, i18next (AR-RTL / EN-LTR), TanStack Query, Zustand, Recharts.
- **Backend:** Python FastAPI + SQLAlchemy 2.0 + Alembic.
- **Database:** PostgreSQL 16 + pgvector + Row-Level Security.
- **AI orchestration:** LangGraph-style engine graphs + LiteLLM model gateway (DeepSeek/Claude swappable) + pgvector evidence matching.
- **Workers:** Celery/RQ + Redis.
- **Infra:** Docker Compose (dev), OpenAPI docs, `.env`-driven config.

## Quick start (dev)

```bash
cp .env.example .env
docker compose up --build
# API   → http://localhost:8000/docs
# Web   → http://localhost:5173
```

Seed the database (foundation layers + bilingual reference data):

```bash
docker compose exec api python -m app.seed.seed_all
```

Run backend tests:

```bash
docker compose exec api pytest
```

## Build status

All 8 phases are implemented (see `docs/ARCHITECTURE.md` §Build Plan); decisions are logged in
`docs/DECISIONS.md`. CI runs unit, integration (Postgres+pgvector), and web-typecheck jobs.

### Definition of Done (§17) — status

- ✅ All 10 layers exist as modules with APIs, UIs, migrations, and seed data.
- ✅ Institutional hierarchy (NOC → … → Employee) is navigable and drives comparisons.
- ✅ L7 produces a competency result with evidence + confidence + audit trail, gated by governance.
- ✅ L8 produces every gap output and feeds L9 training governance with verified gaps.
- ✅ Before/During/After training writes impact back to the 360° Profile + Readiness Index.
- ✅ The 8 reports + Executive Dashboard render with seeded data, bilingual, RTL-correct.
- ✅ Layer Readiness Diagnostic, Pilot Entry Matrix, and Calibration/Scale-Up workflows function.
- ✅ RBAC, multi-tenant RLS, PII encryption, and audit logging are implemented and tested.
- ✅ Full Arabic (RTL) / English (LTR) parity across UI and reports.
- ⏳ Operational items beyond this repo: nationwide-scale load test and a formal a11y/RTL audit.

---

**Intelligent Readiness. Trusted Decisions.** · *الجاهزية الذكية. القرارات الموثوقة.*
