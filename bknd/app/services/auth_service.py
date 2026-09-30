from app.supabase_client import supabase


def signup_user(email: str, password: str, full_name: str):
    response = supabase.auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "full_name": full_name
                }
            }
        }
    )

    return response


def login_user(email: str, password: str):
    response = supabase.auth.sign_in_with_password(
        {
            "email": email,
            "password": password,
        }
    )

    return response


def get_current_user(access_token: str):
    response = supabase.auth.get_user(access_token)

    return response.user