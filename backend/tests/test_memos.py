import pytest


@pytest.fixture
def auth_client(client):
    """ログイン済みのクライアントを返す fixture"""
    client.post("/auth/register", json={"email": "user@example.com", "password": "pass1234"})
    client.post("/auth/login", json={"email": "user@example.com", "password": "pass1234"})
    return client


def test_create_memo(auth_client):
    res = auth_client.post("/memos", json={"title": "テストメモ", "body": "本文です"})
    assert res.status_code == 201
    assert res.json()["title"] == "テストメモ"


def test_list_memos(auth_client):
    auth_client.post("/memos", json={"title": "メモ1", "body": ""})
    auth_client.post("/memos", json={"title": "メモ2", "body": ""})
    res = auth_client.get("/memos")
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_search_memos(auth_client):
    auth_client.post("/memos", json={"title": "Python tips", "body": ""})
    auth_client.post("/memos", json={"title": "買い物リスト", "body": ""})
    res = auth_client.get("/memos?q=python")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "Python tips"


def test_get_memo(auth_client):
    created = auth_client.post("/memos", json={"title": "詳細テスト", "body": "内容"}).json()
    res = auth_client.get(f"/memos/{created['id']}")
    assert res.status_code == 200
    assert res.json()["body"] == "内容"


def test_update_memo(auth_client):
    created = auth_client.post("/memos", json={"title": "旧タイトル", "body": ""}).json()
    res = auth_client.patch(f"/memos/{created['id']}", json={"title": "新タイトル"})
    assert res.status_code == 200
    assert res.json()["title"] == "新タイトル"


def test_delete_memo(auth_client):
    created = auth_client.post("/memos", json={"title": "削除対象", "body": ""}).json()
    res = auth_client.delete(f"/memos/{created['id']}")
    assert res.status_code == 204
    res2 = auth_client.get(f"/memos/{created['id']}")
    assert res2.status_code == 404


def test_memo_requires_auth(client):
    res = client.get("/memos")
    assert res.status_code == 401
