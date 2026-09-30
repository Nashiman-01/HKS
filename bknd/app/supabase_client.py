import json
import uuid
from pathlib import Path
from types import SimpleNamespace

from supabase import Client, create_client

from app.core.config import settings


class LocalAuthUser:
    def __init__(self, user_id: str, email: str, full_name: str):
        self.id = user_id
        self.email = email
        self.user_metadata = {"full_name": full_name}


class LocalAuthSession:
    def __init__(self, user: LocalAuthUser, access_token: str | None = None):
        self.access_token = access_token or f"local-{uuid.uuid4().hex}"
        self.refresh_token = f"local-refresh-{uuid.uuid4().hex}"
        self.user = user


class LocalAuthClient:
    def __init__(self):
        self._store_path = Path(__file__).resolve().parent.parent / ".local_auth_store.json"
        self._users = self._load_store()
        self._sessions = {}

    def _load_store(self):
        if not self._store_path.exists():
            return {}

        try:
            return json.loads(self._store_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}

    def _save_store(self):
        self._store_path.write_text(json.dumps(self._users, indent=2), encoding="utf-8")

    def _generate_user_id(self):
        return uuid.uuid4().hex

    def sign_up(self, payload):
        email = payload["email"].strip().lower()
        password = payload["password"]
        full_name = payload.get("options", {}).get("data", {}).get("full_name", "")

        if email in self._users:
            raise ValueError("User already exists")

        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters")

        user_id = self._generate_user_id()
        user = LocalAuthUser(user_id, email, full_name)
        self._users[email] = {
            "password": password,
            "user": {
                "id": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata,
                "full_name": full_name,
            },
        }
        self._save_store()

        session = LocalAuthSession(user)
        self._sessions[session.access_token] = user
        return SimpleNamespace(user=user, session=session)

    def sign_in_with_password(self, payload):
        email = payload["email"].strip().lower()
        password = payload["password"]
        stored_user = self._users.get(email)

        if stored_user is None or stored_user["password"] != password:
            raise ValueError("Invalid email or password")

        user_id = stored_user["user"]["id"]
        user = LocalAuthUser(user_id, email, stored_user["user"].get("full_name", ""))
        session = LocalAuthSession(user)
        self._sessions[session.access_token] = user
        return SimpleNamespace(user=user, session=session)

    def get_user(self, access_token):
        user = self._sessions.get(access_token)
        if user is not None:
            return SimpleNamespace(user=user)

        raise ValueError("Invalid session")


local_auth = LocalAuthClient()

if settings.supabase_url and settings.supabase_key:
    supabase: Client = create_client(
        settings.supabase_url,
        settings.supabase_key,
    )
else:
    supabase = SimpleNamespace(auth=local_auth)