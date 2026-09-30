import importlib
import sys
import uuid


def test_auth_service_defaults_to_local_fallback_when_supabase_is_missing():
    for module_name in ["app.supabase_client", "app.services.auth_service"]:
        sys.modules.pop(module_name, None)

    auth_service = importlib.import_module("app.services.auth_service")
    email = f"demo-{uuid.uuid4().hex[:8]}@example.com"

    signup_response = auth_service.signup_user(email, "StrongPass123", "Demo User")
    assert signup_response.user.email == email

    login_response = auth_service.login_user(email, "StrongPass123")
    assert login_response.user.email == email
    assert login_response.session.access_token
