
import uuid
from datetime import datetime, timedelta, timezone

from app.db import db
from app.core.config import settings
from app.core.tokens import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
)


async def create_session(
    user_id: int,
    device_id: bytes | None = None,
) -> dict:
    session_id = uuid.uuid4()
    refresh_token = create_refresh_token()
    refresh_token_hash = hash_refresh_token(refresh_token)

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    expires_at = now + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    device_id_hex = device_id.hex() if device_id else None

    async with db.transaction() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(
                """
                INSERT INTO user_sessions (
                    id,
                    user_id,
                    device_id,
                    refresh_token_hash,
                    created_at,
                    last_used_at,
                    expires_at
                )
                VALUES (
                    UNHEX(%s),
                    %s,
                    UNHEX(%s),
                    UNHEX(%s),
                    %s,
                    %s,
                    %s
                )
                """,
                (
                    session_id.hex,
                    user_id,
                    device_id_hex,
                    refresh_token_hash.hex(),
                    now,
                    now,
                    expires_at,
                ),
            )

    access_token = create_access_token(user_id)

    return {
        "session_id": str(session_id),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_at": expires_at.isoformat(),
    }
