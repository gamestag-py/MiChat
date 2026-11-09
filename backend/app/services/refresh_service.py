
from datetime import datetime, timedelta, timezone

from app.db import db
from app.core.config import settings
from app.core.tokens import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
)
import uuid

class InvalidRefreshTokenError(Exception):
    pass


async def rotate_refresh_token(refresh_token: str) -> dict:
    old_hash = hash_refresh_token(refresh_token)

    new_refresh_token = create_refresh_token()
    new_hash = hash_refresh_token(new_refresh_token)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    user_id = None

    async with db.transaction() as conn:
        async with conn.cursor() as cursor:

            # Lock the matching session until this transaction finishes.
            await cursor.execute(
                """
                SELECT id, user_id
                FROM user_sessions
                WHERE refresh_token_hash = UNHEX(%s)
                  AND expires_at > UTC_TIMESTAMP()
                  AND revoked_at IS NULL
                FOR UPDATE
                """,
                (old_hash.hex(),),
            )

            session = await cursor.fetchone()

            if not session:
                raise InvalidRefreshTokenError(
                    "Invalid or expired refresh token."
                )

            session_id, user_id = session

            # Replace the old refresh-token hash.
            await cursor.execute(
                """
                UPDATE user_sessions
                SET refresh_token_hash = UNHEX(%s),
                    last_used_at = %s,
                    expires_at = %s
                WHERE id = UNHEX(%s)
                AND refresh_token_hash = UNHEX(%s)
                AND revoked_at IS NULL
                AND expires_at > UTC_TIMESTAMP()
                """,
                (
                    new_hash.hex(),
                    now,
                    expires_at,
                    session_id.hex(),  # Convert BINARY(16) to hexadecimal
                    old_hash.hex(),
                ),
            )

            if cursor.rowcount != 1:
                raise InvalidRefreshTokenError(
                    "Invalid or expired refresh token."
                )

    # Generate the access token only after the rotation commits.
    if isinstance(session_id, (bytes, bytearray)):
        session_id = uuid.UUID(bytes=bytes(session_id))
    else:
        session_id = uuid.UUID(str(session_id))

    access_token = create_access_token(user_id, str(session_id))

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_at": expires_at.isoformat(),
    }
