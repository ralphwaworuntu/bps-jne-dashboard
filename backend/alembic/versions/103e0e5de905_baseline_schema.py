"""baseline_schema

Revision ID: 103e0e5de905
Revises:
Create Date: 2026-07-25 14:56:50.092497

Baseline migration for the existing SQLite schema.
Database already created via SQLModel create_all; this revision marks
Alembic as the source of truth for future schema changes.
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "103e0e5de905"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op baseline — current tables already exist."""
    pass


def downgrade() -> None:
    """No-op baseline."""
    pass
