
from pymysql.err import IntegrityError

from app.db import db
from app.core.security import hash_password , verify_password

from app.services.verification_service import create_verification
import logging

logger = logging.getLogger("michat.auth")


from pymysql.err import IntegrityError

from app.db import db
from app.core.security import hash_password


class AccountAlreadyExistsError(Exception):
    pass

class EmailNotVerifiedError(Exception):
    pass


class PhoneNotVerifiedError(Exception):
    pass

async def register_user(
    email: str | None,
    phone_number: str | None,
    username: str,
    display_name: str,
    password: str,
) -> int:

    password_hash = hash_password(password)

    try:
        # Create account and related records
        async with db.transaction() as conn:
            async with conn.cursor() as cursor:

                await cursor.execute(
                    """
                    INSERT INTO users (
                        email,
                        phone_number,
                        password_hash,
                        account_status
                    )
                    VALUES (%s, %s, %s, 'active')
                    """,
                    (email, phone_number, password_hash),
                )

                user_id = cursor.lastrowid

                await cursor.execute(
                    """
                    INSERT INTO user_profiles (
                        user_id,
                        username,
                        display_name
                    )
                    VALUES (%s, %s, %s)
                    """,
                    (user_id, username, display_name),
                )

                await cursor.execute(
                    """
                    INSERT INTO user_privacy_settings (user_id)
                    VALUES (%s)
                    """,
                    (user_id,),
                )

        # Generate OTP after account transaction commits
        if email:
            otp = await create_verification(
                user_id=user_id,
                verification_type="email",
                destination=email
            )

            logger.info(
                "Development OTP for %s: %s",
                email,
                otp
            )

        elif phone_number:
            otp = await create_verification(
                user_id=user_id,
                verification_type="phone",
                destination=phone_number
            )

            logger.info(
                "Development OTP for %s: %s",
                phone_number,
                otp
            )

        return user_id

    except IntegrityError as exc:
        if exc.args and exc.args[0] == 1062:
            raise AccountAlreadyExistsError(
                "Email, phone number, or username is already registered."
            ) from exc
        raise



class InvalidCredentialsError(Exception):
    pass



async def authenticate_user(
    email: str | None,
    phone_number: str | None,
    password: str,
) -> dict:

    if email:
        query = """
            SELECT
                u.id,
                u.password_hash,
                u.account_status,
                u.email_verified_at,
                u.phone_verified_at,
                p.username,
                p.display_name
            FROM users u
            INNER JOIN user_profiles p ON p.user_id = u.id
            WHERE u.email = %s
            LIMIT 1
        """
        params = (email.lower(),)

    elif phone_number:
        query = """
            SELECT
                u.id,
                u.password_hash,
                u.account_status,
                u.email_verified_at,
                u.phone_verified_at,
                p.username,
                p.display_name
            FROM users u
            INNER JOIN user_profiles p ON p.user_id = u.id
            WHERE u.phone_number = %s
            LIMIT 1
        """
        params = (phone_number,)

    else:
        raise InvalidCredentialsError()

    user = await db.fetch_one(query, params)

    if not user:
        raise InvalidCredentialsError()

    if user["account_status"] != "active":
        raise InvalidCredentialsError()

    if not verify_password(password, user["password_hash"]):
        raise InvalidCredentialsError()

    # Require verification of the identifier used for login.
    if email and user["email_verified_at"] is None:
        raise EmailNotVerifiedError()

    if phone_number and user["phone_verified_at"] is None:
        raise PhoneNotVerifiedError()

    return {
        "user_id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
    }
