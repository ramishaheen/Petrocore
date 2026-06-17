"""initial schema: pgvector + all layer tables + Row-Level Security

Revision ID: 0001
Revises:
Create Date: 2026-06-17
"""
from alembic import op

from app.db.base import Base
import app.models  # noqa: F401  register all models on Base.metadata

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# Tenant-scoped tables get an RLS policy keyed on app.current_tenant / app.current_role.
# Global roles ('*' tenant: PLATFORM_ADMIN / NOC_EXECUTIVE) bypass the tenant filter.
TENANT_TABLES = [
    "l1_strategic_element", "l2_job", "l2_employee", "l2_appraisal", "l2_kpi",
    "l4_department_plan", "l4_operational_requirement",
    "l5_profile", "l5_competency_result",
    "l6_asset", "l6_critical_role",
    "l7_assessment", "l7_evidence",
    "l8_gap", "l8_gap_report", "l8_recommendation",
    "l9_training_need", "l9_program", "l9_nomination", "l9_impact",
    "gov_decision",
]


def upgrade() -> None:
    bind = op.get_bind()
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=bind)

    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        # Visible when the caller is global, the row is global, the row's tenant
        # equals the caller's, OR the row's tenant node is a DESCENDANT of the
        # caller's tenant (subtree access — e.g. a COMPANY_ADMIN bound to a
        # subsidiary sees rows stored at its child sections). Descendant is
        # tested via the org-node materialized path. The path test is guarded by
        # a non-empty current_tenant so an unset context never matches via LIKE.
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
    Base.metadata.drop_all(bind=op.get_bind())
