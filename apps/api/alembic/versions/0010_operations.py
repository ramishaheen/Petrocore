"""operational & asset context — site/unit/equipment/procedure/task/risk (Phase P-I)

Additive. Tenant-scoped with the standard subtree RLS policy.

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-19
"""
from alembic import op

from app.models import operations as ops

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

TENANT_TABLE_OBJS = [
    ops.Site.__table__, ops.ProcessUnit.__table__, ops.Equipment.__table__,
    ops.Procedure.__table__, ops.CriticalTask.__table__, ops.TaskRisk.__table__,
]
TENANT_TABLES = ["op_site", "op_process_unit", "op_equipment", "op_procedure",
                 "op_critical_task", "op_task_risk"]


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
