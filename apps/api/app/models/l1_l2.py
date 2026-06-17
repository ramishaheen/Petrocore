"""L1 Strategy & Institutional Context · L2 HR, Jobs & Performance."""
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


# ---------------------------------------------------------------- L1
class OrgNode(Base, TimestampMixin):
    """Institutional hierarchy AND tenant tree (NOC → … → EMPLOYEE)."""
    __tablename__ = "l1_org_node"

    id: Mapped[str] = uuid_pk()
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("l1_org_node.id"), nullable=True)
    # NOC | SUBSIDIARY | ACTIVITY | DEPARTMENT | SECTION | JOB | EMPLOYEE
    node_type: Mapped[str] = mapped_column(String(20), index=True)
    code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    name_en: Mapped[str] = mapped_column(String(255))
    name_ar: Mapped[str] = mapped_column(String(255))
    # Materialized path of ancestor ids for cheap subtree queries / RLS.
    path: Mapped[str] = mapped_column(Text, default="", index=True)
    # For ACTIVITY nodes: one of the 7 operating segments.
    activity_segment: Mapped[str | None] = mapped_column(String(30), nullable=True)


class StrategicElement(Base, TimestampMixin):
    __tablename__ = "l1_strategic_element"

    id: Mapped[str] = uuid_pk()
    node_id: Mapped[str] = mapped_column(ForeignKey("l1_org_node.id"))
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    # CORPORATE_STRATEGY | SUBSIDIARY_STRATEGY | DEPT_STRATEGY | HR_STRATEGY | POLICY | PERFORMANCE_PRIORITY
    kind: Mapped[str] = mapped_column(String(30))
    title_en: Mapped[str] = mapped_column(String(255))
    title_ar: Mapped[str] = mapped_column(String(255))
    body_en: Mapped[str] = mapped_column(Text, default="")
    body_ar: Mapped[str] = mapped_column(Text, default="")


# ---------------------------------------------------------------- L2
class Job(Base, TimestampMixin):
    __tablename__ = "l2_job"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    code: Mapped[str] = mapped_column(String(40))
    title_en: Mapped[str] = mapped_column(String(255))
    title_ar: Mapped[str] = mapped_column(String(255))
    job_family: Mapped[str] = mapped_column(String(60))
    admin_level: Mapped[int] = mapped_column(Integer)  # 1–5
    activity_segment: Mapped[str | None] = mapped_column(String(30), nullable=True)


class Employee(Base, TimestampMixin):
    __tablename__ = "l2_employee"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_no: Mapped[str] = mapped_column(String(40))
    full_name_en: Mapped[str] = mapped_column(String(255))
    full_name_ar: Mapped[str] = mapped_column(String(255))
    email_enc: Mapped[str | None] = mapped_column(Text, nullable=True)        # PII (Fernet)
    national_id_enc: Mapped[str | None] = mapped_column(Text, nullable=True)  # PII (Fernet)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)
    current_job_id: Mapped[str | None] = mapped_column(ForeignKey("l2_job.id"), nullable=True)
    section_id: Mapped[str | None] = mapped_column(ForeignKey("l1_org_node.id"), nullable=True)


class Appraisal(Base, TimestampMixin):
    __tablename__ = "l2_appraisal"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    period: Mapped[str] = mapped_column(String(20))
    rating: Mapped[float] = mapped_column(default=0.0)
    kpi_score: Mapped[float] = mapped_column(default=0.0)
    notes_en: Mapped[str] = mapped_column(Text, default="")
    notes_ar: Mapped[str] = mapped_column(Text, default="")


class Kpi(Base, TimestampMixin):
    __tablename__ = "l2_kpi"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name_en: Mapped[str] = mapped_column(String(255))
    name_ar: Mapped[str] = mapped_column(String(255))
    target: Mapped[float] = mapped_column(default=0.0)
    actual: Mapped[float] = mapped_column(default=0.0)
    unit: Mapped[str] = mapped_column(String(30), default="")
