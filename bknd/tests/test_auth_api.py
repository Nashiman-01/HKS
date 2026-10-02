import asyncio

import pytest
from fastapi import HTTPException
from types import SimpleNamespace

from app.api import auth as auth_api


def test_auth_errors_do_not_expose_provider_exception_text():
    with pytest.raises(HTTPException) as caught:
        auth_api.raise_auth_error(RuntimeError("private-provider-detail user@example.test"), 500)

    assert caught.value.status_code == 500
    assert caught.value.detail == "auth.providerError"
    assert "private-provider-detail" not in caught.value.detail


def test_session_endpoint_returns_only_the_supabase_verified_user(monkeypatch):
    monkeypatch.setattr(auth_api, "get_current_user", lambda token: SimpleNamespace(
        id="verified-user-id",
        email="person@example.com",
        user_metadata={"full_name": "Example Person"},
    ))

    result = asyncio.run(auth_api.validate_session(auth_api.SessionRequest(access_token="valid-test-token")))

    assert result == {
        "user_id": "verified-user-id",
        "email": "person@example.com",
        "full_name": "Example Person",
    }


def test_session_endpoint_rejects_invalid_supabase_token(monkeypatch):
    monkeypatch.setattr(auth_api, "get_current_user", lambda token: (_ for _ in ()).throw(RuntimeError("private token detail")))

    with pytest.raises(HTTPException) as caught:
        asyncio.run(auth_api.validate_session(auth_api.SessionRequest(access_token="invalid-test-token")))

    assert caught.value.status_code == 401
    assert caught.value.detail == "invalid_session"


def test_supabase_network_failure_is_not_reported_as_bad_credentials():
    with pytest.raises(HTTPException) as caught:
        auth_api.raise_auth_error(RuntimeError("connection timed out"), 401)

    assert caught.value.status_code == 503
    assert caught.value.detail == "auth.networkError"
