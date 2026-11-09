
from app.db import db
from app.core.tokens import hash_refresh_token


async def revoke_session(refresh_token: str) -> bool:
    token_hash = hash_refresh_token(refresh_token)

    async with db.transaction() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(
                """
                UPDATE user_sessions
                SET revoked_at = UTC_TIMESTAMP()
                WHERE refresh_token_hash = UNHEX(%s)
                  AND revoked_at IS NULL
                """,
                (token_hash.hex(),),
            )

            return cursor.rowcount == 1



async def revoke_all_sessions(user_id: int) -> int:
    async with db.transaction() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(
                """
                UPDATE user_sessions
                SET revoked_at = UTC_TIMESTAMP()
                WHERE user_id = %s
                  AND revoked_at IS NULL
                """,
                (user_id,),
            )

            return cursor.rowcount
