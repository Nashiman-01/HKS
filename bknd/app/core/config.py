from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent


class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_key: str

    groq_api_key: str
    groq_model: str
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3000,http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=[
            Path(".env"),
            BASE_DIR / ".env",
            ROOT_DIR / ".env",
        ],
        extra="ignore",
    )


settings = Settings()