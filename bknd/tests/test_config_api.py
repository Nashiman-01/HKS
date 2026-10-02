import asyncio

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.database.connection import normalize_database_url


def test_cors_rejects_wildcard_and_accepts_explicit_origins():
    with pytest.raises(ValueError):
        Settings(cors_origins="*")

    settings = Settings(cors_origins="https://app.example.com,http://127.0.0.1:5173")
    assert settings.cors_origins == "https://app.example.com,http://127.0.0.1:5173"


def test_postgres_urls_use_the_installed_psycopg3_driver():
    assert normalize_database_url("postgres://db.example.com/app") == "postgresql+psycopg://db.example.com/app"
    assert normalize_database_url("postgresql://db.example.com/app") == "postgresql+psycopg://db.example.com/app"
    assert normalize_database_url("sqlite:///./app.db") == "sqlite:///./app.db"


@pytest.mark.parametrize("path", ["/api/auth/signup", "/api/auth/login"])
@pytest.mark.parametrize("origin", ["http://127.0.0.1:5173", "http://localhost:5173"])
def test_auth_cors_preflight_allows_configured_local_frontend(path, origin):
    response = TestClient(app).options(
        path,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    allowed_methods = response.headers["access-control-allow-methods"]
    assert "POST" in allowed_methods
    assert "OPTIONS" in allowed_methods
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers


def test_health_returns_safe_service_unavailable_on_database_error(monkeypatch):
    from app import main

    class BrokenEngine:
        def connect(self):
            raise RuntimeError("private database connection detail")

    monkeypatch.setattr(main, "engine", BrokenEngine())
    with pytest.raises(HTTPException) as caught:
        asyncio.run(main.health_check())

    assert caught.value.status_code == 503
    assert caught.value.detail == "database_unavailable"
