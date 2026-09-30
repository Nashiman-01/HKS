from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.auth_service import signup_user, login_user


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


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
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


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
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )