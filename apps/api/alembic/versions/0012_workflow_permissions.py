"""generic workflow engine + permission roles (Phase P-K)

Additive. ``sec_permission_role`` is global config (no RLS); workflow tables and
user-permission assignments are tenant-scoped with the standard subtree policy.

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-19
"""
from alembic import op

from app.models import workflow as wf

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

GLOBAL_TABLES = [wf.PermissionRole.__table__]
TENANT_TABLE_OBJS = [
    wf.WorkflowInstance.__table__, wf.WorkflowStep.__table__, wf.Approval.__table__,
    wf.UserPermissionRole.__table__,
]
TENANT_TABLES = ["wf_instance", "wf_step", "wf_approval", "sec_user_permission_role"]


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
