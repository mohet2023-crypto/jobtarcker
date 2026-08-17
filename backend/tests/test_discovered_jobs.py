from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.discovered_job import DiscoveredJob, EligibilityStatus


def _register_and_login(
    client: TestClient,
    *,
    email: str,
    password: str = "StrongPassword123!",
    full_name: str = "Test User",
) -> str:
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
        },
    )
    assert register.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 200
    return login.json()["access_token"]


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_discovered_job(db_session: Session) -> DiscoveredJob:
    job = DiscoveredJob(
        title="Platform Engineer",
        company="Globex",
        location="Berlin, Germany",
        description="Build global infrastructure.",
        employment_type="FULL_TIME",
        source="curated",
        external_job_id="curated-globex-platform",
        source_url="https://example.com/jobs/platform-engineer",
        remote_status=EligibilityStatus.YES,
        visa_sponsorship_status=EligibilityStatus.UNKNOWN,
        relocation_status=EligibilityStatus.YES,
        international_eligibility_status=EligibilityStatus.UNKNOWN,
        discovered_at=datetime(2026, 8, 1, tzinfo=timezone.utc),
        salary="€90k–€110k",
        experience_level="Mid",
        skills="Python, Kubernetes",
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


def test_list_discovered_jobs_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/discovered-jobs")
    assert response.status_code == 401


def test_list_discovered_jobs_empty(client: TestClient) -> None:
    token = _register_and_login(client, email="discovery-empty@example.com")

    response = client.get(
        "/api/v1/discovered-jobs",
        headers=_auth_header(token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["pages"] == 0
    assert data["page"] == 1
    assert data["page_size"] == 20


def test_list_discovered_jobs_with_filters(
    client: TestClient,
    db_session: Session,
) -> None:
    _seed_discovered_job(db_session)
    token = _register_and_login(client, email="discovery-list@example.com")

    response = client.get(
        "/api/v1/discovered-jobs",
        headers=_auth_header(token),
        params={
            "search": "Globex",
            "remote_status": "YES",
            "sort_by": "company",
            "sort_order": "asc",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["title"] == "Platform Engineer"
    assert item["company"] == "Globex"
    assert item["remote_status"] == "YES"
    assert item["visa_sponsorship_status"] == "UNKNOWN"


def test_get_discovered_job(client: TestClient, db_session: Session) -> None:
    job = _seed_discovered_job(db_session)
    token = _register_and_login(client, email="discovery-get@example.com")

    response = client.get(
        f"/api/v1/discovered-jobs/{job.id}",
        headers=_auth_header(token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == job.id
    assert data["international_eligibility_status"] == "UNKNOWN"
    assert data["skills"] == "Python, Kubernetes"


def test_get_discovered_job_not_found(client: TestClient) -> None:
    token = _register_and_login(client, email="discovery-404@example.com")

    response = client.get(
        "/api/v1/discovered-jobs/99999",
        headers=_auth_header(token),
    )

    assert response.status_code == 404
