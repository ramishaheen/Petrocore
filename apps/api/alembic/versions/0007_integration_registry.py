"""integration registry & sync log (System Analysis §25 / Phase P-F)

Additive. Platform-level configuration tables (no tenant scope, no RLS).

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-19
"""
from alembic import op

from app.models import integration as intg

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None

TABLES = [intg.IntegrationConnector.__table__, intg.IntegrationSyncLog.__table__]


def upgrade() -> None:
    bind = op.get_bind()
    for table in TABLES:
        table.create(bind=bind, checkfirst=True)


def downgrade() -> None:
    for table in reversed(TABLES):
        table.drop(bind=op.get_bind(), checkfirst=True)
