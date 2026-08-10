from fastapi.testclient import TestClient


REGISTER_PAYLOAD = {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "full_name": "John Doe",
}


def test_register_success(client: TestClient) -> None:
    response = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["full_name"] == "John Doe"
    assert "id" in data
    assert "created_at" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client: TestClient) -> None:
    first = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert first.status_code == 201

    duplicate = client.post(
        "/api/v1/auth/register",
        json={
            "email": "User@Example.com",
            "password": "AnotherPassword123!",
            "full_name": "Jane Doe",
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Email already registered"


def test_login_success(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)

    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "user@example.com",
            "password": "StrongPassword123!",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert data["access_token"]
    assert "password_hash" not in data


def test_login_invalid_credentials(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)

    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "user@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_me_with_valid_token(client: TestClient) -> None:
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    login = client.post(
        "/api/v1/auth/login",
        data={
            "username": "user@example.com",
            "password": "StrongPassword123!",
        },
    )
    token = login.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["full_name"] == "John Doe"
    assert "password_hash" not in data


def test_me_without_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token(client: TestClient) -> None:
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )
    assert response.status_code == 401
