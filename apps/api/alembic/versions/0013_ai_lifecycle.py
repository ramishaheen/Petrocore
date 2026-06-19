"""AI request/output lifecycle & governance (Phase P-L)

Additive. Prompt templates + model versions are global config; requests, outputs
and reviews are tenant-scoped with the standard subtree RLS policy.

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-19
"""
from alembic import op

from app.models import ai_lifecycle as ai

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None

GLOBAL_TABLES = [ai.PromptTemplate.__table__, ai.AIModelVersion.__table__]
TENANT_TABLE_OBJS = [ai.AIRequest.__table__, ai.AIOutput.__table__, ai.AIReview.__table__]
TENANT_TABLES = ["ai_request", "ai_output", "ai_review"]


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
