from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import ApplicationStatus
from app.models.event import ApplicationEvent, ApplicationEventType


def _register_and_login(
    client: TestClient,
    *,
    email: str,
    password: str = "StrongPassword123!",
    full_name: str = "Test User",
) -> str:
    assert (
        client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "full_name": full_name},
        ).status_code
        == 201
    )
    login = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 200
    return login.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_app(client: TestClient, token: str, **payload) -> dict:
    body = {"company": "Acme", "position": "Engineer", **payload}
    response = client.post(
        "/api/v1/applications",
        headers=_auth(token),
        json=body,
    )
    assert response.status_code == 201
    return response.json()


def _events_for(db_session: Session, application_id: int) -> list[ApplicationEvent]:
    return list(
        db_session.scalars(
            select(ApplicationEvent)
            .where(ApplicationEvent.application_id == application_id)
            .order_by(ApplicationEvent.occurred_at.asc(), ApplicationEvent.id.asc())
        ).all()
    )


def test_create_application_creates_exactly_one_created_event(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="autocreate@example.com")
    created = _create_app(client, token, status="APPLIED")

    events = _events_for(db_session, created["id"])
    assert len(events) == 1
    assert events[0].event_type == ApplicationEventType.CREATED


def test_created_event_fields(client: TestClient, db_session: Session) -> None:
    token = _register_and_login(client, email="autocreatefields@example.com")
    created = _create_app(client, token, status="SCREENING")

    event = _events_for(db_session, created["id"])[0]
    assert event.event_type == ApplicationEventType.CREATED
    assert event.from_status is None
    assert event.to_status == ApplicationStatus.SCREENING
    assert event.notes is None
    assert event.occurred_at is not None


def test_created_event_belongs_to_application(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="autocreatebelong@example.com")
    created = _create_app(client, token)

    event = _events_for(db_session, created["id"])[0]
    assert event.application_id == created["id"]


def test_status_change_creates_status_changed_event(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="autostatus@example.com")
    created = _create_app(client, token, status="SAVED")

    response = client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth(token),
        json={"status": "APPLIED"},
    )
    assert response.status_code == 200

    events = _events_for(db_session, created["id"])
    changed = [event for event in events if event.event_type == ApplicationEventType.STATUS_CHANGED]
    assert len(changed) == 1


def test_status_changed_event_old_and_new_status(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="autostatusfields@example.com")
    created = _create_app(client, token, status="SAVED")

    client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth(token),
        json={"status": "INTERVIEW"},
    )

    changed = [
        event
        for event in _events_for(db_session, created["id"])
        if event.event_type == ApplicationEventType.STATUS_CHANGED
    ][0]
    assert changed.from_status == ApplicationStatus.SAVED
    assert changed.to_status == ApplicationStatus.INTERVIEW
    assert changed.application_id == created["id"]


def test_noop_status_update_creates_no_event(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="autonoop@example.com")
    created = _create_app(client, token, status="INTERVIEW")

    response = client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth(token),
        json={"status": "INTERVIEW"},
    )
    assert response.status_code == 200

    events = _events_for(db_session, created["id"])
    assert len(events) == 1
    assert events[0].event_type == ApplicationEventType.CREATED


def test_non_status_updates_do_not_create_events(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="autononstatus@example.com")
    created = _create_app(client, token, status="SAVED")

    patches = [
        {"notes": "Just a note"},
        {"deadline": datetime(2026, 9, 1, tzinfo=timezone.utc).isoformat()},
        {"company": "Renamed Co"},
        {
            "position": "Senior Engineer",
            "location": "Remote",
            "salary": "150000",
            "notes": "Bundle update",
        },
    ]
    for payload in patches:
        response = client.patch(
            f"/api/v1/applications/{created['id']}",
            headers=_auth(token),
            json=payload,
        )
        assert response.status_code == 200

    events = _events_for(db_session, created["id"])
    assert len(events) == 1
    assert events[0].event_type == ApplicationEventType.CREATED


def test_multiple_status_transitions_history(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="autochain@example.com")
    created = _create_app(client, token, status="SAVED")

    for status_value in ("APPLIED", "SCREENING", "INTERVIEW"):
        response = client.patch(
            f"/api/v1/applications/{created['id']}",
            headers=_auth(token),
            json={"status": status_value},
        )
        assert response.status_code == 200

    events = _events_for(db_session, created["id"])
    assert [
        (event.event_type, event.from_status, event.to_status) for event in events
    ] == [
        (ApplicationEventType.CREATED, None, ApplicationStatus.SAVED),
        (
            ApplicationEventType.STATUS_CHANGED,
            ApplicationStatus.SAVED,
            ApplicationStatus.APPLIED,
        ),
        (
            ApplicationEventType.STATUS_CHANGED,
            ApplicationStatus.APPLIED,
            ApplicationStatus.SCREENING,
        ),
        (
            ApplicationEventType.STATUS_CHANGED,
            ApplicationStatus.SCREENING,
            ApplicationStatus.INTERVIEW,
        ),
    ]


def test_user_cannot_create_events_for_other_users_application(
    client: TestClient,
    db_session: Session,
) -> None:
    token_a = _register_and_login(client, email="autoa@example.com", full_name="A")
    token_b = _register_and_login(client, email="autob@example.com", full_name="B")
    created = _create_app(client, token_a, status="SAVED")

    response = client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth(token_b),
        json={"status": "APPLIED"},
    )
    assert response.status_code == 404

    events = _events_for(db_session, created["id"])
    assert len(events) == 1
    assert events[0].event_type == ApplicationEventType.CREATED


def test_create_persists_application_and_event_together(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="autoatomic@example.com")
    created = _create_app(client, token, status="OFFER")

    events = _events_for(db_session, created["id"])
    assert len(events) == 1
    assert events[0].application_id == created["id"]
    assert events[0].to_status == ApplicationStatus.OFFER

    # Response shape stays application-only (no embedded event).
    assert "events" not in created
    assert "event_type" not in created
