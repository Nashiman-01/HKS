from supabase import create_client

from app.core.config import settings


def create_supabase_auth_client():
    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("supabase_not_configured")
    return create_client(settings.supabase_url, settings.supabase_key)