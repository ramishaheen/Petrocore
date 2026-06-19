"""Seed Phase P-B data: proficiency levels, competency taxonomy + descriptors,
versioned role-competency profile, and Employee-360 records (idempotent)."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.competency_v2 import (
    CompetencyCluster, CompetencyDescriptor, CompetencyDomain, CompetencyTaxonomy,
    EvidenceRequirementProfile, ProficiencyLevel, RoleCompetencyProfile, RoleCompetencyRequirement,
)
from app.models.employee_360 import EmployeeCertification, EmployeeExperience, EmployeeQualification
from app.models.l1_l2 import Employee, Job
from app.models.l3_l4 import Competency, CompetencyRequirement

PROFICIENCY = [
    ("P1", "Awareness", "وعي", 1), ("P2", "Basic", "أساسي", 2), ("P3", "Working", "عملي", 3),
    ("P4", "Advanced", "متقدم", 4), ("P5", "Expert", "خبير", 5),
]
# Map the flat competency family → a domain.
FAMILY_DOMAIN = {
    "TECHNICAL": ("TECH", "Technical & Operational", "تقنية وتشغيلية", "Technical"),
    "HSE": ("HSE", "HSE & Process Safety", "السلامة وسلامة العمليات", "Technical"),
    "BEHAVIORAL": ("BEH", "Behavioral & Professional", "سلوكية ومهنية", "Behavioral"),
    "LEADERSHIP": ("LEAD", "Leadership", "قيادية", "Leadership"),
    "DIGITAL": ("DIG", "Digital, Data & Technology", "رقمية وبيانات", "Digital"),
    "EVIDENCE_STANDARD": ("EVD", "Evidence Standards", "معايير الأدلة", "Behavioral"),
}


def seed_b(db: Session) -> None:
    if db.query(ProficiencyLevel).count() > 0:
        return

    levels = {}
    for code, en, ar, rank in PROFICIENCY:
        pl = ProficiencyLevel(level_code=code, name_en=en, name_ar=ar, level_rank=rank)
        db.add(pl)
        db.flush()
        levels[rank] = pl
    by_code = {pl.level_code: pl for pl in levels.values()}

    competencies = db.execute(select(Competency)).scalars().all()
    # Domains + one cluster each, keyed by family.
    domains: dict[str, CompetencyDomain] = {}
    clusters: dict[str, CompetencyCluster] = {}
    for fam, (code, en, ar, dtype) in FAMILY_DOMAIN.items():
        d = CompetencyDomain(code=code, name_en=en, name_ar=ar, domain_type=dtype)
        db.add(d)
        db.flush()
        domains[fam] = d
        cl = CompetencyCluster(domain_id=d.id, code=f"{code}-C1", name_en=f"{en} — Core", name_ar=f"{ar} — أساسية")
        db.add(cl)
        db.flush()
        clusters[fam] = cl

    for c in competencies:
        dom = domains.get(c.family)
        if dom:
            db.add(CompetencyTaxonomy(competency_id=c.id, domain_id=dom.id, cluster_id=clusters[c.family].id))
        # Descriptors for every proficiency level.
        for rank, pl in levels.items():
            db.add(CompetencyDescriptor(
                competency_id=c.id, proficiency_level_id=pl.id,
                knowledge_indicator=f"{c.name_en}: knowledge at {pl.name_en} level.",
                skill_indicator=f"{c.name_en}: applies at {pl.name_en} level.",
                behavioral_indicator="Consistent, safe, professional conduct.",
                evidence_expected="Assessment result + supporting evidence.",
            ))
        # Evidence requirement.
        db.add(EvidenceRequirementProfile(
            competency_id=c.id, evidence_type_code="CERT" if c.family == "HSE" else "TEST",
            mandatory_flag=c.family == "HSE", minimum_confidence_required=0.7,
        ))

    # Versioned role-competency profile for each seeded job, from existing requirements.
    for job in db.execute(select(Job)).scalars().all():
        reqs = db.execute(
            select(CompetencyRequirement).where(CompetencyRequirement.job_id == job.id)
        ).scalars().all()
        if not reqs:
            continue
        profile = RoleCompetencyProfile(
            tenant_id=job.tenant_id, job_id=job.id,
            profile_name=f"{job.title_en} — Competency Profile",
            profile_version=1, effective_from=date(2026, 1, 1), approval_status="APPROVED",
        )
        db.add(profile)
        db.flush()
        for r in reqs:
            pl = by_code.get(f"P{max(1, min(5, r.required_level))}")
            db.add(RoleCompetencyRequirement(
                tenant_id=job.tenant_id, profile_id=profile.id, competency_id=r.competency_id,
                required_proficiency_level_id=pl.id,
                requirement_type="Essential" if r.risk_weight >= 2 else "Important",
                dimension="Technical", weight=r.risk_weight,
                criticality_level="HIGH" if r.risk_weight >= 2 else "MED",
                assessment_method="Scenario" if r.risk_weight >= 2 else "Test",
            ))

    # Employee-360 records for the first few employees.
    emps = db.execute(select(Employee)).scalars().all()[:3]
    for i, e in enumerate(emps):
        db.add(EmployeeQualification(
            tenant_id=e.tenant_id, employee_id=e.id, qualification_type="Bachelor",
            field_of_study="Petroleum Engineering" if i == 0 else "Mechanical Engineering",
            institution_name="University of Tripoli", graduation_year=2014 + i,
            relevance_to_role="HIGH", verification_status="VERIFIED",
        ))
        db.add(EmployeeCertification(
            tenant_id=e.tenant_id, employee_id=e.id, certification_name="IOSH Managing Safely",
            issuing_body="IOSH", certification_type="HSE",
            issue_date=date(2024, 3, 1), expiry_date=date(2027, 3, 1),
            mandatory_for_role=True, verification_status="VERIFIED",
        ))
        db.add(EmployeeExperience(
            tenant_id=e.tenant_id, employee_id=e.id, experience_type="Functional",
            organization_name="AGOCO", role_title="Operator",
            start_date=date(2015, 1, 1), years_count=8 + i,
            relevance_to_current_role="HIGH", verified_flag=True,
        ))
    db.flush()
