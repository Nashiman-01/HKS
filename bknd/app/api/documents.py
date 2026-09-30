import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Request
from sqlalchemy import text

from app.database.connection import engine
from app.services.auth_service import get_current_user

router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_user_from_request(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        return get_current_user(token)
    except Exception:
        return None


@router.post("")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form("en"),
):
    """
    Upload and save a legal document (PDF, DOCX, etc.).
    """
    user = get_user_from_request(request)
    user_id = str(user.id) if user and hasattr(user, "id") else None

    # Read content to get actual size
    content = await file.read()
    file_size = len(content)

    doc_id = uuid.uuid4()
    extension = Path(file.filename or "").suffix
    safe_filename = f"{doc_id}{extension}"
    target_path = UPLOAD_DIR / safe_filename

    # Save to disk
    with open(target_path, "wb") as f:
        f.write(content)

    content_type = file.content_type or "application/octet-stream"

    # Persist in DB
    query = text("""
        INSERT INTO public.documents (
            id,
            user_id,
            name,
            type,
            size,
            file_path,
            status
        )
        VALUES (
            :id,
            :user_id,
            :name,
            :type,
            :size,
            :file_path,
            'ready'
        )
        RETURNING
            id,
            name,
            type,
            size,
            status,
            created_at
    """)

    with engine.begin() as conn:
        result = conn.execute(
            query,
            {
                "id": str(doc_id),
                "user_id": user_id,
                "name": file.filename or "Unnamed Document",
                "type": content_type,
                "size": file_size,
                "file_path": str(target_path),
            },
        )
        row = result.mappings().first()

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
async def list_documents(request: Request):
    """
    List uploaded documents for the authenticated user or session.
    """
    user = get_user_from_request(request)
    user_id = str(user.id) if user and hasattr(user, "id") else None

    if user_id:
        query = text("""
            SELECT id, name, type, size, status, created_at
            FROM public.documents
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """)
        params = {"user_id": user_id}
    else:
        query = text("""
            SELECT id, name, type, size, status, created_at
            FROM public.documents
            ORDER BY created_at DESC
            LIMIT 50
        """)
        params = {}

    with engine.connect() as conn:
        rows = conn.execute(query, params).mappings().all()

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
async def delete_document(document_id: str, request: Request):
    """
    Delete a document by ID.
    """
    user = get_user_from_request(request)
    user_id = str(user.id) if user and hasattr(user, "id") else None

    if user_id:
        query = text("""
            DELETE FROM public.documents
            WHERE id = :document_id AND (user_id = :user_id OR user_id IS NULL)
            RETURNING id, file_path
        """)
        params = {"document_id": document_id, "user_id": user_id}
    else:
        query = text("""
            DELETE FROM public.documents
            WHERE id = :document_id
            RETURNING id, file_path
        """)
        params = {"document_id": document_id}

    with engine.begin() as conn:
        result = conn.execute(query, params)
        deleted = result.mappings().first()

    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = deleted.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    return {
        "message": "Document deleted successfully",
        "document_id": str(deleted["id"]),
    }
