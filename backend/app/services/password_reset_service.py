
import logging

from app.db import db
from app.services.verification_service import create_verification
from app.core.security import hash_password
logger = logging.getLogger("michat.password_reset")
import logging

from app.db import db
from app.core.security import hash_password
from app.services.verification_service import (
    create_verification,
    verify_otp,
)

import aiomysql

async def request_password_reset(
    email: str | None = None,
    phone_number: str | None = None,
) -> None:

    if email:
        email = email.strip().lower()

        user = await db.fetch_one(
            """
            SELECT id, email_verified_at
            FROM users
            WHERE email = %s
              AND account_status = 'active'
            LIMIT 1
            """,
            (email,),
        )

        destination = email

        if not user or not user["email_verified_at"]:
            return

    elif phone_number:
        phone_number = phone_number.strip()

        user = await db.fetch_one(
            """
            SELECT id, phone_verified_at
            FROM users
            WHERE phone_number = %s
              AND account_status = 'active'
            LIMIT 1
            """,
            (phone_number,),
        )

        destination = phone_number

        if not user or not user["phone_verified_at"]:
            return

    else:
        return

    otp = await create_verification(
        user_id=user["id"],
        verification_type="password_reset",
        destination=destination,
    )

    logger.info(
        "Development password reset OTP for user_id=%s: %s",
        user["id"],
        otp,
    )


import hmac
from datetime import datetime, timezone

from app.core.security import hash_password
from app.core.config import settings
from app.services.verification_service import hash_destination, hash_otp


async def reset_password(
    email: str | None = None,
    phone_number: str | None = None,
    otp: str = "",
    new_password: str = "",
) -> bool:

    if email:
        destination = email.strip().lower()

        user = await db.fetch_one(
            """
            SELECT id
            FROM users
            WHERE email = %s
              AND email_verified_at IS NOT NULL
              AND account_status = 'active'
            LIMIT 1
            """,
            (destination,),
        )

    elif phone_number:
        destination = phone_number.strip()

        user = await db.fetch_one(
            """
            SELECT id
            FROM users
            WHERE phone_number = %s
              AND phone_verified_at IS NOT NULL
              AND account_status = 'active'
            LIMIT 1
            """,
            (destination,),
        )

    else:
        return False

    if not user or len(otp) != 6 or not otp.isdigit():
        return False

    user_id = user["id"]

    destination_hash = hash_destination(destination)
    code_hash = hash_otp(user_id, otp)
    password_hash = hash_password(new_password)

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    async with db.transaction() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:

            # Lock the latest password-reset OTP.
            await cursor.execute(
                """
                SELECT id, destination_hash, code_hash,
                       attempts, expires_at, consumed_at
                FROM account_verifications
                WHERE user_id = %s
                  AND verification_type = 'password_reset'
                ORDER BY id DESC
                LIMIT 1
                FOR UPDATE
                """,
                (user_id,),
            )

            record = await cursor.fetchone()

            if not record:
                return False

            if record["consumed_at"] is not None:
                return False

            if record["expires_at"] <= now:
                return False

            if record["attempts"] >= settings.OTP_MAX_ATTEMPTS:
                return False

            destination_valid = hmac.compare_digest(
                bytes(record["destination_hash"]),
                destination_hash,
            )

            otp_valid = hmac.compare_digest(
                bytes(record["code_hash"]),
                code_hash,
            )

            if not destination_valid or not otp_valid:
                new_attempts = record["attempts"] + 1

                await cursor.execute(
                    """
                    UPDATE account_verifications
                    SET attempts = %s,
                        consumed_at = CASE
                            WHEN %s >= %s THEN UTC_TIMESTAMP()
                            ELSE consumed_at
                        END
                    WHERE id = %s
                    """,
                    (
                        new_attempts,
                        new_attempts,
                        settings.OTP_MAX_ATTEMPTS,
                        record["id"],
                    ),
                )

                return False

            # Consume OTP.
            await cursor.execute(
                """
                UPDATE account_verifications
                SET consumed_at = UTC_TIMESTAMP()
                WHERE id = %s
                """,
                (record["id"],),
            )

            # Update password.
            await cursor.execute(
                """
                UPDATE users
                SET password_hash = %s,
                    updated_at = UTC_TIMESTAMP(3)
                WHERE id = %s
                  AND account_status = 'active'
                """,
                (password_hash, user_id),
            )

            if cursor.rowcount != 1:
                raise RuntimeError("Password update failed")

            # Revoke all active sessions.
            await cursor.execute(
                """
                UPDATE user_sessions
                SET revoked_at = UTC_TIMESTAMP(3)
                WHERE user_id = %s
                  AND revoked_at IS NULL
                """,
                (user_id,),
            )

    return True
