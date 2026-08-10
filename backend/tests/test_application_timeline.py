from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.application import ApplicationStatus, JobApplication
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


def test_timeline_authenticated(client: TestClient) -> None:
    token = _register_and_login(client, email="tlauth@example.com")
    created = _create_app(client, token)

    response = client.get(
        f"/api/v1/applications/{created['id']}/events",
        headers=_auth(token),
    )
    assert response.status_code == 200
    assert "items" in response.json()


def test_timeline_unauthenticated(client: TestClient) -> None:
    response = client.get("/api/v1/applications/1/events")
    assert response.status_code == 401


def test_timeline_owner_can_read(client: TestClient) -> None:
    token = _register_and_login(client, email="tlowner@example.com")
    created = _create_app(client, token, status="SAVED")

    response = client.get(
        f"/api/v1/applications/{created['id']}/events",
        headers=_auth(token),
    )
    assert response.status_code == 200
    assert len(response.json()["items"]) == 1


def test_timeline_other_user_gets_404(client: TestClient) -> None:
    token_a = _register_and_login(client, email="tla@example.com", full_name="A")
    token_b = _register_and_login(client, email="tlb@example.com", full_name="B")
    created = _create_app(client, token_a)

    response = client.get(
        f"/api/v1/applications/{created['id']}/events",
        headers=_auth(token_b),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Application not found"


def test_timeline_nonexistent_application_404(client: TestClient) -> None:
    token = _register_and_login(client, email="tlmissing@example.com")

    response = client.get(
        "/api/v1/applications/999999/events",
        headers=_auth(token),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Application not found"


def test_timeline_ordered_by_occurred_at_then_id(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="tlorder@example.com")
    created = _create_app(client, token, status="SAVED")

    # Force two later events with identical occurred_at to test id ASC tie-break.
    shared_time = datetime(2026, 8, 10, 15, 0, 0, tzinfo=timezone.utc)
    db_session.add_all(
        [
            ApplicationEvent(
                application_id=created["id"],
                event_type=ApplicationEventType.STATUS_CHANGED,
                from_status=ApplicationStatus.SAVED,
                to_status=ApplicationStatus.APPLIED,
                occurred_at=shared_time,
            ),
            ApplicationEvent(
                application_id=created["id"],
                event_type=ApplicationEventType.STATUS_CHANGED,
                from_status=ApplicationStatus.APPLIED,
                to_status=ApplicationStatus.SCREENING,
                occurred_at=shared_time,
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/applications/{created['id']}/events",
        headers=_auth(token),
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 3
    assert items[0]["event_type"] == "CREATED"
    assert items[1]["to_status"] == "APPLIED"
    assert items[2]["to_status"] == "SCREENING"
    assert items[1]["id"] < items[2]["id"]


def test_timeline_response_shape(client: TestClient) -> None:
    token = _register_and_login(client, email="tlshape@example.com")
    created = _create_app(client, token, status="SAVED")

    response = client.get(
        f"/api/v1/applications/{created['id']}/events",
        headers=_auth(token),
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"items"}
    event = body["items"][0]
    assert set(event.keys()) == {
        "id",
        "event_type",
        "from_status",
        "to_status",
        "occurred_at",
        "notes",
    }
    assert "application_id" not in event
    assert "created_at" not in event
    assert "user_id" not in event


def test_timeline_empty_for_application_without_events(
    client: TestClient,
    db_session: Session,
) -> None:
    token = _register_and_login(client, email="tlempty@example.com")
    # Resolve user id from /me, then seed an application with no events.
    me = client.get("/api/v1/auth/me", headers=_auth(token))
    assert me.status_code == 200
    user_id = me.json()["id"]

    application = JobApplication(
        user_id=user_id,
        company="No History Co",
        position="Dev",
        status=ApplicationStatus.SAVED,
    )
    db_session.add(application)
    db_session.commit()
    db_session.refresh(application)

    response = client.get(
        f"/api/v1/applications/{application.id}/events",
        headers=_auth(token),
    )
    assert response.status_code == 200
    assert response.json() == {"items": []}


def test_timeline_created_event_after_create(client: TestClient) -> None:
    token = _register_and_login(client, email="tlcreated@example.com")
    created = _create_app(client, token, status="SAVED")

    response = client.get(
        f"/api/v1/applications/{created['id']}/events",
        headers=_auth(token),
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["event_type"] == "CREATED"
    assert items[0]["from_status"] is None
    assert items[0]["to_status"] == "SAVED"


def test_timeline_after_status_change(client: TestClient) -> None:
    token = _register_and_login(client, email="tlchange@example.com")
    created = _create_app(client, token, status="SAVED")

    patch = client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth(token),
        json={"status": "APPLIED"},
    )
    assert patch.status_code == 200

    response = client.get(
        f"/api/v1/applications/{created['id']}/events",
        headers=_auth(token),
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert [
        (item["event_type"], item["from_status"], item["to_status"]) for item in items
    ] == [
        ("CREATED", None, "SAVED"),
        ("STATUS_CHANGED", "SAVED", "APPLIED"),
    ]


def test_timeline_multi_transition_order(client: TestClient) -> None:
    token = _register_and_login(client, email="tlmulti@example.com")
    created = _create_app(client, token, status="SAVED")

    for status_value in ("APPLIED", "SCREENING", "INTERVIEW"):
        response = client.patch(
            f"/api/v1/applications/{created['id']}",
            headers=_auth(token),
            json={"status": status_value},
        )
        assert response.status_code == 200

    response = client.get(
        f"/api/v1/applications/{created['id']}/events",
        headers=_auth(token),
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert [
        (item["event_type"], item["from_status"], item["to_status"]) for item in items
    ] == [
        ("CREATED", None, "SAVED"),
        ("STATUS_CHANGED", "SAVED", "APPLIED"),
        ("STATUS_CHANGED", "APPLIED", "SCREENING"),
        ("STATUS_CHANGED", "SCREENING", "INTERVIEW"),
    ]
