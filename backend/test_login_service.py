import asyncio

from app.db import db
from app.services.auth_service import (
    authenticate_user,
    InvalidCredentialsError,
)


async def main():
    try:
        # Test correct credentials
        try:
            user = await authenticate_user(
                email="test@example.com",
                phone_number=None,
                password="TestPassword123!",
            )
            print("Login successful:", user)

        except InvalidCredentialsError:
            print("Correct login rejected.")

        # Test incorrect password
        try:
            await authenticate_user(
                email="test@example.com",
                phone_number=None,
                password="WrongPassword123!",
            )
            print("Incorrect password accepted.")

        except InvalidCredentialsError:
            print("Incorrect password rejected.")

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())