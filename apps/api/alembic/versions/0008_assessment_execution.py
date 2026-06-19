"""full assessment-execution split + question bank/tags + evidence review (Phase P-G)

Additive. All tables tenant-scoped with the standard subtree RLS policy.

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-19
"""
from alembic import op

from app.models import assessment_exec as ax

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

TENANT_TABLE_OBJS = [
    ax.QuestionBank.__table__, ax.QuestionTag.__table__, ax.AssessmentCampaign.__table__,
    ax.AssessmentParticipant.__table__, ax.AssessmentAttempt.__table__,
    ax.AssessmentResponse.__table__, ax.AssessmentResultRow.__table__, ax.EvidenceReview.__table__,
]
TENANT_TABLES = ["qb_bank", "qb_tag", "ax_assessment", "ax_participant", "ax_attempt",
                 "ax_response", "ax_result", "ev_review"]


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
