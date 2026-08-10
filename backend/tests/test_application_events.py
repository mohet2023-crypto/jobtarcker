from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.application import ApplicationStatus, JobApplication
from app.models.event import ApplicationEvent, ApplicationEventType
from app.models.user import User


def _seed_user_and_application(db_session: Session) -> JobApplication:
    user = User(
        email="events@example.com",
        password_hash="not-a-real-hash",
        full_name="Events User",
    )
    db_session.add(user)
    db_session.flush()

    application = JobApplication(
        user_id=user.id,
        company="Acme",
        position="Engineer",
        status=ApplicationStatus.SAVED,
    )
    db_session.add(application)
    db_session.commit()
    db_session.refresh(application)
    return application


def test_application_event_can_be_created(db_session: Session) -> None:
    application = _seed_user_and_application(db_session)
    occurred_at = datetime(2026, 8, 10, 12, 0, 0, tzinfo=timezone.utc)

    event = ApplicationEvent(
        application_id=application.id,
        event_type=ApplicationEventType.CREATED,
        from_status=None,
        to_status=ApplicationStatus.SAVED,
        occurred_at=occurred_at,
        notes=None,
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)

    assert event.id is not None
    assert event.application_id == application.id
    assert event.event_type == ApplicationEventType.CREATED


def test_created_event_status_fields(db_session: Session) -> None:
    application = _seed_user_and_application(db_session)

    event = ApplicationEvent(
        application_id=application.id,
        event_type=ApplicationEventType.CREATED,
        from_status=None,
        to_status=ApplicationStatus.APPLIED,
        occurred_at=datetime.now(timezone.utc),
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)

    assert event.from_status is None
    assert event.to_status == ApplicationStatus.APPLIED


def test_status_changed_event_stores_both_statuses(db_session: Session) -> None:
    application = _seed_user_and_application(db_session)

    event = ApplicationEvent(
        application_id=application.id,
        event_type=ApplicationEventType.STATUS_CHANGED,
        from_status=ApplicationStatus.SAVED,
        to_status=ApplicationStatus.INTERVIEW,
        occurred_at=datetime.now(timezone.utc),
        notes="Moved to interview",
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)

    assert event.from_status == ApplicationStatus.SAVED
    assert event.to_status == ApplicationStatus.INTERVIEW
    assert event.notes == "Moved to interview"


def test_application_can_have_multiple_events(db_session: Session) -> None:
    application = _seed_user_and_application(db_session)
    now = datetime.now(timezone.utc)

    db_session.add_all(
        [
            ApplicationEvent(
                application_id=application.id,
                event_type=ApplicationEventType.CREATED,
                from_status=None,
                to_status=ApplicationStatus.SAVED,
                occurred_at=now,
            ),
            ApplicationEvent(
                application_id=application.id,
                event_type=ApplicationEventType.STATUS_CHANGED,
                from_status=ApplicationStatus.SAVED,
                to_status=ApplicationStatus.APPLIED,
                occurred_at=now,
            ),
        ]
    )
    db_session.commit()

    count = db_session.scalar(
        select(func.count())
        .select_from(ApplicationEvent)
        .where(ApplicationEvent.application_id == application.id)
    )
    assert count == 2
    assert len(application.events) == 2


def test_events_associated_with_correct_application(db_session: Session) -> None:
    first = _seed_user_and_application(db_session)

    other_user = User(
        email="other-events@example.com",
        password_hash="not-a-real-hash",
        full_name="Other",
    )
    db_session.add(other_user)
    db_session.flush()
    second = JobApplication(
        user_id=other_user.id,
        company="Globex",
        position="Intern",
        status=ApplicationStatus.APPLIED,
    )
    db_session.add(second)
    db_session.flush()

    db_session.add_all(
        [
            ApplicationEvent(
                application_id=first.id,
                event_type=ApplicationEventType.CREATED,
                from_status=None,
                to_status=ApplicationStatus.SAVED,
                occurred_at=datetime.now(timezone.utc),
            ),
            ApplicationEvent(
                application_id=second.id,
                event_type=ApplicationEventType.CREATED,
                from_status=None,
                to_status=ApplicationStatus.APPLIED,
                occurred_at=datetime.now(timezone.utc),
            ),
        ]
    )
    db_session.commit()

    first_events = db_session.scalars(
        select(ApplicationEvent).where(ApplicationEvent.application_id == first.id)
    ).all()
    second_events = db_session.scalars(
        select(ApplicationEvent).where(ApplicationEvent.application_id == second.id)
    ).all()

    assert len(first_events) == 1
    assert first_events[0].to_status == ApplicationStatus.SAVED
    assert len(second_events) == 1
    assert second_events[0].to_status == ApplicationStatus.APPLIED


def test_deleting_application_removes_events(db_session: Session) -> None:
    application = _seed_user_and_application(db_session)
    application_id = application.id

    db_session.add(
        ApplicationEvent(
            application_id=application.id,
            event_type=ApplicationEventType.CREATED,
            from_status=None,
            to_status=ApplicationStatus.SAVED,
            occurred_at=datetime.now(timezone.utc),
        )
    )
    db_session.commit()

    db_session.delete(application)
    db_session.commit()

    remaining = db_session.scalar(
        select(func.count())
        .select_from(ApplicationEvent)
        .where(ApplicationEvent.application_id == application_id)
    )
    assert remaining == 0


def test_existing_application_api_still_works(client: TestClient) -> None:
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "api-events@example.com",
            "password": "StrongPassword123!",
            "full_name": "API User",
        },
    )
    assert register.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        data={
            "username": "api-events@example.com",
            "password": "StrongPassword123!",
        },
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    create = client.post(
        "/api/v1/applications",
        headers={"Authorization": f"Bearer {token}"},
        json={"company": "Still Works", "position": "Dev"},
    )
    assert create.status_code == 201

    listing = client.get(
        "/api/v1/applications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
