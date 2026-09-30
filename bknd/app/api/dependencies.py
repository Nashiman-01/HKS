from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth_service import get_current_user


security = HTTPBearer()


def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    access_token = credentials.credentials

    try:
        user = get_current_user(access_token)

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token",
            )

        return user

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
        )