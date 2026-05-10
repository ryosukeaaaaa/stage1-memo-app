from app.auth.service import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hash_and_verify():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_and_decode_token():
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    token = create_access_token(user_id)
    decoded = decode_access_token(token)
    assert decoded == user_id


def test_decode_invalid_token():
    result = decode_access_token("invalid.token.here")
    assert result is None


def test_register(client):
    res = client.post("/auth/register", json={"email": "test@example.com", "password": "pass1234"})
    assert res.status_code == 201
    assert res.json()["email"] == "test@example.com"


def test_register_duplicate_email(client):
    client.post("/auth/register", json={"email": "test@example.com", "password": "pass1234"})
    res = client.post("/auth/register", json={"email": "test@example.com", "password": "other"})
    assert res.status_code == 409


def test_login_success(client):
    client.post("/auth/register", json={"email": "test@example.com", "password": "pass1234"})
    res = client.post("/auth/login", json={"email": "test@example.com", "password": "pass1234"})
    assert res.status_code == 200
    assert "access_token" in res.cookies


def test_login_wrong_password(client):
    client.post("/auth/register", json={"email": "test@example.com", "password": "pass1234"})
    res = client.post("/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert res.status_code == 401


def test_me_authenticated(client):
    client.post("/auth/register", json={"email": "test@example.com", "password": "pass1234"})
    client.post("/auth/login", json={"email": "test@example.com", "password": "pass1234"})
    res = client.get("/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == "test@example.com"


def test_me_unauthenticated(client):
    res = client.get("/auth/me")
    assert res.status_code == 401
