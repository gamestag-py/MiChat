
import asyncio

from app.db import db
from app.services.verification_service import create_verification


async def main():
    try:
        # Replace with an existing user's ID and registered email.
        otp = await create_verification(
            user_id=12,
            verification_type="email",
            destination="test@example.com",
        )

        print("Development OTP:", otp)

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())
