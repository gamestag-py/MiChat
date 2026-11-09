
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from app.db import db
from app.core.config import settings


def hash_destination(destination: str) -> bytes:
    return hashlib.sha256(
        destination.strip().lower().encode("utf-8")
    ).digest()


def hash_otp(user_id: int, otp: str) -> bytes:
    message = f"{user_id}:{otp}".encode("utf-8")

    return hmac.new(
        settings.OTP_HMAC_SECRET.encode("utf-8"),
        message,
        hashlib.sha256,
    ).digest()


async def create_verification(
    user_id: int,
    verification_type: str,
    destination: str,
) -> str:

    if not settings.OTP_HMAC_SECRET:
        raise RuntimeError("OTP_HMAC_SECRET is not configured")

    if verification_type not in ("email", "phone", "password_reset"):
        raise ValueError("Invalid verification type")

    otp = f"{secrets.randbelow(1_000_000):06d}"

    destination_hash = hash_destination(destination)
    code_hash = hash_otp(user_id, otp)

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    expires_at = now + timedelta(
        minutes=settings.OTP_EXPIRE_MINUTES
    )

    async with db.transaction() as conn:
        async with conn.cursor() as cursor:

            # Invalidate previous unused challenges of this type.
            await cursor.execute(
                """
                UPDATE account_verifications
                SET consumed_at = UTC_TIMESTAMP()
                WHERE user_id = %s
                  AND verification_type = %s
                  AND consumed_at IS NULL
                """,
                (user_id, verification_type),
            )

            await cursor.execute(
                """
                INSERT INTO account_verifications (
                    user_id,
                    verification_type,
                    destination_hash,
                    code_hash,
                    attempts,
                    expires_at
                )
                VALUES (
                    %s, %s, UNHEX(%s), UNHEX(%s), 0, %s
                )
                """,
                (
                    user_id,
                    verification_type,
                    destination_hash.hex(),
                    code_hash.hex(),
                    expires_at,
                ),
            )

    # Temporary return for internal testing only.
    # Never return OTPs through public API responses.
    return otp


import hmac
from datetime import datetime, timezone
import logging
logger = logging.getLogger("michat.password_reset")

async def verify_otp(
    user_id: int,
    verification_type: str,
    destination: str,
    otp: str,
) -> bool:
    logger.info("OTP verification started: user_id=%s type=%s", user_id, verification_type)
    if verification_type not in ("email", "phone", "password_reset"):
        return False

    if not otp.isdigit() or len(otp) != 6:
        return False

    destination_hash = hash_destination(destination)
    submitted_hash = hash_otp(user_id, otp)

    async with db.transaction() as conn:
        async with conn.cursor() as cursor:

            await cursor.execute(
                """
                SELECT
                    id,
                    destination_hash,
                    code_hash,
                    attempts,
                    expires_at,
                    consumed_at
                FROM account_verifications
                WHERE user_id = %s
                  AND verification_type = %s
                ORDER BY id DESC
                LIMIT 1
                FOR UPDATE
                """,
                (user_id, verification_type),
            )

            record = await cursor.fetchone()
            logger.info("OTP record found: %s", bool(record))
            if not record:
                return False

            (
                verification_id,
                stored_destination_hash,
                stored_code_hash,
                attempts,
                expires_at,
                consumed_at,
            ) = record

            # Reject already consumed OTPs.
            if consumed_at is not None:
                return False

            now = datetime.now(timezone.utc).replace(tzinfo=None)

            # Reject expired OTPs and consume them.
            if expires_at <= now:
                await cursor.execute(
                    """
                    UPDATE account_verifications
                    SET consumed_at = UTC_TIMESTAMP()
                    WHERE id = %s
                    """,
                    (verification_id,),
                )
                return False

            # Reject OTPs that exceeded the attempt limit.
            if attempts >= settings.OTP_MAX_ATTEMPTS:
                return False

            # Validate destination.
            if not hmac.compare_digest(
                stored_destination_hash,
                destination_hash,
            ):
                return False

            # Validate OTP hash.
            if not hmac.compare_digest(
                stored_code_hash,
                submitted_hash,
            ):
                new_attempts = attempts + 1

                await cursor.execute(
                    """
                    UPDATE account_verifications
                    SET
                        attempts = %s,
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
                        verification_id,
                    ),
                )

                return False

            # Consume successfully verified OTP.
            await cursor.execute(
                """
                UPDATE account_verifications
                SET consumed_at = UTC_TIMESTAMP()
                WHERE id = %s
                """,
                (verification_id,),
            )

            # Update account verification status only for
            # email or phone verification.
            if verification_type == "email":
                await cursor.execute(
                    """
                    UPDATE users
                    SET email_verified_at = UTC_TIMESTAMP()
                    WHERE id = %s
                    """,
                    (user_id,),
                )

            elif verification_type == "phone":
                await cursor.execute(
                    """
                    UPDATE users
                    SET phone_verified_at = UTC_TIMESTAMP()
                    WHERE id = %s
                    """,
                    (user_id,),
                )

            # password_reset only consumes the OTP.
            return True
