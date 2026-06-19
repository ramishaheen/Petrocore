"""governed assessment blueprint engine + AI question review workflow (Phase P-C)

Additive. ``ab_scoring_rubric`` is global config; the blueprint, its competencies
and rules, and the AI question-generation/review tables are tenant-scoped and get
the standard subtree RLS policy.

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-18
"""
from alembic import op

from app.models import assessment_v2 as av2

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

GLOBAL_TABLES = [av2.ScoringRubric.__table__]
TENANT_TABLE_OBJS = [
    av2.AssessmentBlueprint.__table__, av2.AssessmentBlueprintCompetency.__table__,
    av2.AssessmentBlueprintRule.__table__, av2.AIQuestionGenerationRequest.__table__,
    av2.AIGeneratedQuestion.__table__, av2.QuestionReview.__table__,
]
TENANT_TABLES = [
    "ab_blueprint", "ab_blueprint_competency", "ab_blueprint_rule",
    "qg_request", "qg_question", "qg_review",
]


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
