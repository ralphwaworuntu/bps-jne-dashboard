"""add cloudstoragesettings table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-07 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE_NAME = "cloudstoragesettings"


def upgrade() -> None:
    bind = op.get_bind()
    if sa.inspect(bind).has_table(TABLE_NAME):
        return

    op.create_table(
        TABLE_NAME,
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("provider", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("endpoint_url", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("region", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("bucket", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("prefix", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("access_key_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("secret_access_key_enc", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("hot_days", sa.Integer(), nullable=False),
        sa.Column("size_trigger_gb", sa.Integer(), nullable=False),
        sa.Column("keep_local_pivots", sa.Boolean(), nullable=False),
        sa.Column("hydrate_cache_gb", sa.Integer(), nullable=False),
        sa.Column("modules", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("last_run_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("bytes_archived", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_by_email", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if not sa.inspect(bind).has_table(TABLE_NAME):
        return
    op.drop_table(TABLE_NAME)
