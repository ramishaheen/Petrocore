"""Seed Phase P-K data: a couple of scoped permission roles and a sample
blueprint-approval workflow (idempotent)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment_v2 import AssessmentBlueprint
from app.models.workflow import PermissionRole
from app.services import workflow_service as svc


def seed_k(db: Session) -> None:
    if db.query(PermissionRole).count() > 0:
        return
    svc.create_permission_role(db, role_name="Enterprise Administrator", role_scope="Enterprise",
                               description="Full enterprise configuration and governance.")
    svc.create_permission_role(db, role_name="Company HR Manager", role_scope="Company",
                               description="Manage employees, profiles and validations within a company.")
    svc.create_permission_role(db, role_name="Department Reviewer", role_scope="Department",
                               description="Review and approve within a department subtree.")

    bp = db.execute(select(AssessmentBlueprint)).scalars().first()
    if bp:
        svc.start_workflow(
            db, actor_user_id=None, tenant_id=bp.tenant_id, workflow_type="BlueprintApproval",
            entity_type="AssessmentBlueprint", entity_id=bp.id,
            steps=[("Functional Review", "SME"), ("HR Review", "HR_VALIDATOR"),
                   ("Governance Review", "COMPANY_ADMIN")])
    db.flush()
