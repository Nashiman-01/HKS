import logging
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.services.auth_service import (
    login_user,
    refresh_user_session,
    sign_out_user,
    signup_user,
    get_current_user,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)
logger = logging.getLogger(__name__)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name cannot be empty")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    access_token: str
    refresh_token: str


class SessionRequest(BaseModel):
    access_token: str = Field(min_length=1)


def raise_auth_error(error: Exception, default_status: int):
    detail = str(error).lower()
    if detail == "supabase_not_configured":
        raise HTTPException(status_code=503, detail=detail)

    if re.search(r"connection|connecterror|timed out|timeout|network|dns|name or service not known", detail):
        logger.warning("Supabase auth provider unavailable: type=%s", type(error).__name__)
        raise HTTPException(status_code=503, detail="auth.networkError") from None

    status_code = getattr(error, "status", None) or getattr(error, "status_code", None) or default_status
    if status_code not in {400, 401, 403, 409, 429, 500, 502, 503}:
        status_code = default_status

    if re.search(r"already registered|already exists|user_already_exists", detail):
        status_code, public_detail = 409, "account_exists"
    elif re.search(r"email not confirmed|email_not_confirmed", detail):
        status_code, public_detail = 403, "email_not_confirmed"
    elif re.search(r"weak password|password.*(weak|short|characters)", detail):
        status_code, public_detail = 400, "weak_password"
    elif re.search(r"invalid email|email_address_invalid", detail):
        status_code, public_detail = 400, "invalid_email"
    elif re.search(r"invalid login credentials|invalid credentials|invalid email or password", detail):
        status_code, public_detail = 401, "invalid_credentials"
    elif re.search(r"rate.?limit|too many requests", detail):
        status_code, public_detail = 429, "rate_limited"
    elif status_code in {401, 403}:
        public_detail = "invalid_credentials"
    elif status_code == 429:
        public_detail = "rate_limited"
    elif status_code == 400:
        public_detail = "invalid_request"
    else:
        status_code, public_detail = (status_code if status_code >= 500 else 503), "auth.providerError"

    logger.warning("Supabase auth request failed: type=%s status=%s", type(error).__name__, status_code)
    raise HTTPException(status_code=status_code, detail=public_detail)


@router.post("/signup")
async def signup(data: SignupRequest):
    try:
        response = signup_user(
            email=data.email,
            password=data.password,
            full_name=data.full_name,
        )

        if response.user is None:
            raise HTTPException(
                status_code=400,
                detail="Signup failed",
            )

        return {
            "message": "User created successfully",
            "user_id": response.user.id,
            "email": response.user.email,
            "already_registered": not response.user.identities if response.user.identities is not None else False,
            "full_name": (response.user.user_metadata or {}).get("full_name", data.full_name),
            "access_token": response.session.access_token if response.session else None,
            "refresh_token": response.session.refresh_token if response.session else None,
            "expires_at": response.session.expires_at if response.session else None,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise_auth_error(e, 400)


@router.post("/login")
async def login(data: LoginRequest):
    try:
        response = login_user(
            email=data.email,
            password=data.password,
        )

        if response.user is None or response.session is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            )

        return {
            "message": "Login successful",
            "user_id": response.user.id,
            "email": response.user.email,
            "full_name": (response.user.user_metadata or {}).get("full_name", ""),
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise_auth_error(e, 401)

@router.post("/refresh")
async def refresh(data: RefreshRequest):
    try:
        response = refresh_user_session(data.refresh_token)
        if response.user is None or response.session is None:
            raise HTTPException(status_code=401, detail="auth.session_restore_failed")

        return {
            "user_id": response.user.id,
            "email": response.user.email,
            "full_name": (response.user.user_metadata or {}).get("full_name", ""),
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_auth_error(e, 401)
@router.post("/session")
async def validate_session(data: SessionRequest):
    try:
        user = get_current_user(data.access_token)
        if user is None:
            raise HTTPException(status_code=401, detail="invalid_session")
        metadata = getattr(user, "user_metadata", None) or {}
        return {
            "user_id": user.id,
            "email": user.email or "",
            "full_name": metadata.get("full_name", ""),
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="invalid_session") from None


@router.post("/logout")
async def logout(data: LogoutRequest):
    try:
        sign_out_user(data.access_token, data.refresh_token)
        return {"message": "Logout successful"}
    except Exception as e:
        raise_auth_error(e, 401)
