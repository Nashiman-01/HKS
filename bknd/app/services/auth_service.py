from app.supabase_client import create_supabase_auth_client
from app.core.config import settings


def _require_supabase():
    return create_supabase_auth_client().auth


def signup_user(email: str, password: str, full_name: str):
    response = _require_supabase().sign_up(
        {
            "email": email,
            "password": password,
            "options": {
                "email_redirect_to": f"{settings.frontend_url.rstrip('/')}/login",
                "data": {
                    "full_name": full_name
                }
            }
        }
    )

    return response


def login_user(email: str, password: str):
    response = _require_supabase().sign_in_with_password(
        {
            "email": email,
            "password": password,
        }
    )

    return response


def get_current_user(access_token: str):
    response = _require_supabase().get_user(access_token)

    return response.user


def refresh_user_session(refresh_token: str):
    return _require_supabase().refresh_session(refresh_token)


def sign_out_user(access_token: str, refresh_token: str):
    auth = _require_supabase()
    auth.set_session(access_token, refresh_token)
    auth.sign_out({"scope": "local"})