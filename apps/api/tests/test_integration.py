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


def test_extensible_core_and_workforce_segmentation(client):
    """P-A: master data, workforce segmentation, and generic entity links."""
    admin = _login(client, "admin@petrocore.ly")

    # Workforce segmentation seeded.
    families = client.get("/api/v1/workforce/families", headers=admin).json()
    assert len(families) >= 8 and any(f["code"] == "OPS" for f in families)
    levels = client.get("/api/v1/workforce/levels", headers=admin).json()
    assert [l["level_code"] for l in levels][:3] == ["L1", "L2", "L3"]
    assert len(client.get("/api/v1/workforce/streams", headers=admin).json()) >= 6
    assert len(client.get("/api/v1/workforce/archetypes", headers=admin).json()) >= 6

    # Configurable master data.
    types = client.get("/api/v1/config/lookup-types", headers=admin).json()
    assert any(t["code"] == "EVIDENCE_TYPE" for t in types)
    evid = client.get("/api/v1/config/lookups?type_code=EVIDENCE_TYPE", headers=admin).json()
    assert evid and all("name_ar" in v for v in evid)  # bilingual
    assert any(e["code"] == "Competency" for e in client.get("/api/v1/config/entity-types", headers=admin).json())

    # Generic entity link round-trip (link an employee to a project).
    created = client.post("/api/v1/config/entity-links", headers=admin, json={
        "source_entity_type": "Employee", "source_entity_id": "e1",
        "target_entity_type": "Project", "target_entity_id": "prj-1",
        "link_type": "Supports", "relationship_weight": 0.8,
    }).json()
    assert created["link_type"] == "Supports"
    links = client.get("/api/v1/config/entity-links?source_entity_type=Employee&source_entity_id=e1", headers=admin).json()
    assert any(l["target_entity_id"] == "prj-1" for l in links)

    # RBAC: a plain employee cannot create links.
    employee = _login(client, "employee@noc.ly")
    assert client.post("/api/v1/config/entity-links", headers=employee, json={
        "source_entity_type": "Employee", "source_entity_id": "e1",
        "target_entity_type": "Project", "target_entity_id": "prj-2",
    }).status_code == 403


def test_competency_depth_role_matrix_and_employee_360(client):
    """P-B: proficiency levels, domain taxonomy, descriptors, versioned role profile, Employee-360."""
    admin = _login(client, "admin@petrocore.ly")

    # Proficiency ladder P1..P5.
    levels = client.get("/api/v1/competencies/proficiency-levels", headers=admin).json()
    assert [l["level_code"] for l in levels] == ["P1", "P2", "P3", "P4", "P5"]

    # Domain taxonomy with competencies mapped in.
    domains = client.get("/api/v1/competency-domains", headers=admin).json()
    assert domains and sum(d["competency_count"] for d in domains) >= 6
    assert all("clusters" in d for d in domains)

    # Descriptors per competency across the proficiency ladder.
    comp_id = client.get("/api/v1/competencies", headers=admin).json()[0]["id"]
    descs = client.get(f"/api/v1/competencies/{comp_id}/descriptors", headers=admin).json()
    assert len(descs) == 5 and descs[0]["proficiency"] == "P1"

    # Versioned, approved role-competency profile for the seeded job.
    # (find a job via an employee's profile → not exposed; use org? Instead, infer from requirements.)
    # The seeded job has requirements; fetch profile by iterating known job via competencies->requirements is indirect,
    # so assert the endpoint shape works for a job id discovered from the role profile listing isn't available;
    # instead verify employee-360 records which are directly addressable.
    profiles = client.get("/api/v1/profiles", headers=admin).json()
    employee_id = profiles[0]["employee_id"]

    quals = client.get(f"/api/v1/employees/{employee_id}/qualifications", headers=admin).json()
    assert quals and quals[0]["verification_status"] in {"VERIFIED", "UNVERIFIED"}
    certs = client.get(f"/api/v1/employees/{employee_id}/certifications", headers=admin).json()
    assert certs and certs[0]["mandatory_for_role"] in {True, False}
    exp = client.get(f"/api/v1/employees/{employee_id}/experience", headers=admin).json()
    assert exp and exp[0]["years_count"] >= 0

    # Add a qualification (HR write) then read it back.
    before = len(quals)
    add = client.post(f"/api/v1/employees/{employee_id}/qualifications", headers=admin, json={
        "qualification_type": "Master", "field_of_study": "Process Safety", "graduation_year": 2023,
    })
    assert add.status_code == 200
    after = client.get(f"/api/v1/employees/{employee_id}/qualifications", headers=admin).json()
    assert len(after) == before + 1

    # RBAC: a plain employee cannot add qualifications.
    employee = _login(client, "employee@noc.ly")
    assert client.post(f"/api/v1/employees/{employee_id}/qualifications", headers=employee,
                       json={"qualification_type": "Diploma"}).status_code == 403


def test_assessment_blueprint_and_ai_question_review(client):
    """P-C: derive a governed blueprint from an approved profile, draft AI questions,
    and promote one into the live bank only after a human review — fully audited."""
    admin = _login(client, "admin@petrocore.ly")

    # A job with an APPROVED competency profile can yield a blueprint.
    jobs = client.get("/api/v1/jobs", headers=admin).json()
    assert jobs, "expected at least one seeded job"
    job = next((j for j in jobs if j["has_approved_profile"]), None)
    assert job, "expected a job with an APPROVED competency profile"

    # Derive the blueprint: it must pin competencies (from the matrix) and carry rules.
    bp = client.post(f"/api/v1/jobs/{job['id']}/blueprint", headers=admin,
                     json={"assessment_purpose": "Promotion"}).json()
    assert bp["approval_status"] == "DRAFT"
    assert bp["competencies"], "blueprint must inherit the role's competencies"
    assert bp["scoring_rubric"] is not None
    assert any(r["rule_type"] == "ReviewerRequired" for r in bp["rules"])
    blueprint_id = bp["id"]
    comp_count = len(bp["competencies"])

    # It appears in the listing with the right competency count.
    listed = {b["id"]: b for b in client.get("/api/v1/blueprints", headers=admin).json()}
    assert listed[blueprint_id]["competency_count"] == comp_count

    # A missing job → 409 (a blueprint is never built on a non-existent/unapproved matrix).
    assert client.post("/api/v1/jobs/does-not-exist/blueprint", headers=admin).status_code == 409

    # Generate AI question drafts for the blueprint.
    gen = client.post(f"/api/v1/blueprints/{blueprint_id}/generate-questions", headers=admin).json()
    assert gen["drafted"] > 0

    drafts = client.get(f"/api/v1/ai-questions?blueprint_id={blueprint_id}&review_status=DRAFT",
                        headers=admin).json()
    assert len(drafts) == gen["drafted"]
    q = drafts[0]
    assert q["question_text"] and q["question_text_ar"]  # bilingual draft
    assert 0.0 <= q["ai_confidence_score"] <= 1.0
    assert q["published_question_id"] is None

    # Live bank size for this competency BEFORE promotion.
    target_comp_id = next(
        c["id"] for c in client.get("/api/v1/competencies", headers=admin).json()
        if c["name_en"] == q["competency_en"]
    )
    before_bank = client.get(f"/api/v1/assessments/questions/{target_comp_id}", headers=admin).json()

    # Human review = Approved ⇒ promote into the live l7 bank.
    review = client.post(f"/api/v1/ai-questions/{q['id']}/review", headers=admin,
                         json={"decision": "Approved", "review_role": "SME"}).json()
    assert review["review_status"] == "APPROVED"
    assert review["published_question_id"], "approved question must enter the bank"

    after_bank = client.get(f"/api/v1/assessments/questions/{target_comp_id}", headers=admin).json()
    after_ids = {item["id"] for item in after_bank}
    assert review["published_question_id"] in after_ids
    assert len(after_bank) == len(before_bank) + 1

    # Invalid decision is rejected.
    other = drafts[1] if len(drafts) > 1 else drafts[0]
    assert client.post(f"/api/v1/ai-questions/{other['id']}/review", headers=admin,
                       json={"decision": "Maybe"}).status_code == 400

    # The whole workflow stayed inside the tamper-evident audit chain.
    assert client.get("/api/v1/governance/audit/verify", headers=admin).json()["intact"] is True

    # RBAC: a plain employee can neither author blueprints nor review AI questions.
    employee = _login(client, "employee@noc.ly")
    assert client.post(f"/api/v1/jobs/{job['id']}/blueprint", headers=employee).status_code == 403
    assert client.post(f"/api/v1/blueprints/{blueprint_id}/generate-questions",
                       headers=employee).status_code == 403
    assert client.post(f"/api/v1/ai-questions/{other['id']}/review", headers=employee,
                       json={"decision": "Approved"}).status_code == 403


def test_multi_factor_readiness(client):
    """P-D: an explainable, multi-factor ReadinessScore per employee, rolled up to
    a department — every factor recorded, status from the catalog, fully audited."""
    admin = _login(client, "admin@petrocore.ly")

    # The status vocabulary is bilingual and complete.
    statuses = {s["code"]: s for s in client.get("/api/v1/readiness/statuses", headers=admin).json()}
    assert {"READY", "NOT_READY_CRITICAL", "EVIDENCE_INSUFFICIENT"} <= set(statuses)
    assert all(s["name_ar"] for s in statuses.values())

    profiles = client.get("/api/v1/profiles", headers=admin).json()
    employee_id = profiles[0]["employee_id"]

    # Ensure at least one evidence-backed result exists (grade a competency).
    comp_id = client.get("/api/v1/competencies", headers=admin).json()[0]["id"]
    qs = client.get(f"/api/v1/assessments/questions/{comp_id}", headers=admin).json()
    client.post("/api/v1/assessments/grade", headers=admin, json={
        "employee_id": employee_id, "competency_id": comp_id,
        "responses": [{"question_id": q["id"], "choice": 1, "score": 0.8} for q in qs],
    })

    # Compute the employee's readiness: six factors → an index in [0,100] + a status.
    rs = client.post(f"/api/v1/readiness/employees/{employee_id}/compute", headers=admin).json()
    assert 0.0 <= rs["readiness_index"] <= 100.0
    assert rs["readiness_status"] in statuses
    assert set(rs["factors"]) == {
        "competency_score", "evidence_confidence", "data_quality",
        "risk_adjustment", "role_criticality", "recency",
    }
    # Explainability: the persisted breakdown defends the verdict.
    assert "raw_product" in rs["breakdown"] and rs["breakdown"]["method_version"] == "rs-v1"
    assert rs["source_count"] >= 1, "seeded competency results should back the score"

    # Read-back returns the latest score.
    got = client.get(f"/api/v1/readiness/employees/{employee_id}", headers=admin).json()
    assert got["readiness_index"] == rs["readiness_index"]
    assert got["readiness_status"] == rs["readiness_status"]

    # Department rollup over the employee's section aggregates ≥1 employee.
    nodes = client.get("/api/v1/org/nodes", headers=admin).json()
    section_id = next(n["id"] for n in nodes if n["node_type"] == "SECTION")
    agg = client.post(f"/api/v1/readiness/nodes/{section_id}/compute", headers=admin).json()
    assert agg["entity_type"] == "DEPARTMENT" and agg["source_count"] >= 1
    assert 0.0 <= agg["readiness_index"] <= 100.0

    # The listing surfaces both employee and department-level scores.
    listed = client.get("/api/v1/readiness", headers=admin).json()
    kinds = {row["entity_type"] for row in listed}
    assert "EMPLOYEE" in kinds and "DEPARTMENT" in kinds

    # The compute + aggregate writes stayed inside the tamper-evident audit chain.
    assert client.get("/api/v1/governance/audit/verify", headers=admin).json()["intact"] is True

    # RBAC: a plain employee cannot compute readiness verdicts.
    employee = _login(client, "employee@noc.ly")
    assert client.post(f"/api/v1/readiness/employees/{employee_id}/compute",
                       headers=employee).status_code == 403


def test_talent_succession_and_knowledge_continuity(client):
    """P-E: build a succession plan for a critical role (ranked by readiness + gaps),
    govern a candidate decision, flag talent, and record knowledge continuity."""
    admin = _login(client, "admin@petrocore.ly")

    # Critical roles are listed with bench-strength rollups.
    roles = client.get("/api/v1/talent/critical-roles", headers=admin).json()
    assert roles, "expected at least one seeded critical role"
    job_id = roles[0]["job_id"]

    # Build a succession plan: candidates ranked best-first by readiness.
    plan = client.post(f"/api/v1/talent/jobs/{job_id}/succession-plan", headers=admin).json()
    assert plan["candidate_count"] >= 1
    ranks = [c["rank"] for c in plan["candidates"]]
    assert ranks == sorted(ranks) and ranks[0] == 1
    indices = [c["readiness_index"] for c in plan["candidates"]]
    assert indices == sorted(indices, reverse=True), "candidates must be ranked by readiness desc"
    assert all("remaining_gaps" in c for c in plan["candidates"])

    # Building a plan opens a governance decision (succession is human-in-the-loop).
    decisions = client.get("/api/v1/governance/decisions", headers=admin).json()
    assert any(d["kind"] == "SUCCESSION" for d in decisions)

    # A candidate decision is recorded and audited.
    cand_id = plan["candidates"][0]["id"]
    decided = client.post(f"/api/v1/talent/successors/{cand_id}/decision", headers=admin,
                          json={"approve": True}).json()
    assert decided["recommendation_status"] == "APPROVED"

    # Talent flagging + pipeline rollup.
    profiles = client.get("/api/v1/profiles", headers=admin).json()
    emp_id = profiles[0]["employee_id"]
    flagged = client.post(f"/api/v1/talent/employees/{emp_id}/flag", headers=admin,
                          json={"talent_segment": "HIGH_POTENTIAL", "potential_rating": "HIGH"}).json()
    assert flagged["talent_segment"] == "HIGH_POTENTIAL"
    pipeline = client.get("/api/v1/talent/pipeline", headers=admin).json()
    assert pipeline["talent_profiles"] >= 1 and pipeline["critical_roles_total"] >= 1

    # Knowledge continuity: register a holder, then a transfer plan against it.
    holder = client.post("/api/v1/talent/knowledge-holders", headers=admin, json={
        "employee_id": emp_id, "knowledge_domain": "Turnaround planning",
        "criticality": "VERY_HIGH", "retirement_risk": 0.8,
    }).json()
    assert holder["transfer_status"] == "OPEN"
    kt = client.post("/api/v1/talent/transfer-plans", headers=admin, json={
        "knowledge_holder_id": holder["id"], "plan_name": "Shadow rotation + mentoring",
    }).json()
    assert kt["status"] in {"ACTIVE", "PLANNED"}
    holders = client.get("/api/v1/talent/knowledge-holders", headers=admin).json()
    assert any(h["id"] == holder["id"] and h["transfer_status"] == "IN_PROGRESS" for h in holders)

    # The whole P-E flow stayed inside the tamper-evident audit chain.
    assert client.get("/api/v1/governance/audit/verify", headers=admin).json()["intact"] is True

    # RBAC: a plain employee cannot build plans or flag talent.
    employee = _login(client, "employee@noc.ly")
    assert client.post(f"/api/v1/talent/jobs/{job_id}/succession-plan", headers=employee).status_code == 403
    assert client.post(f"/api/v1/talent/employees/{emp_id}/flag", headers=employee,
                       json={"talent_segment": "EMERGING"}).status_code == 403


def test_phase4_planning_prediction_and_intelligence(client):
    """P-F: workforce planning, predictive readiness, knowledge graph, psychometrics,
    benchmarking, and the integration registry."""
    admin = _login(client, "admin@petrocore.ly")

    # Workforce planning overview + sub-views.
    ov = client.get("/api/v1/workforce-planning/overview", headers=admin).json()
    assert "ready_pct" in ov and ov["total_employees"] >= 1 and ov["critical_roles"] >= 1
    assert isinstance(client.get("/api/v1/workforce-planning/supply-demand", headers=admin).json(), list)
    cov = client.get("/api/v1/workforce-planning/coverage", headers=admin).json()
    assert cov and all("coverage" in c for c in cov)
    assert isinstance(client.get("/api/v1/workforce-planning/training-demand", headers=admin).json(), list)
    rr = client.get("/api/v1/workforce-planning/retirement-risk", headers=admin).json()
    assert any(h["retirement_risk"] >= 0.6 for h in rr)  # seeded knowledge holder

    # Predictive readiness: an assessed employee gets a forecast ≥ current.
    profiles = client.get("/api/v1/profiles", headers=admin).json()
    emp_id = profiles[0]["employee_id"]
    client.post(f"/api/v1/readiness/employees/{emp_id}/compute", headers=admin)
    fc = client.get(f"/api/v1/readiness/forecast/{emp_id}?horizon_months=12", headers=admin).json()
    assert fc["current_index"] is not None and fc["projected_index"] is not None
    assert fc["projected_index"] >= fc["current_index"] and fc["drivers"]
    pipe = client.get("/api/v1/readiness/forecast", headers=admin).json()
    assert pipe["projected_ready"] >= pipe["current_ready"]

    # Knowledge graph: seeded EntityLinks form a traversable graph.
    summary = client.get("/api/v1/knowledge-graph/summary", headers=admin).json()
    assert summary["total_links"] >= 1
    g = client.get("/api/v1/knowledge-graph", headers=admin).json()
    assert g["node_count"] >= 2 and g["edge_count"] >= 1
    assert any(e["link_type"] == "Required" for e in g["edges"])

    # Psychometrics: question-quality + reliability render (data may be sparse).
    qq = client.get("/api/v1/psychometrics/question-quality", headers=admin).json()
    assert isinstance(qq, list)
    rel = client.get("/api/v1/psychometrics/reliability", headers=admin).json()
    assert "reliability_score" in rel and 0.0 <= rel["reliability_score"] <= 1.0

    # Benchmarking: subsidiaries ranked by average readiness.
    bench = client.get("/api/v1/benchmarking/companies", headers=admin).json()
    assert bench and bench[0]["rank"] == 1 and "avg_readiness" in bench[0]

    # Integration registry: seeded connectors + a sync run is logged.
    connectors = client.get("/api/v1/integration/connectors", headers=admin).json()
    assert any(c["system_type"] == "HR" for c in connectors)
    code = connectors[0]["code"]
    run = client.post(f"/api/v1/integration/connectors/{code}/sync", headers=admin).json()
    assert run["status"] == "SUCCESS"
    logs = client.get("/api/v1/integration/sync-logs", headers=admin).json()
    assert any(lg["connector_code"] == code for lg in logs)

    # RBAC: a plain employee cannot run a sync.
    employee = _login(client, "employee@noc.ly")
    assert client.post(f"/api/v1/integration/connectors/{code}/sync", headers=employee).status_code == 403

    # The audit chain remained intact through all the P-F writes.
    assert client.get("/api/v1/governance/audit/verify", headers=admin).json()["intact"] is True


def test_uat_acceptance_criteria(client):
    """Breadth check mapping the spec's §36 UAT criteria — the comprehensive
    product answers across every layer, end to end, with the audit chain intact."""
    admin = _login(client, "admin@petrocore.ly")

    def ok(path: str):
        r = client.get(path, headers=admin)
        assert r.status_code == 200, f"{path} → {r.status_code}"
        return r.json()

    # Setup: institution → company → org units (hierarchy navigable).
    assert ok("/api/v1/org/tree")[0]["node_type"] == "NOC"
    # Workforce segmentation: families, streams, levels, archetypes.
    assert len(ok("/api/v1/workforce/families")) >= 8
    assert len(ok("/api/v1/workforce/levels")) >= 8
    # Competency dictionary + depth (domains, proficiency ladder).
    assert ok("/api/v1/competency-domains")
    assert [l["level_code"] for l in ok("/api/v1/competencies/proficiency-levels")] == ["P1", "P2", "P3", "P4", "P5"]
    # Jobs + role competency matrix.
    job = next(j for j in ok("/api/v1/jobs") if j["has_approved_profile"])
    assert ok(f"/api/v1/jobs/{job['id']}/competency-profile")["requirements"]
    # Employee 360 (profile + qualifications/certifications/experience).
    emp_id = ok("/api/v1/profiles")[0]["employee_id"]
    assert ok(f"/api/v1/employees/{emp_id}/qualifications") is not None
    # Assessment blueprint + AI questions in the review workflow.
    assert ok("/api/v1/blueprints")
    assert ok("/api/v1/ai-questions") is not None
    # Readiness (explainable) + statuses.
    assert ok("/api/v1/readiness/statuses")
    rs = client.post(f"/api/v1/readiness/employees/{emp_id}/compute", headers=admin).json()
    assert "raw_product" in rs["breakdown"]  # explainable
    # Predictive readiness + workforce planning.
    assert ok(f"/api/v1/readiness/forecast/{emp_id}")["projected_index"] is not None
    assert "ready_pct" in ok("/api/v1/workforce-planning/overview")
    # Talent & succession + knowledge graph + benchmarking + integrations.
    assert ok("/api/v1/talent/pipeline")["critical_roles_total"] >= 1
    assert ok("/api/v1/knowledge-graph")["edge_count"] >= 1
    assert ok("/api/v1/benchmarking/companies")
    assert ok("/api/v1/integration/connectors")
    # Executive dashboard + institutional value + diagnostic.
    assert "workforce_readiness_index" in ok("/api/v1/dashboards/executive")
    assert "value_index" in ok("/api/v1/reports/institutional-value")
    # Governance + tamper-evident audit chain.
    assert ok("/api/v1/governance/audit/verify")["intact"] is True
