import pytest


def test_auth_service_fails_closed_when_supabase_is_missing(monkeypatch):
    from app.services import auth_service

    def missing_supabase():
        raise RuntimeError("supabase_not_configured")

    monkeypatch.setattr(auth_service, "create_supabase_auth_client", missing_supabase)

    with pytest.raises(RuntimeError, match="supabase_not_configured"):
        auth_service.signup_user("user@example.com", "password123", "User")
    with pytest.raises(RuntimeError, match="supabase_not_configured"):
        auth_service.login_user("user@example.com", "password123")
    with pytest.raises(RuntimeError, match="supabase_not_configured"):
        auth_service.get_current_user("token")
    with pytest.raises(RuntimeError, match="supabase_not_configured"):
        auth_service.sign_out_user("access-token", "refresh-token")
