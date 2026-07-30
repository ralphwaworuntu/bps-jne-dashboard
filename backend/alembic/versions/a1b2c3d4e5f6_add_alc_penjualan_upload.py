"""add alcpenjualanupload table

Revision ID: a1b2c3d4e5f6
Revises: 103e0e5de905
Create Date: 2026-07-25 18:10:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "103e0e5de905"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE_NAME = "alcpenjualanupload"


def upgrade() -> None:
    bind = op.get_bind()
    if sa.inspect(bind).has_table(TABLE_NAME):
        return

    op.create_table(
        TABLE_NAME,
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("kind", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("original_filename", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("stored_path", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("parsed_path", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Integer(), nullable=True),
        sa.Column("uploaded_by_email", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f(f"ix_{TABLE_NAME}_kind"), TABLE_NAME, ["kind"], unique=False)
    op.create_index(op.f(f"ix_{TABLE_NAME}_month"), TABLE_NAME, ["month"], unique=False)
    op.create_index(op.f(f"ix_{TABLE_NAME}_year"), TABLE_NAME, ["year"], unique=False)
    op.create_index(
        op.f(f"ix_{TABLE_NAME}_uploaded_by_user_id"), TABLE_NAME, ["uploaded_by_user_id"], unique=False
    )
    op.create_index(op.f(f"ix_{TABLE_NAME}_created_at"), TABLE_NAME, ["created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if not sa.inspect(bind).has_table(TABLE_NAME):
        return
    op.drop_index(op.f(f"ix_{TABLE_NAME}_created_at"), table_name=TABLE_NAME)
    op.drop_index(op.f(f"ix_{TABLE_NAME}_uploaded_by_user_id"), table_name=TABLE_NAME)
    op.drop_index(op.f(f"ix_{TABLE_NAME}_year"), table_name=TABLE_NAME)
    op.drop_index(op.f(f"ix_{TABLE_NAME}_month"), table_name=TABLE_NAME)
    op.drop_index(op.f(f"ix_{TABLE_NAME}_kind"), table_name=TABLE_NAME)
    op.drop_table(TABLE_NAME)
