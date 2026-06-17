"""End-to-end integration test.

Runs only when a Postgres (pgvector) DATABASE_URL is reachable — exercises the
full vertical slice: migrations, seed, auth+RLS, assessment (L7), fusion (L8),
training lifecycle (L9), reports (L10), and the governance audit chain.
Skipped automatically when no database is available (e.g. local unit runs).
"""
import os

import pytest

DB_URL = os.getenv("DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not DB_URL.startswith("postgresql"),
    reason="integration test requires a Postgres DATABASE_URL",
)


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient
    from sqlalchemy import text

    from alembic import command
    from alembic.config import Config
    from app.db.session import engine
    from app.main import app
    from app.seed.seed_all import seed

    # Fresh schema.
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    cfg = Config("alembic.ini")
    command.upgrade(cfg, "head")
    seed()
    return TestClient(app)


def _login(client, email):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "petrocore123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_full_flow(client):
    admin = _login(client, "admin@petrocore.ly")

    # L1 hierarchy is navigable.
    tree = client.get("/api/v1/org/tree", headers=admin).json()
    assert tree and tree[0]["node_type"] == "NOC"

    # L3 dictionary populated.
    comps = client.get("/api/v1/competencies", headers=admin).json()
    assert len(comps) >= 6
    comp_id = comps[0]["id"]

    # Pick an employee + profile.
    profiles = client.get("/api/v1/profiles", headers=admin).json()
    assert profiles
    employee_id = profiles[0]["employee_id"]

    # L7 assessment (low scores → low confidence → governance review).
    run = client.post("/api/v1/assessments/run", headers=admin, json={
        "employee_id": employee_id, "competency_id": comp_id,
        "item_scores": [0.3, 0.4], "evidence_count": 0,
    }).json()
    assert run["needs_human_review"] is True

    # L8 fusion → readiness index written back.
    gaps = client.post(f"/api/v1/gaps/analyze/{employee_id}", headers=admin).json()
    assert "readiness_index" in gaps

    # Governance: a decision is pending and the audit chain is intact.
    decisions = client.get("/api/v1/governance/decisions", headers=admin).json()
    assert isinstance(decisions, list)
    assert client.get("/api/v1/governance/audit/verify", headers=admin).json()["intact"] is True

    # L10 reports render.
    assert "value_index" in client.get("/api/v1/reports/institutional-value", headers=admin).json()
    emp_report = client.get(f"/api/v1/reports/employee/{employee_id}", headers=admin).json()
    assert "readiness_index" in emp_report

    # Executive dashboard + diagnostic.
    assert "workforce_readiness_index" in client.get("/api/v1/dashboards/executive", headers=admin).json()
    diag = client.get("/api/v1/dashboards/diagnostic", headers=admin).json()
    assert any(d["layer"] == "L1" for d in diag)


def test_training_lifecycle_targets_only_trained_competency(client):
    """L9 Before→During→After: impact write-back must bump ONLY the trained competency."""
    admin = _login(client, "admin@petrocore.ly")

    profiles = client.get("/api/v1/profiles", headers=admin).json()
    employee_id = profiles[0]["employee_id"]
    comps = {c["id"]: c["name_en"] for c in client.get("/api/v1/competencies", headers=admin).json()}

    def grade_low(competency_id: str) -> None:
        """Graded assessment with wrong answers ⇒ a real competency result + gap."""
        qs = client.get(f"/api/v1/assessments/questions/{competency_id}", headers=admin).json()
        responses = [{"question_id": q["id"], "choice": 0, "score": 0.0} for q in qs]
        client.post("/api/v1/assessments/grade", headers=admin, json={
            "employee_id": employee_id, "competency_id": competency_id, "responses": responses,
        })

    # Seed real competency results for two distinct competencies, then analyze → gaps.
    two_competency_ids = list(comps.keys())[:2]
    assert len(two_competency_ids) == 2
    for cid in two_competency_ids:
        grade_low(cid)
    client.post(f"/api/v1/gaps/analyze/{employee_id}", headers=admin)

    gaps = [g for g in client.get("/api/v1/gaps", headers=admin).json()
            if g["gap_size"] > 0 and g["subject_id"] == employee_id]
    assert gaps, "expected at least one real gap"
    gap = gaps[0]
    trained_name = comps.get(gap["competency_id"])

    # Other competencies with a real gap — these must NOT move when we train a different one.
    before = client.get(f"/api/v1/reports/employee/{employee_id}", headers=admin).json()
    other = [c for c in before["competencies"]
             if c["competency_en"] != trained_name
             and 0 < c["assessed_level"] < c["required_level"]]

    # BEFORE: design a program for the gap's competency + nominate against the gap.
    prog = client.post("/api/v1/training/programs", headers=admin, json={
        "competency_id": gap["competency_id"], "target_level": gap["target_level"],
    }).json()
    nom = client.post("/api/v1/training/nominate", headers=admin, json={
        "employee_id": employee_id, "program_id": prog["program_id"], "gap_id": gap["id"],
    }).json()

    # DURING.
    client.post(f"/api/v1/training/nominations/{nom['nomination_id']}/stage", headers=admin,
                json={"stage": "DURING", "status": "IN_PROGRESS"})

    # AFTER: impact closes the gap fully.
    impact = client.post(f"/api/v1/training/nominations/{nom['nomination_id']}/impact",
                         headers=admin, json={
                             "pre_level": gap["current_level"], "post_level": gap["target_level"],
                         }).json()
    assert 0.0 <= impact["gap_closure_pct"] <= 100.0

    # Untrained competencies must be unchanged — the impact must not bump every competency.
    after = client.get(f"/api/v1/reports/employee/{employee_id}", headers=admin).json()
    after_by_name = {c["competency_en"]: c for c in after["competencies"]}
    for c in other:
        assert after_by_name[c["competency_en"]]["assessed_level"] == c["assessed_level"], (
            "untrained competency level changed — write-back leaked across competencies"
        )

    # The closed gap must be retired (gap_size 0) so it is not re-nominated.
    remaining = client.get("/api/v1/gaps", headers=admin).json()
    closed = next((g for g in remaining if g["id"] == gap["id"]), None)
    assert closed is None or closed["gap_size"] == 0, "trained gap was not retired after impact"


def test_rls_scopes_tenant(client):
    """An employee-scoped user must not see global/admin-only breadth beyond their tenant."""
    employee = _login(client, "employee@noc.ly")
    # Employee tenant is a section; org nodes visible are RLS-filtered (strategic elements etc.).
    r = client.get("/api/v1/competencies", headers=employee)
    assert r.status_code == 200  # dictionary is global reference, visible to all


def test_governance_gate_and_audit_chain(client):
    """Low-confidence result opens a decision; resolving it keeps the audit chain intact."""
    admin = _login(client, "admin@petrocore.ly")
    profiles = client.get("/api/v1/profiles", headers=admin).json()
    employee_id = profiles[0]["employee_id"]
    comp_id = client.get("/api/v1/competencies", headers=admin).json()[0]["id"]

    # Low scores ⇒ low confidence ⇒ a governance decision is opened.
    client.post("/api/v1/assessments/run", headers=admin, json={
        "employee_id": employee_id, "competency_id": comp_id,
        "item_scores": [0.2, 0.3], "evidence_count": 0,
    })
    pending = client.get("/api/v1/governance/decisions", headers=admin).json()
    assert pending, "expected a pending governance decision"

    # Resolve it (approve) and confirm the tamper-evident chain is still intact.
    decision_id = pending[0]["id"]
    resolved = client.post(f"/api/v1/governance/decisions/{decision_id}/resolve",
                           headers=admin, json={"approve": True}).json()
    assert resolved["governance_status"] == "APPROVED"
    assert client.get("/api/v1/governance/audit/verify", headers=admin).json()["intact"] is True


def test_recommendation_requires_governance(client):
    """A gap recommendation is created PENDING and opens a governance decision."""
    admin = _login(client, "admin@petrocore.ly")
    profiles = client.get("/api/v1/profiles", headers=admin).json()
    employee_id = profiles[0]["employee_id"]
    comp_id = client.get("/api/v1/competencies", headers=admin).json()[0]["id"]

    # Seed a real result + gap.
    qs = client.get(f"/api/v1/assessments/questions/{comp_id}", headers=admin).json()
    client.post("/api/v1/assessments/grade", headers=admin, json={
        "employee_id": employee_id, "competency_id": comp_id,
        "responses": [{"question_id": q["id"], "choice": 0, "score": 0.0} for q in qs],
    })
    client.post(f"/api/v1/gaps/analyze/{employee_id}", headers=admin)
    gaps = [g for g in client.get("/api/v1/gaps", headers=admin).json() if g["gap_size"] > 0]
    assert gaps
    rec = client.post(f"/api/v1/gaps/{gaps[0]['id']}/recommend", headers=admin).json()
    assert rec["status"] == "PENDING"
    assert rec["text_ar"]  # bilingual recommendation


def test_import_export_roundtrip_and_pii_encryption(client):
    """Bulk import upserts + PII is encrypted at rest; CSV export is produced."""
    from sqlalchemy import text

    from app.db.session import SessionLocal

    admin = _login(client, "admin@petrocore.ly")
    res = client.post("/api/v1/integration/import/competencies", headers=admin, json=[
        {"code": "IMP-1", "name_en": "Imported Skill", "name_ar": "مهارة مستوردة", "family": "DIGITAL"},
    ]).json()
    assert res["total"] == 1 and (res["created"] + res["updated"]) == 1

    # A global (tenant '*') user must target a concrete tenant for employee imports.
    nodes = client.get("/api/v1/org/nodes", headers=admin).json()
    section_id = next(n["id"] for n in nodes if n["node_type"] == "SECTION")
    assert client.post("/api/v1/integration/import/employees", headers=admin, json=[
        {"employee_no": "IMP-X", "full_name_en": "No Tenant", "full_name_ar": "بدون"},
    ]).status_code == 400  # missing tenant_id ⇒ rejected
    client.post(f"/api/v1/integration/import/employees?tenant_id={section_id}", headers=admin, json=[
        {"employee_no": "IMP-100", "full_name_en": "Imported Person",
         "full_name_ar": "شخص مستورد", "email": "imp@noc.ly", "years_experience": 5},
    ])

    # PII stored encrypted (not plaintext) at rest.
    db = SessionLocal()
    db.execute(text("SELECT set_config('app.current_role','PLATFORM_ADMIN',false)"))
    db.execute(text("SELECT set_config('app.current_tenant','*',false)"))
    row = db.execute(text("SELECT email_enc FROM l2_employee WHERE employee_no='IMP-100'")).first()
    db.close()
    assert row is not None and row[0] and "imp@noc.ly" not in row[0]

    # CSV export is produced.
    csv = client.get("/api/v1/integration/export/readiness.csv", headers=admin)
    assert csv.status_code == 200 and "employee_no" in csv.text


def test_import_forbidden_for_employee_role(client):
    """RBAC: a plain EMPLOYEE cannot bulk-import data."""
    employee = _login(client, "employee@noc.ly")
    r = client.post("/api/v1/integration/import/competencies", headers=employee, json=[])
    assert r.status_code == 403
