"""Tests for auth tokens and PII encryption."""
from app.core.security import (
    create_access_token, decode_token, decrypt_pii, encrypt_pii,
    hash_password, verify_password,
)


def test_password_hash_roundtrip():
    h = hash_password("petrocore123")
    assert verify_password("petrocore123", h)
    assert not verify_password("wrong", h)


def test_jwt_roundtrip_carries_role_and_tenant():
    token = create_access_token("user-1", "HR_VALIDATOR", "tenant-9")
    claims = decode_token(token)
    assert claims["sub"] == "user-1"
    assert claims["role"] == "HR_VALIDATOR"
    assert claims["tenant"] == "tenant-9"


def test_pii_encryption_roundtrip():
    enc = encrypt_pii("ahmed@noc.ly")
    assert enc != "ahmed@noc.ly"
    assert decrypt_pii(enc) == "ahmed@noc.ly"
    assert encrypt_pii(None) is None
