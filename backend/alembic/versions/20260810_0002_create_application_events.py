"""create application_events

Revision ID: 20260810_0002
Revises: 20260810_0001
Create Date: 2026-08-10 04:10:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260810_0002"
down_revision: Union[str, Sequence[str], None] = "20260810_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

application_event_type_values = (
    "CREATED",
    "STATUS_CHANGED",
)

application_status_values = (
    "SAVED",
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
)


def upgrade() -> None:
    application_event_type = postgresql.ENUM(
        *application_event_type_values,
        name="application_event_type",
        create_type=False,
    )
    application_event_type.create(op.get_bind(), checkfirst=True)

    application_status = postgresql.ENUM(
        *application_status_values,
        name="application_status",
        create_type=False,
    )

    op.create_table(
        "application_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("event_type", application_event_type, nullable=False),
        sa.Column("from_status", application_status, nullable=True),
        sa.Column("to_status", application_status, nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "("
            "(event_type = 'CREATED' AND from_status IS NULL AND to_status IS NOT NULL) "
            "OR "
            "(event_type = 'STATUS_CHANGED' AND from_status IS NOT NULL "
            "AND to_status IS NOT NULL)"
            ")",
            name="ck_application_events_status_fields",
        ),
        sa.ForeignKeyConstraint(
            ["application_id"],
            ["job_applications.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_application_events_application_id"),
        "application_events",
        ["application_id"],
        unique=False,
    )
    op.create_index(
        "ix_application_events_application_id_occurred_at",
        "application_events",
        ["application_id", "occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_application_events_application_id_occurred_at",
        table_name="application_events",
    )
    op.drop_index(
        op.f("ix_application_events_application_id"),
        table_name="application_events",
    )
    op.drop_table("application_events")
    postgresql.ENUM(name="application_event_type").drop(
        op.get_bind(),
        checkfirst=True,
    )
