from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dashboard.service import utc_month_start, utc_week_start
from app.models.application import JobApplication


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


ZERO_STATUS = {
    "SAVED": 0,
    "APPLIED": 0,
    "SCREENING": 0,
    "INTERVIEW": 0,
    "OFFER": 0,
    "REJECTED": 0,
    "WITHDRAWN": 0,
}


def test_dashboard_authenticated(client: TestClient) -> None:
    token = _register_and_login(client, email="dash@example.com")
    response = client.get("/api/v1/dashboard", headers=_auth(token))
    assert response.status_code == 200
    assert set(response.json().keys()) == {
        "total_applications",
        "by_status",
        "applications_this_week",
        "applications_this_month",
    }


def test_dashboard_unauthenticated(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 401


def test_dashboard_total_count(client: TestClient) -> None:
    token = _register_and_login(client, email="dashtotal@example.com")
    _create_app(client, token, company="A")
    _create_app(client, token, company="B")
    _create_app(client, token, company="C")

    response = client.get("/api/v1/dashboard", headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["total_applications"] == 3


def test_dashboard_status_counts(client: TestClient) -> None:
    token = _register_and_login(client, email="dashstatus@example.com")
    _create_app(client, token, status="APPLIED")
    _create_app(client, token, status="APPLIED")
    _create_app(client, token, status="INTERVIEW")
    _create_app(client, token, status="OFFER")

    response = client.get("/api/v1/dashboard", headers=_auth(token))
    assert response.status_code == 200
    by_status = response.json()["by_status"]
    assert by_status["APPLIED"] == 2
    assert by_status["INTERVIEW"] == 1
    assert by_status["OFFER"] == 1


def test_dashboard_includes_zero_status_counts(client: TestClient) -> None:
    token = _register_and_login(client, email="dashzeros@example.com")
    _create_app(client, token, status="SAVED")

    response = client.get("/api/v1/dashboard", headers=_auth(token))
    assert response.status_code == 200
    by_status = response.json()["by_status"]
    assert set(by_status.keys()) == set(ZERO_STATUS.keys())
    assert by_status["SAVED"] == 1
    assert by_status["WITHDRAWN"] == 0
    assert by_status["REJECTED"] == 0


def test_dashboard_weekly_count(client: TestClient, db_session: Session) -> None:
    token = _register_and_login(client, email="dashweek@example.com")
    in_week = _create_app(client, token, company="In Week")
    out_week = _create_app(client, token, company="Out Week")

    now = datetime.now(timezone.utc)
    week_start = utc_week_start(now)

    apps = {
        app.id: app
        for app in db_session.scalars(select(JobApplication)).all()
    }
    apps[in_week["id"]].created_at = week_start + timedelta(hours=3)
    apps[out_week["id"]].created_at = week_start - timedelta(days=1)
    db_session.commit()

    response = client.get("/api/v1/dashboard", headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["applications_this_week"] == 1


def test_dashboard_monthly_count(client: TestClient, db_session: Session) -> None:
    token = _register_and_login(client, email="dashmonth@example.com")
    in_month = _create_app(client, token, company="In Month")
    out_month = _create_app(client, token, company="Out Month")

    now = datetime.now(timezone.utc)
    month_start = utc_month_start(now)

    apps = {
        app.id: app
        for app in db_session.scalars(select(JobApplication)).all()
    }
    apps[in_month["id"]].created_at = month_start + timedelta(days=1)
    apps[out_month["id"]].created_at = month_start - timedelta(days=1)
    db_session.commit()

    response = client.get("/api/v1/dashboard", headers=_auth(token))
    assert response.status_code == 200
    assert response.json()["applications_this_month"] == 1


def test_dashboard_isolation_between_users(client: TestClient) -> None:
    token_a = _register_and_login(client, email="dasha@example.com", full_name="A")
    token_b = _register_and_login(client, email="dashb@example.com", full_name="B")

    _create_app(client, token_a, status="APPLIED")
    _create_app(client, token_a, status="INTERVIEW")
    _create_app(client, token_b, status="OFFER")

    response_a = client.get("/api/v1/dashboard", headers=_auth(token_a))
    response_b = client.get("/api/v1/dashboard", headers=_auth(token_b))

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert response_a.json()["total_applications"] == 2
    assert response_a.json()["by_status"]["APPLIED"] == 1
    assert response_a.json()["by_status"]["INTERVIEW"] == 1
    assert response_a.json()["by_status"]["OFFER"] == 0
    assert response_b.json()["total_applications"] == 1
    assert response_b.json()["by_status"]["OFFER"] == 1
    assert response_b.json()["by_status"]["APPLIED"] == 0


def test_dashboard_empty_user(client: TestClient) -> None:
    token = _register_and_login(client, email="dashempty@example.com")

    response = client.get("/api/v1/dashboard", headers=_auth(token))
    assert response.status_code == 200
    assert response.json() == {
        "total_applications": 0,
        "by_status": ZERO_STATUS,
        "applications_this_week": 0,
        "applications_this_month": 0,
    }
