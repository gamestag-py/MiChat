
import uuid
import jwt

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt.exceptions import InvalidTokenError

from app.core.config import settings
from app.db import db


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    unauthorized = HTTPException(
        status_code=401,
        detail="Invalid or expired access token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )

        if payload.get("type") != "access":
            raise unauthorized

        user_id = int(payload["sub"])
        session_id = str(uuid.UUID(payload["sid"]))

    except (InvalidTokenError, ValueError, KeyError, TypeError, AttributeError):
        raise unauthorized

    # Check whether this specific session is still active.
    session = await db.fetch_one(
        """
        SELECT id
        FROM user_sessions
        WHERE id = UNHEX(REPLACE(%s, '-', ''))
          AND user_id = %s
          AND revoked_at IS NULL
          AND expires_at > UTC_TIMESTAMP(3)
        LIMIT 1
        """,
        (session_id, user_id),
    )

    if not session:
        raise unauthorized

    user = await db.fetch_one(
        """
        SELECT
            u.id,
            u.email,
            u.phone_number,
            u.account_status,
            p.username,
            p.display_name
        FROM users u
        INNER JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id = %s
        LIMIT 1
        """,
        (user_id,),
    )

    if not user or user["account_status"] != "active":
        raise unauthorized

    return user


