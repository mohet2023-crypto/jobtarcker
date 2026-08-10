from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


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
    response = client.post(
        "/api/v1/applications",
        headers=_auth(token),
        json=payload,
    )
    assert response.status_code == 201
    return response.json()


def test_search_by_company(client: TestClient) -> None:
    token = _register_and_login(client, email="searchco@example.com")
    _create(client, token, company="Google", position="SWE")
    _create(client, token, company="Amazon", position="SWE")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"search": "google"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["company"] == "Google"


def test_search_by_position(client: TestClient) -> None:
    token = _register_and_login(client, email="searchpos@example.com")
    _create(client, token, company="Acme", position="Backend Engineer at Google")
    _create(client, token, company="Acme", position="Designer")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"search": "google"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert "Google" in response.json()["items"][0]["position"]


def test_search_case_insensitive(client: TestClient) -> None:
    token = _register_and_login(client, email="searchcase@example.com")
    _create(client, token, company="Google DeepMind", position="Researcher")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"search": "GoOgLe"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_search_does_not_return_other_users(client: TestClient) -> None:
    token_a = _register_and_login(client, email="searcha@example.com", full_name="A")
    token_b = _register_and_login(client, email="searchb@example.com", full_name="B")
    _create(client, token_a, company="Google", position="SWE")
    _create(client, token_b, company="Google", position="SWE")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token_a),
        params={"search": "google"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_filter_by_status(client: TestClient) -> None:
    token = _register_and_login(client, email="filterstatus@example.com")
    _create(client, token, company="A", position="Dev", status="APPLIED")
    _create(client, token, company="B", position="Dev", status="INTERVIEW")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"status": "INTERVIEW"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["status"] == "INTERVIEW"


def test_filter_by_location(client: TestClient) -> None:
    token = _register_and_login(client, email="filterloc@example.com")
    _create(client, token, company="A", position="Dev", location="Remote - Europe")
    _create(client, token, company="B", position="Dev", location="New York")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"location": "remote"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert "Remote" in response.json()["items"][0]["location"]


def test_invalid_status_returns_422(client: TestClient) -> None:
    token = _register_and_login(client, email="badstatus@example.com")
    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"status": "NOT_A_STATUS"},
    )
    assert response.status_code == 422


def test_default_pagination(client: TestClient) -> None:
    token = _register_and_login(client, email="pagedefault@example.com")
    for i in range(3):
        _create(client, token, company=f"Co {i}", position="Dev")

    response = client.get("/api/v1/applications", headers=_auth(token))
    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 1
    assert body["page_size"] == 20
    assert body["total"] == 3
    assert body["pages"] == 1
    assert len(body["items"]) == 3


def test_custom_page_and_page_size(client: TestClient) -> None:
    token = _register_and_login(client, email="pagecustom@example.com")
    for i in range(5):
        _create(client, token, company=f"Co {i}", position="Dev")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"page": 2, "page_size": 2, "sort_by": "company", "sort_order": "asc"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 2
    assert body["page_size"] == 2
    assert body["total"] == 5
    assert body["pages"] == 3
    assert len(body["items"]) == 2
    assert body["items"][0]["company"] == "Co 2"


def test_page_size_over_100_returns_422(client: TestClient) -> None:
    token = _register_and_login(client, email="pagesize@example.com")
    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"page_size": 101},
    )
    assert response.status_code == 422


def test_page_less_than_1_returns_422(client: TestClient) -> None:
    token = _register_and_login(client, email="pagezero@example.com")
    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"page": 0},
    )
    assert response.status_code == 422


def test_empty_result_metadata(client: TestClient) -> None:
    token = _register_and_login(client, email="pagemeta@example.com")
    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"search": "nothing-matches"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "items": [],
        "page": 1,
        "page_size": 20,
        "total": 0,
        "pages": 0,
    }


def test_total_count_is_correct(client: TestClient) -> None:
    token = _register_and_login(client, email="pagetotal@example.com")
    for i in range(7):
        _create(
            client,
            token,
            company="Counted",
            position=f"Role {i}",
            status="APPLIED" if i < 4 else "SAVED",
        )

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"status": "APPLIED", "page_size": 2},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 4
    assert body["pages"] == 2
    assert len(body["items"]) == 2


def test_sort_by_company_asc(client: TestClient) -> None:
    token = _register_and_login(client, email="sortco@example.com")
    _create(client, token, company="Zebra", position="Dev")
    _create(client, token, company="Alpha", position="Dev")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"sort_by": "company", "sort_order": "asc"},
    )
    assert response.status_code == 200
    companies = [item["company"] for item in response.json()["items"]]
    assert companies == ["Alpha", "Zebra"]


def test_sort_by_created_at_desc(client: TestClient) -> None:
    token = _register_and_login(client, email="sortcreated@example.com")
    first = _create(client, token, company="First", position="Dev")
    second = _create(client, token, company="Second", position="Dev")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"sort_by": "created_at", "sort_order": "desc"},
    )
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert ids[0] == second["id"]
    assert ids[1] == first["id"]


def test_sort_by_deadline_asc(client: TestClient) -> None:
    token = _register_and_login(client, email="sortdeadline@example.com")
    later = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    sooner = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    _create(client, token, company="Later", position="Dev", deadline=later)
    _create(client, token, company="Sooner", position="Dev", deadline=sooner)
    _create(client, token, company="None", position="Dev")

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"sort_by": "deadline", "sort_order": "asc"},
    )
    assert response.status_code == 200
    companies = [item["company"] for item in response.json()["items"]]
    assert companies[0] == "Sooner"
    assert companies[1] == "Later"
    assert companies[2] == "None"


def test_invalid_sort_by_returns_422(client: TestClient) -> None:
    token = _register_and_login(client, email="badsortby@example.com")
    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"sort_by": "password_hash"},
    )
    assert response.status_code == 422


def test_invalid_sort_order_returns_422(client: TestClient) -> None:
    token = _register_and_login(client, email="badsortorder@example.com")
    response = client.get(
        "/api/v1/applications",
        headers=_auth(token),
        params={"sort_order": "sideways"},
    )
    assert response.status_code == 422


def test_query_cannot_expose_other_users_applications(client: TestClient) -> None:
    token_a = _register_and_login(client, email="securea@example.com", full_name="A")
    token_b = _register_and_login(client, email="secureb@example.com", full_name="B")
    _create(
        client,
        token_a,
        company="Secret Google",
        position="Staff",
        status="INTERVIEW",
        location="Remote",
    )
    _create(
        client,
        token_b,
        company="Visible Google",
        position="Staff",
        status="INTERVIEW",
        location="Remote",
    )

    response = client.get(
        "/api/v1/applications",
        headers=_auth(token_b),
        params={
            "search": "google",
            "status": "INTERVIEW",
            "location": "remote",
            "sort_by": "company",
            "sort_order": "asc",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["company"] == "Visible Google"
