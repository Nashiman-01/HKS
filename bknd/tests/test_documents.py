from io import BytesIO
from types import SimpleNamespace
from xml.etree import ElementTree
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from fastapi import Header

from app.api import conversations, documents
from app.api.dependencies import get_authenticated_user
from app.main import app


def make_docx(text_value="The agreement states a 30-day notice period."):
    document_xml = ElementTree.Element("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document")
    body = ElementTree.SubElement(document_xml, "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}body")
    paragraph = ElementTree.SubElement(body, "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p")
    run = ElementTree.SubElement(paragraph, "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r")
    text_node = ElementTree.SubElement(run, "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
    text_node.text = text_value

    content = BytesIO()
    with ZipFile(content, "w", ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", ElementTree.tostring(document_xml))
    return content.getvalue()


def setup_test_database(monkeypatch):
    test_engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    with test_engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE conversations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)")
        connection.exec_driver_sql("CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
        connection.exec_driver_sql("CREATE TABLE documents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, file_path TEXT NOT NULL, extracted_text TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
        connection.exec_driver_sql("CREATE TABLE message_documents (message_id TEXT NOT NULL, document_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY (message_id, document_id))")
    monkeypatch.setattr(documents, "engine", test_engine)
    monkeypatch.setattr(conversations, "engine", test_engine)
    return test_engine


def test_documents_require_auth_and_are_owner_scoped_with_chat_context(monkeypatch, tmp_path):
    test_engine = setup_test_database(monkeypatch)
    monkeypatch.setattr(documents, "UPLOAD_DIR", tmp_path)
    client = TestClient(app)

    assert client.get("/api/documents").status_code in (401, 403)
    assert client.delete("/api/documents/unknown").status_code in (401, 403)
    assert client.get("/api/conversations").status_code in (401, 403)

    def test_identity(x_test_user: str = Header(...)):
        return SimpleNamespace(id=x_test_user)

    monkeypatch.setitem(app.dependency_overrides, get_authenticated_user, test_identity)
    upload = client.post(
        "/api/documents",
        headers={"X-Test-User": "user-a"},
        files={"file": ("agreement.docx", make_docx(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert upload.status_code == 200
    uploaded_document = upload.json()["document"]
    assert uploaded_document["status"] == "ready"

    assert len(client.get("/api/documents", headers={"X-Test-User": "user-a"}).json()["documents"]) == 1
    assert client.get("/api/documents", headers={"X-Test-User": "user-b"}).json()["documents"] == []
    other_users_upload = client.post(
        "/api/documents",
        headers={"X-Test-User": "user-b"},
        files={"file": ("private.docx", make_docx("Private user B text."), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    other_users_document_id = other_users_upload.json()["document"]["id"]

    conversation = client.post("/api/conversations", headers={"X-Test-User": "user-a"}, json={"title": "Agreement"}).json()["data"]
    assert client.get(
        f"/api/conversations/{conversation['id']}",
        headers={"X-Test-User": "user-b"},
    ).status_code == 404
    assert client.post(
        f"/api/conversations/{conversation['id']}/messages",
        headers={"X-Test-User": "user-b"},
        json={"content": "Read this conversation"},
    ).status_code == 404
    captured_context = []
    monkeypatch.setattr(conversations, "process_case", lambda *args, **kwargs: captured_context.append(kwargs["document_context"]) or {
        "intake": {"problem_summary": "Agreement review"},
        "response": {"answer": "The agreement says 30 days."},
    })
    message = client.post(
        f"/api/conversations/{conversation['id']}/messages",
        headers={"X-Test-User": "user-a"},
        json={"content": "Summarize the notice period", "document_ids": [uploaded_document["id"]]},
    )
    assert message.status_code == 200
    assert "30-day notice period" in captured_context[0]
    assert message.json()["user_message"]["attachments"][0]["id"] == uploaded_document["id"]

    history = client.get(
        f"/api/conversations/{conversation['id']}/messages",
        headers={"X-Test-User": "user-a"},
    ).json()["data"]
    assert history[0]["attachments"][0]["name"] == "agreement.docx"
    assert client.delete(
        f"/api/conversations/{conversation['id']}",
        headers={"X-Test-User": "user-b"},
    ).status_code == 404
    with test_engine.connect() as connection:
        assert connection.exec_driver_sql("SELECT count(*) FROM messages").scalar_one() == 2
        assert connection.exec_driver_sql("SELECT count(*) FROM message_documents").scalar_one() == 1

    cross_user_message = client.post(
        f"/api/conversations/{conversation['id']}/messages",
        headers={"X-Test-User": "user-a"},
        json={"content": "Try another user's file", "document_ids": [other_users_document_id]},
    )
    assert cross_user_message.status_code == 404

    denied_delete = client.delete(
        f"/api/documents/{uploaded_document['id']}",
        headers={"X-Test-User": "user-b"},
    )
    assert denied_delete.status_code == 404
    assert client.delete(
        f"/api/documents/{uploaded_document['id']}",
        headers={"X-Test-User": "user-a"},
    ).status_code == 200
    assert not (tmp_path / f"{uploaded_document['id']}.docx").exists()
    assert client.delete(
        f"/api/conversations/{conversation['id']}",
        headers={"X-Test-User": "user-a"},
    ).status_code == 200
    with test_engine.connect() as connection:
        assert connection.exec_driver_sql("SELECT count(*) FROM messages").scalar_one() == 0
        assert connection.exec_driver_sql("SELECT count(*) FROM message_documents").scalar_one() == 0
    test_engine.dispose()
