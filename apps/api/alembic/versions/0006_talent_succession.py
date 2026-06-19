"""talent, succession & knowledge continuity (System Analysis §16, §27.9 / Phase P-E)

Additive. All P-E tables are tenant-scoped and get the standard subtree RLS policy.

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-19
"""
from alembic import op

from app.models import talent as tal

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

TENANT_TABLE_OBJS = [
    tal.TalentProfile.__table__, tal.SuccessionPlan.__table__, tal.SuccessorCandidate.__table__,
    tal.KnowledgeHolder.__table__, tal.KnowledgeTransferPlan.__table__,
]
TENANT_TABLES = ["tal_profile", "tal_succession_plan", "tal_successor", "tal_knowledge_holder", "tal_kt_plan"]


def upgrade() -> None:
    bind = op.get_bind()
    for table in TENANT_TABLE_OBJS:
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
    for table in reversed(TENANT_TABLE_OBJS):
        table.drop(bind=op.get_bind(), checkfirst=True)
