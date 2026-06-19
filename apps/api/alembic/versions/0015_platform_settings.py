"""runtime platform settings (Phase P-N)

Additive. Global admin config table (no tenant scope, no RLS).

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-19
"""
from alembic import op

from app.models import settings as st

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None

TABLES = [st.PlatformSetting.__table__]


def upgrade() -> None:
    bind = op.get_bind()
    for table in TABLES:
        table.create(bind=bind, checkfirst=True)


def downgrade() -> None:
    for table in reversed(TABLES):
        table.drop(bind=op.get_bind(), checkfirst=True)
