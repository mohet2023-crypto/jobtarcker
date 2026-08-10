from fastapi.testclient import TestClient


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


CREATE_PAYLOAD = {
    "company": "Acme Corp",
    "position": "Backend Engineer",
    "job_url": "https://example.com/jobs/1",
    "status": "APPLIED",
    "location": "Remote",
    "salary": "120000",
    "notes": "Referred by Alice",
}


def test_create_application_authenticated(client: TestClient) -> None:
    token = _register_and_login(client, email="owner@example.com")

    response = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json=CREATE_PAYLOAD,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["company"] == "Acme Corp"
    assert data["position"] == "Backend Engineer"
    assert data["status"] == "APPLIED"
    assert data["id"] is not None
    assert "user_id" not in data
    assert "password_hash" not in data


def test_create_application_unauthenticated(client: TestClient) -> None:
    response = client.post("/api/v1/applications", json=CREATE_PAYLOAD)
    assert response.status_code == 401


def test_created_application_belongs_to_authenticated_user(client: TestClient) -> None:
    token = _register_and_login(client, email="owner@example.com")

    create = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json={"company": "Globex", "position": "Intern"},
    )
    assert create.status_code == 201

    listing = client.get("/api/v1/applications", headers=_auth_header(token))
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["id"] == create.json()["id"]
    assert body["items"][0]["company"] == "Globex"


def test_list_applications_authenticated(client: TestClient) -> None:
    token = _register_and_login(client, email="lister@example.com")
    client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json={"company": "Initech", "position": "QA"},
    )
    client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json={"company": "Umbrella", "position": "SRE"},
    )

    response = client.get("/api/v1/applications", headers=_auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    companies = {item["company"] for item in data["items"]}
    assert companies == {"Initech", "Umbrella"}


def test_list_applications_empty(client: TestClient) -> None:
    token = _register_and_login(client, email="empty@example.com")

    response = client.get("/api/v1/applications", headers=_auth_header(token))
    assert response.status_code == 200
    assert response.json() == {
        "items": [],
        "page": 1,
        "page_size": 20,
        "total": 0,
        "pages": 0,
    }


def test_user_cannot_see_other_users_applications(client: TestClient) -> None:
    token_a = _register_and_login(client, email="usera@example.com", full_name="User A")
    token_b = _register_and_login(client, email="userb@example.com", full_name="User B")

    create_a = client.post(
        "/api/v1/applications",
        headers=_auth_header(token_a),
        json={"company": "Only A Corp", "position": "Engineer"},
    )
    assert create_a.status_code == 201

    list_b = client.get("/api/v1/applications", headers=_auth_header(token_b))
    assert list_b.status_code == 200
    assert list_b.json()["items"] == []
    assert list_b.json()["total"] == 0

    list_a = client.get("/api/v1/applications", headers=_auth_header(token_a))
    assert list_a.status_code == 200
    assert len(list_a.json()["items"]) == 1
    assert list_a.json()["items"][0]["company"] == "Only A Corp"


def test_create_application_requires_company_and_position(client: TestClient) -> None:
    token = _register_and_login(client, email="validator@example.com")

    response = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json={"company": "Missing Position Inc"},
    )
    assert response.status_code == 422


def test_get_application_authenticated(client: TestClient) -> None:
    token = _register_and_login(client, email="getter@example.com")
    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json=CREATE_PAYLOAD,
    ).json()

    response = client.get(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == created["id"]
    assert data["company"] == "Acme Corp"
    assert "user_id" not in data


def test_get_application_not_found(client: TestClient) -> None:
    token = _register_and_login(client, email="missing@example.com")

    response = client.get(
        "/api/v1/applications/999999",
        headers=_auth_header(token),
    )
    assert response.status_code == 404


def test_user_cannot_get_other_users_application(client: TestClient) -> None:
    token_a = _register_and_login(client, email="geta@example.com", full_name="User A")
    token_b = _register_and_login(client, email="getb@example.com", full_name="User B")

    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token_a),
        json={"company": "Private Co", "position": "Dev"},
    ).json()

    response = client.get(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token_b),
    )
    assert response.status_code == 404


def test_update_application_authenticated(client: TestClient) -> None:
    token = _register_and_login(client, email="updater@example.com")
    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json=CREATE_PAYLOAD,
    ).json()

    response = client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token),
        json={"status": "INTERVIEW", "notes": "Phone screen scheduled"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "INTERVIEW"
    assert data["notes"] == "Phone screen scheduled"
    assert data["company"] == "Acme Corp"


def test_partial_update_changes_only_supplied_fields(client: TestClient) -> None:
    token = _register_and_login(client, email="partial@example.com")
    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json=CREATE_PAYLOAD,
    ).json()

    response = client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token),
        json={"location": "New York"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["location"] == "New York"
    assert data["company"] == created["company"]
    assert data["position"] == created["position"]
    assert data["status"] == created["status"]
    assert data["salary"] == created["salary"]
    assert data["notes"] == created["notes"]


def test_user_cannot_update_other_users_application(client: TestClient) -> None:
    token_a = _register_and_login(client, email="upda@example.com", full_name="User A")
    token_b = _register_and_login(client, email="updb@example.com", full_name="User B")

    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token_a),
        json={"company": "Locked Co", "position": "Engineer"},
    ).json()

    response = client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token_b),
        json={"company": "Hijacked"},
    )
    assert response.status_code == 404

    original = client.get(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token_a),
    )
    assert original.status_code == 200
    assert original.json()["company"] == "Locked Co"


def test_update_application_not_found(client: TestClient) -> None:
    token = _register_and_login(client, email="updatemissing@example.com")

    response = client.patch(
        "/api/v1/applications/999999",
        headers=_auth_header(token),
        json={"company": "Nope"},
    )
    assert response.status_code == 404


def test_update_cannot_change_user_id(client: TestClient) -> None:
    token = _register_and_login(client, email="ownerlock@example.com")
    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json={"company": "Own Co", "position": "Dev"},
    ).json()

    response = client.patch(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token),
        json={"user_id": 999, "company": "Still Mine"},
    )
    # Extra fields are ignored by the update schema; ownership stays intact.
    assert response.status_code == 200
    assert response.json()["company"] == "Still Mine"
    assert "user_id" not in response.json()

    owned = client.get(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token),
    )
    assert owned.status_code == 200


def test_delete_application_authenticated(client: TestClient) -> None:
    token = _register_and_login(client, email="deleter@example.com")
    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json={"company": "Delete Me", "position": "Temp"},
    ).json()

    response = client.delete(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token),
    )
    assert response.status_code == 204
    assert response.content == b""


def test_deleted_application_cannot_be_retrieved(client: TestClient) -> None:
    token = _register_and_login(client, email="gone@example.com")
    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token),
        json={"company": "Gone Co", "position": "Temp"},
    ).json()

    delete = client.delete(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token),
    )
    assert delete.status_code == 204

    get_response = client.get(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token),
    )
    assert get_response.status_code == 404


def test_user_cannot_delete_other_users_application(client: TestClient) -> None:
    token_a = _register_and_login(client, email="dela@example.com", full_name="User A")
    token_b = _register_and_login(client, email="delb@example.com", full_name="User B")

    created = client.post(
        "/api/v1/applications",
        headers=_auth_header(token_a),
        json={"company": "Keep Me", "position": "Engineer"},
    ).json()

    response = client.delete(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token_b),
    )
    assert response.status_code == 404

    still_there = client.get(
        f"/api/v1/applications/{created['id']}",
        headers=_auth_header(token_a),
    )
    assert still_there.status_code == 200


def test_delete_application_not_found(client: TestClient) -> None:
    token = _register_and_login(client, email="deletemissing@example.com")

    response = client.delete(
        "/api/v1/applications/999999",
        headers=_auth_header(token),
    )
    assert response.status_code == 404
