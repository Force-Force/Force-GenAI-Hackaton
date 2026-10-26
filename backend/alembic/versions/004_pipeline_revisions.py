"""pipeline revisions (graph history and rollback)

Revision ID: 004
Revises: 003
Create Date: 2026-10-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pipeline_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "pipeline_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pipelines.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("author_type", sa.String(32), nullable=False, server_default="USER"),
        sa.Column("author_name", sa.String(120), nullable=False, server_default="AuraBI user"),
        sa.Column("node_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("edge_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("operations_summary", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("pipeline_id", "revision", name="uq_pipeline_revision"),
    )
    op.create_index("ix_pipeline_revisions_pipeline_id", "pipeline_revisions", ["pipeline_id"])


def downgrade() -> None:
    op.drop_index("ix_pipeline_revisions_pipeline_id", table_name="pipeline_revisions")
    op.drop_table("pipeline_revisions")
