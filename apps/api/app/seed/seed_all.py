"""Seed bilingual foundation + intelligence data so the platform runs end-to-end.

Run: python -m app.seed.seed_all
"""
from __future__ import annotations

from sqlalchemy import text

from app.core.rbac import Role
from app.core.security import encrypt_pii, hash_password
from app.db.session import SessionLocal
from app.models.l1_l2 import Employee, Job, OrgNode, StrategicElement
from app.models.l3_l4 import Competency, CompetencyRequirement, DepartmentPlan, OperationalRequirement
from app.models.l5_l6 import CriticalRole, Profile
from app.models.user import AppUser

SEGMENTS = [
    ("EXPLORATION", "Exploration", "الاستكشاف"),
    ("DRILLING", "Drilling", "الحفر"),
    ("PRODUCTION", "Production", "الإنتاج"),
    ("PROCESSING", "Processing", "المعالجة"),
    ("REFINING", "Refining", "التكرير"),
    ("PETROCHEMICALS", "Petrochemicals", "البتروكيماويات"),
    ("STORAGE_TRANSPORT", "Storage & Transportation", "النقل والتخزين"),
]

COMPETENCIES = [
    ("TECH-WELL", "Well Operations", "عمليات الآبار", "TECHNICAL"),
    ("TECH-PROC", "Process Control", "التحكم في العمليات", "TECHNICAL"),
    ("HSE-PSM", "Process Safety Management", "إدارة سلامة العمليات", "HSE"),
    ("HSE-EMRG", "Emergency Response", "الاستجابة للطوارئ", "HSE"),
    ("BEH-COMM", "Communication", "التواصل", "BEHAVIORAL"),
    ("LEAD-DEC", "Decision Making", "اتخاذ القرار", "LEADERSHIP"),
    ("DIG-DATA", "Data & Digital Literacy", "الثقافة الرقمية والبيانات", "DIGITAL"),
    ("EVD-DOC", "Evidence Documentation", "توثيق الأدلة", "EVIDENCE_STANDARD"),
]


def _node(db, parent, node_type, code, en, ar, segment=None) -> OrgNode:
    n = OrgNode(
        parent_id=parent.id if parent else None, node_type=node_type, code=code,
        name_en=en, name_ar=ar, activity_segment=segment,
        path=(parent.path + "/" + (parent.id or "") if parent else ""),
    )
    db.add(n)
    db.flush()
    n.path = (parent.path + "/" + n.id) if parent else n.id
    db.flush()
    return n


def seed() -> None:
    db = SessionLocal()
    # Bypass RLS during seeding.
    db.execute(text("SELECT set_config('app.current_role', 'PLATFORM_ADMIN', false)"))
    db.execute(text("SELECT set_config('app.current_tenant', '*', false)"))
    try:
        if db.query(OrgNode).count() > 0:
            print("Already seeded — skipping.")
            return

        # ---- L1: institutional hierarchy / tenant tree ----
        noc = _node(db, None, "NOC", "NOC", "National Oil Corporation", "المؤسسة الوطنية للنفط")
        sub_a = _node(db, noc, "SUBSIDIARY", "AGOCO", "Arabian Gulf Oil Co.", "شركة الخليج العربي للنفط")
        sub_b = _node(db, noc, "SUBSIDIARY", "WAHA", "Waha Oil Co.", "شركة الواحة للنفط")

        prod = _node(db, sub_a, "ACTIVITY", "PROD", "Production", "الإنتاج", "PRODUCTION")
        dept = _node(db, prod, "DEPARTMENT", "OPS", "Field Operations", "عمليات الحقل")
        section = _node(db, dept, "SECTION", "OPS-A", "Operations Section A", "قسم العمليات أ")

        db.add(StrategicElement(
            node_id=noc.id, tenant_id=noc.id, kind="CORPORATE_STRATEGY",
            title_en="Workforce Readiness 2030", title_ar="جاهزية القوى العاملة 2030",
            body_en="Unified professional reference for competency & readiness.",
            body_ar="مرجعية مهنية موحدة للجدارة والجاهزية.",
        ))

        # ---- L3: competency dictionary ----
        comps: dict[str, Competency] = {}
        for code, en, ar, fam in COMPETENCIES:
            c = Competency(code=code, name_en=en, name_ar=ar, family=fam,
                           description_en=f"{en} competency.", description_ar=f"جدارة {ar}.")
            db.add(c)
            db.flush()
            comps[code] = c

        # ---- L2: jobs + employees (scoped to section tenant) ----
        tenant = section.id
        job = Job(tenant_id=tenant, code="OP-3", title_en="Senior Field Operator",
                  title_ar="مشغل حقل أول", job_family="Operations", admin_level=2,
                  activity_segment="PRODUCTION")
        db.add(job)
        db.flush()

        # ---- L3: calibrated requirements for the job ----
        for code, req in [("TECH-WELL", 4), ("HSE-PSM", 5), ("BEH-COMM", 3), ("DIG-DATA", 3)]:
            db.add(CompetencyRequirement(
                competency_id=comps[code].id, job_id=job.id, admin_level=2,
                required_level=req, min_experience_band="INDEPENDENT",
                risk_weight=2.0 if code.startswith("HSE") else 1.0,
                activity_segment="PRODUCTION",
            ))

        employees = []
        for i, (en, ar) in enumerate([
            ("Ahmed Al-Mansouri", "أحمد المنصوري"),
            ("Fatima Al-Zawawi", "فاطمة الزواوي"),
            ("Khalid Bin Omar", "خالد بن عمر"),
        ], start=1):
            emp = Employee(
                tenant_id=tenant, employee_no=f"E-{1000+i}", full_name_en=en, full_name_ar=ar,
                email_enc=encrypt_pii(f"emp{i}@noc.ly"), national_id_enc=encrypt_pii(f"ID{i:06d}"),
                years_experience=4 + i, current_job_id=job.id, section_id=section.id,
            )
            db.add(emp)
            db.flush()
            employees.append(emp)
            db.add(Profile(tenant_id=tenant, employee_id=emp.id, readiness_index=0.0, status="DRAFT"))

        # ---- L4: department plan + operational requirements ----
        plan = DepartmentPlan(tenant_id=tenant, period="2026",
                              objectives_en="Improve OEE & safety readiness.",
                              objectives_ar="تحسين الكفاءة التشغيلية وجاهزية السلامة.")
        db.add(plan)
        db.flush()
        db.add(OperationalRequirement(
            tenant_id=tenant, plan_id=plan.id,
            title_en="Process safety certification for all operators",
            title_ar="اعتماد سلامة العمليات لجميع المشغلين",
            required_competency_id=comps["HSE-PSM"].id,
            criticality="VERY_HIGH", readiness_priority="VERY_HIGH",
        ))

        # ---- L6: critical role ----
        db.add(CriticalRole(tenant_id=tenant, job_id=job.id, criticality="VERY_HIGH",
                            loss_risk=0.7, business_impact=0.8))

        # ---- L7: smart question bank (2 items per competency) ----
        from app.models.l7_l8 import Evidence, Question
        from app.services.engines.evidence_engine import embed_text

        for code, comp in comps.items():
            for d, kind in [(2, "MCQ"), (4, "SCENARIO")]:
                db.add(Question(
                    competency_id=comp.id, kind=kind, difficulty=d,
                    body_en=f"[{kind}] Demonstrate {comp.name_en} at level {d}.",
                    body_ar=f"[{kind}] أظهر {comp.name_ar} عند المستوى {d}.",
                    options={"choices": ["A", "B", "C", "D"]} if kind == "MCQ" else {},
                    answer_key={"correct": 1} if kind == "MCQ" else {},
                ))

        # ---- L7: supporting evidence for the first employee (indexed for matching) ----
        for kind, txt in [
            ("CERTIFICATE", "Process safety management certification, IOSH, 2025."),
            ("TRAINING_RECORD", "Completed advanced well operations course with distinction."),
            ("PERFORMANCE", "Led shift with zero safety incidents over 12 months."),
        ]:
            db.add(Evidence(
                tenant_id=tenant, employee_id=employees[0].id, kind=kind, text=txt,
                embedding=embed_text(txt), confidence=0.8,
            ))

        # ---- Users: one per role ----
        users = [
            ("admin@petrocore.ly", "Platform Admin", Role.PLATFORM_ADMIN, "*"),
            ("exec@noc.ly", "NOC Executive", Role.NOC_EXECUTIVE, "*"),
            ("hr@noc.ly", "HR Validator", Role.HR_VALIDATOR, tenant),
            ("manager@noc.ly", "Line Manager", Role.LINE_MANAGER, tenant),
            ("ld@noc.ly", "L&D Manager", Role.LD_MANAGER, tenant),
            ("employee@noc.ly", "Employee", Role.EMPLOYEE, tenant),
        ]
        for email, name, role, tid in users:
            db.add(AppUser(
                email=email, full_name=name, hashed_password=hash_password("petrocore123"),
                role=role.value, tenant_id=tid,
                employee_id=employees[0].id if role == Role.EMPLOYEE else None,
            ))

        # ---- Extensible core + workforce segmentation (System Analysis P-A) ----
        from app.seed.seed_core import seed_core
        seed_core(db)
        # ---- Competency depth + role matrix + Employee 360 (P-B) ----
        from app.seed.seed_b import seed_b
        seed_b(db)
        # ---- Scoring rubrics + governed blueprints + AI question queue (P-C) ----
        from app.seed.seed_c import seed_c
        seed_c(db)
        # ---- Evidence-backed results + multi-factor readiness scores (P-D) ----
        from app.seed.seed_d import seed_d
        seed_d(db)
        # ---- Talent, succession & knowledge continuity (P-E) ----
        from app.seed.seed_e import seed_e
        seed_e(db)
        # ---- Knowledge-graph links + integration connectors (P-F) ----
        from app.seed.seed_f import seed_f
        seed_f(db)
        # ---- Assessment execution split + question bank (P-G) ----
        from app.seed.seed_g import seed_g
        seed_g(db)
        # ---- Development plans (P-H) ----
        from app.seed.seed_h import seed_h
        seed_h(db)

        db.commit()
        print("Seed complete.")
        print("  Login: admin@petrocore.ly / petrocore123 (and exec@/hr@/manager@/ld@/employee@noc.ly)")
        print(f"  Tenant (section): {tenant}")
        print(f"  Segments: {', '.join(s[0] for s in SEGMENTS)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
