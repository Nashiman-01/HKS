import logging
import uuid
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pypdf import PdfReader
from sqlalchemy import text

from app.database.connection import engine
from app.api.dependencies import get_authenticated_user

router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_DOCUMENT_SIZE = 20 * 1024 * 1024
MAX_EXTRACTED_TEXT = 150_000
logger = logging.getLogger(__name__)


def extract_document_text(filename: str, content: bytes) -> str:
    extension = Path(filename).suffix.lower()
    try:
        if extension == ".pdf":
            reader = PdfReader(BytesIO(content), strict=False)
            if reader.is_encrypted:
                raise HTTPException(status_code=422, detail="documents.encrypted")
            extracted = "\n".join(page.extract_text() or "" for page in reader.pages[:100])
        elif extension == ".docx":
            with ZipFile(BytesIO(content)) as archive:
                document = archive.getinfo("word/document.xml")
                if document.file_size > MAX_DOCUMENT_SIZE * 4:
                    raise ValueError("document XML is too large")
                root = ElementTree.fromstring(archive.read(document))
            extracted = " ".join(node.text or "" for node in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"))
        else:
            raise HTTPException(status_code=415, detail="documents.invalidType")
    except HTTPException:
        raise
    except Exception as error:
        logger.warning("Document text extraction failed: type=%s", type(error).__name__)
        raise HTTPException(status_code=422, detail="documents.unreadable") from None

    extracted = extracted.strip()
    if not extracted:
        raise HTTPException(status_code=422, detail="documents.noText")
    return extracted[:MAX_EXTRACTED_TEXT]


@router.post("")
async def upload_document(
    user=Depends(get_authenticated_user),
    file: UploadFile = File(...),
    language: str = Form("en"),
):
    filename = Path(file.filename or "document").name
    extension = Path(filename).suffix.lower()
    if extension not in {".pdf", ".docx"}:
        raise HTTPException(status_code=415, detail="documents.invalidType")

    content = await file.read(MAX_DOCUMENT_SIZE + 1)
    if len(content) > MAX_DOCUMENT_SIZE:
        raise HTTPException(status_code=413, detail="documents.tooLarge")
    extracted_text = extract_document_text(filename, content)
    document_id = str(uuid.uuid4())
    target_path = UPLOAD_DIR / f"{document_id}{extension}"

    try:
        target_path.write_bytes(content)
        with engine.begin() as connection:
            result = connection.execute(text("""
                INSERT INTO documents (
                    id, user_id, name, type, size, file_path, extracted_text, status
                ) VALUES (
                    :id, :user_id, :name, :type, :size, :file_path, :extracted_text, 'ready'
                )
                RETURNING id, name, type, size, status, created_at
            """), {
                "id": document_id,
                "user_id": str(user.id),
                "name": filename,
                "type": file.content_type or "application/octet-stream",
                "size": len(content),
                "file_path": str(target_path),
                "extracted_text": extracted_text,
            })
            row = result.mappings().first()
    except Exception as error:
        target_path.unlink(missing_ok=True)
        logger.error("Document persistence failed: type=%s", type(error).__name__)
        raise HTTPException(status_code=503, detail="documents.storageUnavailable") from None

    return {
        "message": "Document uploaded successfully",
        "document": {
            "id": str(row["id"]),
            "name": row["name"],
            "type": row["type"],
            "size": row["size"],
            "status": row["status"],
            "created_at": str(row["created_at"]),
        },
    }


@router.get("")
async def list_documents(user=Depends(get_authenticated_user)):
    with engine.connect() as connection:
        rows = connection.execute(text("""
            SELECT id, name, type, size, status, created_at
            FROM documents
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """), {"user_id": str(user.id)}).mappings().all()

    documents = [
        {
            "id": str(row["id"]),
            "name": row["name"],
            "type": row["type"],
            "size": row["size"],
            "status": row["status"],
            "created_at": str(row["created_at"]),
        }
        for row in rows
    ]

    return {"documents": documents}


@router.delete("/{document_id}")
async def delete_document(document_id: str, user=Depends(get_authenticated_user)):
    with engine.begin() as connection:
        connection.execute(text("""
            DELETE FROM message_documents
            WHERE document_id = :document_id AND user_id = :user_id
        """), {"document_id": document_id, "user_id": str(user.id)})
        result = connection.execute(text("""
            DELETE FROM documents
            WHERE id = :document_id AND user_id = :user_id
            RETURNING id, file_path
        """), {"document_id": document_id, "user_id": str(user.id)})
        deleted = result.mappings().first()

    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(deleted["file_path"])
    try:
        file_path.unlink(missing_ok=True)
    except OSError as error:
        logger.warning("Document file cleanup failed: type=%s", type(error).__name__)

    return {
        "message": "Document deleted successfully",
        "document_id": str(deleted["id"]),
    }
