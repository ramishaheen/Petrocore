"""competency depth + versioned role matrix + employee-360 records (Phase P-B)

Additive. Global taxonomy/config tables have no RLS; role-matrix and employee
records are tenant-scoped and get the standard subtree RLS policy.

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-17
"""
from alembic import op

from app.models import competency_v2 as cv2
from app.models import employee_360 as e360

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

GLOBAL_TABLES = [
    cv2.ProficiencyLevel.__table__, cv2.CompetencyDomain.__table__, cv2.CompetencyCluster.__table__,
    cv2.CompetencyTaxonomy.__table__, cv2.CompetencyDescriptor.__table__,
    cv2.EvidenceRequirementProfile.__table__,
]
TENANT_TABLE_OBJS = [
    cv2.RoleCompetencyProfile.__table__, cv2.RoleCompetencyRequirement.__table__,
    e360.EmployeeQualification.__table__, e360.EmployeeCertification.__table__,
    e360.EmployeeExperience.__table__,
]
TENANT_TABLES = ["rc_profile", "rc_requirement", "e360_qualification", "e360_certification", "e360_experience"]


def upgrade() -> None:
    bind = op.get_bind()
    for table in GLOBAL_TABLES + TENANT_TABLE_OBJS:
        table.create(bind=bind, checkfirst=True)

    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (
                current_setting('app.current_role', true) IN ('PLATFORM_ADMIN', 'NOC_EXECUTIVE')
                OR current_setting('app.current_tenant', true) = '*'
                OR tenant_id = '*'
                OR tenant_id = current_setting('app.current_tenant', true)
                OR (
                    current_setting('app.current_tenant', true) <> ''
                    AND EXISTS (
                        SELECT 1 FROM l1_org_node n
                        WHERE n.id = {table}.tenant_id
                          AND n.path LIKE '%' || current_setting('app.current_tenant', true) || '%'
                    )
                )
            )
        """)


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
    for table in reversed(GLOBAL_TABLES + TENANT_TABLE_OBJS):
        table.drop(bind=op.get_bind(), checkfirst=True)
