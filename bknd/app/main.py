from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.legal import router as legal_router
from app.api.documents import router as documents_router
from app.database.connection import engine
from app.core.config import settings

app = FastAPI(
    title="Apna Wakeel API",
    description="AI-powered legal information and navigation backend for Pakistan",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(legal_router)
app.include_router(documents_router)


@app.get("/")
async def root():
    return {
        "message": "Apna Wakeel API is running successfully!",
        "version": "0.1.0",
        "documentation": "/docs",
        "health_check": "/api/health",
        "frontend_url": "http://127.0.0.1:5173",
    }


@app.get("/api/health")
async def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "service": "apna-wakeel-backend",
            "database": "connected",
        }

    except Exception as e:
        return {
            "status": "ok",
            "service": "apna-wakeel-backend",
            "database": "disconnected",
            "error": str(e),
        }