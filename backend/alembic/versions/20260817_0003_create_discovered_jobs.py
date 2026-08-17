"""create discovered_jobs

Revision ID: 20260817_0003
Revises: 20260810_0002
Create Date: 2026-08-17 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260817_0003"
down_revision: Union[str, Sequence[str], None] = "20260810_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

eligibility_status_values = ("UNKNOWN", "YES", "NO")


def upgrade() -> None:
    eligibility_status = postgresql.ENUM(
        *eligibility_status_values,
        name="eligibility_status",
        create_type=False,
    )
    eligibility_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "discovered_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("employment_type", sa.String(length=50), nullable=True),
        sa.Column("source", sa.String(length=100), nullable=False),
        sa.Column("source_url", sa.String(length=2048), nullable=True),
        sa.Column(
            "remote_status",
            eligibility_status,
            server_default="UNKNOWN",
            nullable=False,
        ),
        sa.Column(
            "visa_sponsorship_status",
            eligibility_status,
            server_default="UNKNOWN",
            nullable=False,
        ),
        sa.Column(
            "relocation_status",
            eligibility_status,
            server_default="UNKNOWN",
            nullable=False,
        ),
        sa.Column(
            "international_eligibility_status",
            eligibility_status,
            server_default="UNKNOWN",
            nullable=False,
        ),
        sa.Column(
            "discovered_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("salary", sa.String(length=100), nullable=True),
        sa.Column("experience_level", sa.String(length=100), nullable=True),
        sa.Column("skills", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_discovered_jobs_company"),
        "discovered_jobs",
        ["company"],
        unique=False,
    )
    op.create_index(
        op.f("ix_discovered_jobs_discovered_at"),
        "discovered_jobs",
        ["discovered_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_discovered_jobs_discovered_at"),
        table_name="discovered_jobs",
    )
    op.drop_index(op.f("ix_discovered_jobs_company"), table_name="discovered_jobs")
    op.drop_table("discovered_jobs")
    postgresql.ENUM(name="eligibility_status").drop(op.get_bind(), checkfirst=True)
