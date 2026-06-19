"""extensible core + workforce segmentation (System Analysis P-A)

Adds configurable master data (lookups), generic entity links, custom fields,
and the workforce-segmentation layer. Additive — does not touch existing tables.

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-17
"""
from alembic import op

from app.models import core_ext, workforce

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

# New tables created by this migration.
NEW_TABLES = [
    core_ext.LookupType.__table__, core_ext.LookupValue.__table__,
    core_ext.EntityType.__table__, core_ext.EntityLink.__table__,
    core_ext.CustomFieldDefinition.__table__, core_ext.CustomFieldValue.__table__,
    workforce.WorkforceFamily.__table__, workforce.CareerStream.__table__,
    workforce.RoleLevel.__table__, workforce.RoleArchetype.__table__,
]
# Of those, the tenant-scoped *data* tables get RLS (config tables are global).
TENANT_TABLES = ["cfg_entity_link", "cfg_custom_field_value"]


def upgrade() -> None:
    bind = op.get_bind()
    for table in NEW_TABLES:
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
    for table in reversed(NEW_TABLES):
        table.drop(bind=op.get_bind(), checkfirst=True)
