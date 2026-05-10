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
