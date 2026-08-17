"""add external_job_id to discovered_jobs

Revision ID: 20260817_0004
Revises: 20260817_0003
Create Date: 2026-08-17 16:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260817_0004"
down_revision: Union[str, Sequence[str], None] = "20260817_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "discovered_jobs",
        sa.Column("external_job_id", sa.String(length=255), nullable=True),
    )
    op.create_index(
        op.f("ix_discovered_jobs_external_job_id"),
        "discovered_jobs",
        ["external_job_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_discovered_jobs_source_external_job_id",
        "discovered_jobs",
        ["source", "external_job_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_discovered_jobs_source_external_job_id",
        "discovered_jobs",
        type_="unique",
    )
    op.drop_index(
        op.f("ix_discovered_jobs_external_job_id"),
        table_name="discovered_jobs",
    )
    op.drop_column("discovered_jobs", "external_job_id")
