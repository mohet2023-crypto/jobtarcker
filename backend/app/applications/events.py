from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.application import ApplicationStatus, JobApplication
from app.models.event import ApplicationEvent, ApplicationEventType


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


def record_created_event(
    db: Session,
    application: JobApplication,
    *,
    occurred_at: datetime | None = None,
) -> ApplicationEvent:
    """Append a CREATED event for a newly persisted application (same transaction)."""
    event = ApplicationEvent(
        application_id=application.id,
        event_type=ApplicationEventType.CREATED,
        from_status=None,
        to_status=application.status,
        occurred_at=occurred_at or get_utc_now(),
        notes=None,
    )
    db.add(event)
    return event


def record_status_changed_event(
    db: Session,
    application: JobApplication,
    *,
    from_status: ApplicationStatus,
    to_status: ApplicationStatus,
    occurred_at: datetime | None = None,
) -> ApplicationEvent:
    """Append a STATUS_CHANGED event (same transaction as the application update)."""
    event = ApplicationEvent(
        application_id=application.id,
        event_type=ApplicationEventType.STATUS_CHANGED,
        from_status=from_status,
        to_status=to_status,
        occurred_at=occurred_at or get_utc_now(),
        notes=None,
    )
    db.add(event)
    return event
