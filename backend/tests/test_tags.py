import pytest


@pytest.fixture
def auth_client(client):
    client.post("/auth/register", json={"email": "user@example.com", "password": "pass1234"})
    client.post("/auth/login", json={"email": "user@example.com", "password": "pass1234"})
    return client


def test_create_tag(auth_client):
    res = auth_client.post("/tags", json={"name": "仕事"})
    assert res.status_code == 201
    assert res.json()["name"] == "仕事"


def test_list_tags(auth_client):
    auth_client.post("/tags", json={"name": "仕事"})
    auth_client.post("/tags", json={"name": "プライベート"})
    res = auth_client.get("/tags")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_duplicate_tag_name(auth_client):
    auth_client.post("/tags", json={"name": "仕事"})
    res = auth_client.post("/tags", json={"name": "仕事"})
    assert res.status_code == 409


def test_delete_tag(auth_client):
    created = auth_client.post("/tags", json={"name": "削除対象"}).json()
    res = auth_client.delete(f"/tags/{created['id']}")
    assert res.status_code == 204
