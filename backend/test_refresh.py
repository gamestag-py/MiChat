
import asyncio

from app.db import db
from app.services.auth_service import authenticate_user
from app.services.session_service import create_session
from app.services.refresh_service import (
    rotate_refresh_token,
    InvalidRefreshTokenError,
)


async def main():
    try:
        user = await authenticate_user(
            email="test@example.com",
            phone_number=None,
            password="TestPassword123!",
        )

        # Create an initial session.
        session = await create_session(user["user_id"])
        old_refresh_token = session["refresh_token"]

        # Rotate the refresh token.
        new_tokens = await rotate_refresh_token(old_refresh_token)

        print("Refresh successful:", bool(new_tokens["refresh_token"]))
        print("New access token generated:", bool(new_tokens["access_token"]))

        # The old refresh token must now be rejected.
        try:
            await rotate_refresh_token(old_refresh_token)
            print("ERROR: Old refresh token was accepted.")

        except InvalidRefreshTokenError:
            print("Old refresh token rejected: True")

        # The new refresh token should work.
        second_rotation = await rotate_refresh_token(
            new_tokens["refresh_token"]
        )

        print(
            "New refresh token accepted:",
            bool(second_rotation["refresh_token"]),
        )

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())
