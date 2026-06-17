# 360° PETROCORE — Demo Script

End-to-end walkthrough of the current build.

## 0. Start

```bash
cp .env.example .env
docker compose up --build
docker compose exec api alembic upgrade head        # apply schema + RLS
docker compose exec api python -m app.seed.seed_all  # bilingual seed data
```

Open **http://localhost:5173** (web) and **http://localhost:8000/docs** (API).

## 1. Sign in & switch language

Log in as `admin@petrocore.ly` / `petrocore123`. Toggle العربية / English in the sidebar —
the entire layout mirrors RTL ↔ LTR. Other seeded users: `exec@`, `hr@`, `manager@`,
`ld@`, `employee@noc.ly` (same password).

## 2. Institutional hierarchy (L1)

**Hierarchy** page renders the tenant tree: NOC → AGOCO / WAHA → Production (activity) →
Field Operations → Section A → Job → Employees. This tree drives every benchmark.

## 3. Competency Dictionary (L3)

**Competencies** lists the unified professional reference across all 6 families
(Technical, HSE, Behavioral, Leadership, Digital, Evidence Standards), bilingual.
`GET /competencies/families` returns admin levels 1–5 and proficiency bands.

## 4. Run an assessment (L7)

```bash
TOKEN=$(curl -s localhost:8000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"manager@noc.ly","password":"petrocore123"}' | jq -r .access_token)
curl -s localhost:8000/api/v1/assessments/run -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"employee_id":"<EMP_ID>","competency_id":"<COMP_ID>","item_scores":[0.4,0.5],"evidence_count":0}'
```

Low scores ⇒ low confidence ⇒ result status `PENDING_REVIEW` + a governance decision is opened.

## 5. Gap analysis (L8)

`POST /gaps/analyze/<employee_id>` fuses competency results into prioritized gaps and writes
the **Readiness Index** back to the profile. View on the **Gaps** page.

## 6. Governance gate (cross-cutting)

**Governance** page lists pending AI decisions. Approve/Reject as an authorized role — the
action is appended to the tamper-evident **audit hash chain** (verify with the chain indicator).

## 7. Executive dashboard (L10) & diagnostic

**Dashboard** shows the Workforce Readiness Index gauge, critical-job KPIs, top gaps, and the
8 executive modules. **Diagnostic** shows per-layer readiness (Ready / Needs Review / Needs Build).

## Tests

```bash
docker compose exec api pytest        # engine + security unit tests
```
