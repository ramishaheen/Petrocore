"""workforce groups & talent pools (Phase P-M)

Additive. Tenant-scoped with the standard subtree RLS policy.

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-19
"""
from alembic import op

from app.models import groups as grp

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None

TENANT_TABLE_OBJS = [
    grp.WorkforceGroup.__table__, grp.WorkforceGroupMember.__table__,
    grp.TalentPool.__table__, grp.TalentPoolMember.__table__,
]
TENANT_TABLES = ["grp_group", "grp_member", "tal_pool", "tal_pool_member"]


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
