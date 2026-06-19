"""Phase P-B APIs: competency depth, versioned role matrix, Employee-360 records."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db_for, require_roles
from app.core.rbac import Role
from app.models.competency_v2 import (
    CompetencyCluster, CompetencyDescriptor, CompetencyDomain, CompetencyTaxonomy,
    ProficiencyLevel, RoleCompetencyProfile, RoleCompetencyRequirement,
)
from app.models.employee_360 import EmployeeCertification, EmployeeExperience, EmployeeQualification
from app.models.l3_l4 import Competency
from app.services.engines.governance import append_audit

router = APIRouter(tags=["P-B · Competency Depth & Employee 360"])

_hr = require_roles(Role.HR_VALIDATOR, Role.COMPANY_ADMIN, Role.PLATFORM_ADMIN, Role.CONSULTANT)


# ---------------------------------------------------------------- taxonomy
@router.get("/competencies/proficiency-levels")
def proficiency_levels(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(ProficiencyLevel).order_by(ProficiencyLevel.level_rank)).scalars().all()
    return [{"id": p.id, "level_code": p.level_code, "name_en": p.name_en, "name_ar": p.name_ar,
             "level_rank": p.level_rank} for p in rows]


@router.get("/competency-domains")
def competency_domains(db: Session = Depends(get_db_for)) -> list[dict]:
    domains = db.execute(select(CompetencyDomain).order_by(CompetencyDomain.code)).scalars().all()
    clusters = db.execute(select(CompetencyCluster)).scalars().all()
    counts = dict(db.execute(
        select(CompetencyTaxonomy.domain_id, func.count(CompetencyTaxonomy.id)).group_by(CompetencyTaxonomy.domain_id)
    ).all())
    return [
        {"id": d.id, "code": d.code, "name_en": d.name_en, "name_ar": d.name_ar,
         "domain_type": d.domain_type, "competency_count": counts.get(d.id, 0),
         "clusters": [{"id": c.id, "name_en": c.name_en, "name_ar": c.name_ar}
                      for c in clusters if c.domain_id == d.id]}
        for d in domains
    ]


@router.get("/competencies/{competency_id}/descriptors")
def descriptors(competency_id: str, db: Session = Depends(get_db_for)) -> list[dict]:
    levels = {p.id: p for p in db.execute(select(ProficiencyLevel)).scalars().all()}
    rows = db.execute(
        select(CompetencyDescriptor).where(CompetencyDescriptor.competency_id == competency_id)
    ).scalars().all()
    rows.sort(key=lambda d: levels[d.proficiency_level_id].level_rank if d.proficiency_level_id in levels else 0)
    return [
        {"proficiency": levels[d.proficiency_level_id].level_code if d.proficiency_level_id in levels else "?",
         "proficiency_en": levels[d.proficiency_level_id].name_en if d.proficiency_level_id in levels else "",
         "knowledge_indicator": d.knowledge_indicator, "skill_indicator": d.skill_indicator,
         "behavioral_indicator": d.behavioral_indicator, "evidence_expected": d.evidence_expected}
        for d in rows
    ]


# ---------------------------------------------------------------- role matrix
@router.get("/jobs/{job_id}/competency-profile")
def role_profile(job_id: str, db: Session = Depends(get_db_for)) -> dict:
    """Latest approved role-competency profile + its requirements."""
    profile = db.execute(
        select(RoleCompetencyProfile)
        .where(RoleCompetencyProfile.job_id == job_id, RoleCompetencyProfile.approval_status == "APPROVED")
        .order_by(RoleCompetencyProfile.profile_version.desc())
    ).scalars().first()
    if not profile:
        return {"job_id": job_id, "profile": None, "requirements": []}
    comp = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    levels = {p.id: p for p in db.execute(select(ProficiencyLevel)).scalars().all()}
    reqs = db.execute(
        select(RoleCompetencyRequirement).where(RoleCompetencyRequirement.profile_id == profile.id)
    ).scalars().all()
    return {
        "job_id": job_id,
        "profile": {"id": profile.id, "name": profile.profile_name, "version": profile.profile_version,
                    "approval_status": profile.approval_status},
        "requirements": [
            {"competency_en": comp[r.competency_id].name_en if r.competency_id in comp else r.competency_id,
             "competency_ar": comp[r.competency_id].name_ar if r.competency_id in comp else r.competency_id,
             "required_level": levels[r.required_proficiency_level_id].level_code if r.required_proficiency_level_id in levels else "?",
             "requirement_type": r.requirement_type, "dimension": r.dimension, "weight": r.weight,
             "criticality_level": r.criticality_level, "assessment_method": r.assessment_method}
            for r in reqs
        ],
    }


# ---------------------------------------------------------------- Employee 360
@router.get("/employees/{employee_id}/qualifications")
def qualifications(employee_id: str, db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(
        select(EmployeeQualification).where(EmployeeQualification.employee_id == employee_id)
    ).scalars().all()
    return [{"id": q.id, "qualification_type": q.qualification_type, "field_of_study": q.field_of_study,
             "institution_name": q.institution_name, "graduation_year": q.graduation_year,
             "relevance_to_role": q.relevance_to_role, "verification_status": q.verification_status} for q in rows]


@router.get("/employees/{employee_id}/certifications")
def certifications(employee_id: str, db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(
        select(EmployeeCertification).where(EmployeeCertification.employee_id == employee_id)
    ).scalars().all()
    return [{"id": c.id, "certification_name": c.certification_name, "issuing_body": c.issuing_body,
             "certification_type": c.certification_type, "issue_date": str(c.issue_date) if c.issue_date else None,
             "expiry_date": str(c.expiry_date) if c.expiry_date else None,
             "mandatory_for_role": c.mandatory_for_role, "verification_status": c.verification_status} for c in rows]


@router.get("/employees/{employee_id}/experience")
def experience(employee_id: str, db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(
        select(EmployeeExperience).where(EmployeeExperience.employee_id == employee_id)
    ).scalars().all()
    return [{"id": x.id, "experience_type": x.experience_type, "organization_name": x.organization_name,
             "role_title": x.role_title, "years_count": x.years_count,
             "relevance_to_current_role": x.relevance_to_current_role, "verified_flag": x.verified_flag} for x in rows]


class QualificationIn(BaseModel):
    qualification_type: str
    field_of_study: str = ""
    institution_name: str = ""
    graduation_year: int | None = None
    relevance_to_role: str = "MED"


@router.post("/employees/{employee_id}/qualifications")
def add_qualification(
    employee_id: str,
    body: QualificationIn,
    user: CurrentUser = Depends(_hr),
    db: Session = Depends(get_db_for),
) -> dict:
    from app.models.l1_l2 import Employee

    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "employee not found")
    q = EmployeeQualification(
        tenant_id=emp.tenant_id, employee_id=employee_id, qualification_type=body.qualification_type,
        field_of_study=body.field_of_study, institution_name=body.institution_name,
        graduation_year=body.graduation_year, relevance_to_role=body.relevance_to_role,
        verification_status="UNVERIFIED",
    )
    db.add(q)
    db.flush()
    append_audit(db, actor_user_id=user.id, action="ADD_QUALIFICATION",
                 entity="e360_qualification", entity_id=q.id, after={"employee_id": employee_id})
    db.commit()
    return {"id": q.id, "verification_status": q.verification_status}
