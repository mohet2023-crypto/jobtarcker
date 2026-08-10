from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

FIXED_NOW = datetime(2026, 8, 10, 12, 0, 0, tzinfo=timezone.utc)


@pytest.fixture()
def freeze_now(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "app.dashboard.service.get_utc_now",
        lambda: FIXED_NOW,
    )


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


def _create(client: TestClient, token: str, **payload) -> dict:
    body = {"company": "Acme", "position": "Engineer", **payload}
    response = client.post(
        "/api/v1/applications",
        headers=_auth(token),
        json=body,
    )
    assert response.status_code == 201
    return response.json()


def test_upcoming_authenticated(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="upauth@example.com")
    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    assert response.json() == {"items": []}


def test_upcoming_unauthenticated(client: TestClient, freeze_now) -> None:
    response = client.get("/api/v1/dashboard/upcoming")
    assert response.status_code == 401


def test_upcoming_includes_future_deadline(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="upfuture@example.com")
    deadline = (FIXED_NOW + timedelta(days=2)).isoformat()
    created = _create(
        client,
        token,
        company="Google",
        position="Backend Engineer Intern",
        deadline=deadline,
    )

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == created["id"]
    assert items[0]["company"] == "Google"
    assert set(items[0].keys()) == {
        "id",
        "company",
        "position",
        "deadline",
        "days_remaining",
    }


def test_upcoming_excludes_past_deadline(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="uppast@example.com")
    _create(
        client,
        token,
        company="Past Co",
        deadline=(FIXED_NOW - timedelta(hours=1)).isoformat(),
    )

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["items"] == []


def test_upcoming_excludes_null_deadline(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="upnull@example.com")
    _create(client, token, company="No Deadline")

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["items"] == []


def test_upcoming_includes_deadline_exactly_now(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="upexact@example.com")
    created = _create(
        client,
        token,
        company="Exact Co",
        deadline=FIXED_NOW.isoformat(),
    )

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == created["id"]
    assert items[0]["days_remaining"] == 0


def test_upcoming_sorted_by_deadline_asc(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="upsort@example.com")
    later = _create(
        client,
        token,
        company="Later",
        deadline=(FIXED_NOW + timedelta(days=5)).isoformat(),
    )
    sooner = _create(
        client,
        token,
        company="Sooner",
        deadline=(FIXED_NOW + timedelta(days=1)).isoformat(),
    )

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [sooner["id"], later["id"]]


def test_upcoming_default_limit_at_most_10(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="updefaultlimit@example.com")
    for i in range(12):
        _create(
            client,
            token,
            company=f"Co {i}",
            deadline=(FIXED_NOW + timedelta(days=i + 1)).isoformat(),
        )

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    assert len(response.json()["items"]) == 10


def test_upcoming_custom_limit(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="upcustomlimit@example.com")
    for i in range(8):
        _create(
            client,
            token,
            company=f"Co {i}",
            deadline=(FIXED_NOW + timedelta(days=i + 1)).isoformat(),
        )

    response = client.get(
        "/api/v1/dashboard/upcoming",
        headers=_auth(token),
        params={"limit": 5},
    )
    assert response.status_code == 200
    assert len(response.json()["items"]) == 5


def test_upcoming_limit_50_accepted(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="uplimit50@example.com")
    response = client.get(
        "/api/v1/dashboard/upcoming",
        headers=_auth(token),
        params={"limit": 50},
    )
    assert response.status_code == 200


@pytest.mark.parametrize("limit", [0, -1, 51])
def test_upcoming_invalid_limit_returns_422(
    client: TestClient,
    freeze_now,
    limit: int,
) -> None:
    token = _register_and_login(client, email=f"upbadlimit{limit}@example.com")
    response = client.get(
        "/api/v1/dashboard/upcoming",
        headers=_auth(token),
        params={"limit": limit},
    )
    assert response.status_code == 422


def test_upcoming_user_isolation(client: TestClient, freeze_now) -> None:
    token_a = _register_and_login(client, email="upa@example.com", full_name="A")
    token_b = _register_and_login(client, email="upb@example.com", full_name="B")

    app_a = _create(
        client,
        token_a,
        company="Only A",
        deadline=(FIXED_NOW + timedelta(days=1)).isoformat(),
    )
    app_b = _create(
        client,
        token_b,
        company="Only B",
        deadline=(FIXED_NOW + timedelta(days=1)).isoformat(),
    )

    response_a = client.get("/api/v1/dashboard/upcoming", headers=_auth(token_a))
    response_b = client.get("/api/v1/dashboard/upcoming", headers=_auth(token_b))

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert [item["id"] for item in response_a.json()["items"]] == [app_a["id"]]
    assert [item["company"] for item in response_a.json()["items"]] == ["Only A"]
    assert [item["id"] for item in response_b.json()["items"]] == [app_b["id"]]
    assert [item["company"] for item in response_b.json()["items"]] == ["Only B"]


def test_days_remaining_same_calendar_day(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="updays0@example.com")
    _create(
        client,
        token,
        company="Same Day",
        deadline=datetime(2026, 8, 10, 23, 0, 0, tzinfo=timezone.utc).isoformat(),
    )

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["items"][0]["days_remaining"] == 0


def test_days_remaining_next_calendar_day(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="updays1@example.com")
    # Late tonight vs early tomorrow still crosses one UTC calendar day.
    _create(
        client,
        token,
        company="Next Day",
        deadline=datetime(2026, 8, 11, 1, 0, 0, tzinfo=timezone.utc).isoformat(),
    )

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["items"][0]["days_remaining"] == 1


def test_days_remaining_two_calendar_days(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="updays2@example.com")
    _create(
        client,
        token,
        company="Two Days",
        deadline=datetime(2026, 8, 12, 9, 0, 0, tzinfo=timezone.utc).isoformat(),
    )

    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["items"][0]["days_remaining"] == 2


def test_upcoming_empty_state(client: TestClient, freeze_now) -> None:
    token = _register_and_login(client, email="upempty@example.com")
    response = client.get("/api/v1/dashboard/upcoming", headers=_auth(token))
    assert response.status_code == 200
    assert response.json() == {"items": []}
