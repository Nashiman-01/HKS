from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.core.config import settings

BACKEND_DIR = Path(__file__).resolve().parents[1]


def run_upgrade(database_url):
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    settings.database_url = database_url
    command.upgrade(config, "head")


def test_initial_migration_creates_all_application_tables(monkeypatch, tmp_path):
    database_url = f"sqlite:///{tmp_path / 'fresh.db'}"
    monkeypatch.setattr(settings, "database_url", database_url)

    run_upgrade(database_url)

    engine = create_engine(database_url)
    assert {"alembic_version", "conversations", "messages", "documents", "message_documents"}.issubset(
        set(inspect(engine).get_table_names())
    )
    command.downgrade(Config(str(BACKEND_DIR / "alembic.ini")), "base")
    assert not {"conversations", "messages", "documents", "message_documents"}.intersection(
        set(inspect(engine).get_table_names())
    )
    engine.dispose()


def test_initial_migration_upgrades_existing_local_conversation_tables(monkeypatch, tmp_path):
    database_url = f"sqlite:///{tmp_path / 'legacy.db'}"
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE conversations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL)")
        connection.exec_driver_sql("CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL)")
    engine.dispose()
    monkeypatch.setattr(settings, "database_url", database_url)

    run_upgrade(database_url)

    migrated_engine = create_engine(database_url)
    assert {"conversations", "messages", "documents", "message_documents"}.issubset(
        set(inspect(migrated_engine).get_table_names())
    )
    migrated_engine.dispose()
