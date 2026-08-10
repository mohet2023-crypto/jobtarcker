import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.application import ApplicationStatus

if TYPE_CHECKING:
    from app.models.application import JobApplication


class ApplicationEventType(str, enum.Enum):
    CREATED = "CREATED"
    STATUS_CHANGED = "STATUS_CHANGED"


class ApplicationEvent(Base):
    __tablename__ = "application_events"
    __table_args__ = (
        CheckConstraint(
            "("
            "(event_type = 'CREATED' AND from_status IS NULL AND to_status IS NOT NULL) "
            "OR "
            "(event_type = 'STATUS_CHANGED' AND from_status IS NOT NULL "
            "AND to_status IS NOT NULL)"
            ")",
            name="ck_application_events_status_fields",
        ),
        Index(
            "ix_application_events_application_id_occurred_at",
            "application_id",
            "occurred_at",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        index=True,
    )
    event_type: Mapped[ApplicationEventType] = mapped_column(
        Enum(
            ApplicationEventType,
            name="application_event_type",
            native_enum=True,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
    )
    from_status: Mapped[Optional[ApplicationStatus]] = mapped_column(
        Enum(
            ApplicationStatus,
            name="application_status",
            native_enum=True,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=True,
    )
    to_status: Mapped[Optional[ApplicationStatus]] = mapped_column(
        Enum(
            ApplicationStatus,
            name="application_status",
            native_enum=True,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=True,
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    application: Mapped["JobApplication"] = relationship(back_populates="events")
