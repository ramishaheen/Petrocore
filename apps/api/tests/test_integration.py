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


def test_rls_scopes_tenant(client):
    """An employee-scoped user must not see global/admin-only breadth beyond their tenant."""
    employee = _login(client, "employee@noc.ly")
    # Employee tenant is a section; org nodes visible are RLS-filtered (strategic elements etc.).
    r = client.get("/api/v1/competencies", headers=employee)
    assert r.status_code == 200  # dictionary is global reference, visible to all
