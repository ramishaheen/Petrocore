"""Competency depth + versioned role matrix (System Analysis §3.5, §3.6 / Phase P-B).

Additive layer over the flat ``l3_competency``:
- ProficiencyLevel (P1–P5) and a Domain → Cluster taxonomy (mapped to existing
  competencies via a join table, so ``l3_competency`` is not altered).
- CompetencyDescriptor: per (competency, proficiency level) indicators + expected evidence.
- RoleCompetencyProfile / Requirement: the *versioned, approved* matrix of what a role needs.
- EvidenceRequirementProfile: which evidence proves a competency at a level.

Global taxonomy/config tables are not tenant-scoped; role-matrix tables carry
``tenant_id`` (a job belongs to a tenant) and get RLS in the migration.
"""
from datetime import date

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


# ---------------------------------------------------------------- taxonomy
class ProficiencyLevel(Base, TimestampMixin):
    __tablename__ = "cd_proficiency_level"

    id: Mapped[str] = uuid_pk()
    level_code: Mapped[str] = mapped_column(String(10), unique=True, index=True)  # P1..P5
    name_en: Mapped[str] = mapped_column(String(80))
    name_ar: Mapped[str] = mapped_column(String(80))
    level_rank: Mapped[int] = mapped_column(Integer, default=1)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class CompetencyDomain(Base, TimestampMixin):
    __tablename__ = "cd_domain"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(160))
    name_ar: Mapped[str] = mapped_column(String(160))
    domain_type: Mapped[str] = mapped_column(String(40), default="Technical")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class CompetencyCluster(Base, TimestampMixin):
    __tablename__ = "cd_cluster"

    id: Mapped[str] = uuid_pk()
    domain_id: Mapped[str] = mapped_column(ForeignKey("cd_domain.id"), index=True)
    code: Mapped[str] = mapped_column(String(40))
    name_en: Mapped[str] = mapped_column(String(160))
    name_ar: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class CompetencyTaxonomy(Base):
    """Maps an existing competency into the Domain/Cluster taxonomy (no ALTER on l3_competency)."""
    __tablename__ = "cd_competency_taxonomy"

    id: Mapped[str] = uuid_pk()
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"), unique=True, index=True)
    domain_id: Mapped[str] = mapped_column(ForeignKey("cd_domain.id"))
    cluster_id: Mapped[str | None] = mapped_column(ForeignKey("cd_cluster.id"), nullable=True)


class CompetencyDescriptor(Base, TimestampMixin):
    __tablename__ = "cd_descriptor"

    id: Mapped[str] = uuid_pk()
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"), index=True)
    proficiency_level_id: Mapped[str] = mapped_column(ForeignKey("cd_proficiency_level.id"))
    technical_indicator: Mapped[str] = mapped_column(Text, default="")
    behavioral_indicator: Mapped[str] = mapped_column(Text, default="")
    knowledge_indicator: Mapped[str] = mapped_column(Text, default="")
    skill_indicator: Mapped[str] = mapped_column(Text, default="")
    evidence_expected: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class EvidenceRequirementProfile(Base, TimestampMixin):
    __tablename__ = "cd_evidence_requirement"

    id: Mapped[str] = uuid_pk()
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"), index=True)
    proficiency_level_id: Mapped[str | None] = mapped_column(ForeignKey("cd_proficiency_level.id"), nullable=True)
    evidence_type_code: Mapped[str] = mapped_column(String(40))  # → cfg_lookup_value (EVIDENCE_TYPE)
    mandatory_flag: Mapped[bool] = mapped_column(Boolean, default=True)
    minimum_confidence_required: Mapped[float] = mapped_column(Float, default=0.6)
    reviewer_role: Mapped[str] = mapped_column(String(40), default="HR_VALIDATOR")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


# ---------------------------------------------------------------- role matrix
class RoleCompetencyProfile(Base, TimestampMixin):
    __tablename__ = "rc_profile"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    job_id: Mapped[str] = mapped_column(ForeignKey("l2_job.id"), index=True)
    profile_name: Mapped[str] = mapped_column(String(200))
    profile_version: Mapped[int] = mapped_column(Integer, default=1)
    effective_from: Mapped[date | None] = mapped_column(nullable=True)
    effective_to: Mapped[date | None] = mapped_column(nullable=True)
    # DRAFT | UNDER_REVIEW | APPROVED | ARCHIVED
    approval_status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class RoleCompetencyRequirement(Base, TimestampMixin):
    __tablename__ = "rc_requirement"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    profile_id: Mapped[str] = mapped_column(ForeignKey("rc_profile.id"), index=True)
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    required_proficiency_level_id: Mapped[str] = mapped_column(ForeignKey("cd_proficiency_level.id"))
    requirement_type: Mapped[str] = mapped_column(String(20), default="Essential")  # Essential|Important|Optional
    dimension: Mapped[str] = mapped_column(String(30), default="Knowledge")
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    criticality_level: Mapped[str] = mapped_column(String(20), default="MED")
    assessment_method: Mapped[str] = mapped_column(String(40), default="Test")
    evidence_required_flag: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
