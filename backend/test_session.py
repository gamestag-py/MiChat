
import asyncio

from app.db import db
from app.services.auth_service import (
    authenticate_user,
    InvalidCredentialsError,
)
from app.services.session_service import create_session


async def main():
    try:
        user = await authenticate_user(
            email="test@example.com",
            phone_number=None,
            password="TestPassword123!",
        )

        session = await create_session(user["user_id"])

        print("Session created:", session["session_id"])
        print("Access token generated:", bool(session["access_token"]))
        print("Refresh token generated:", bool(session["refresh_token"]))
        print("Access token lifetime:", session["expires_in"], "seconds")

        # Never print the actual tokens.

    except InvalidCredentialsError:
        print("Login credentials are incorrect.")

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())
