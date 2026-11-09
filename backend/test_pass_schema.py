
import asyncio
import logging

from app.db import db
from app.services.password_reset_service import reset_password

logging.basicConfig(level=logging.INFO)


async def main():
    try:
        result = await reset_password(
            email="test@example.com",
            otp="471008",  # Replace with your actual OTP
            new_password="111111",
        )

        print("Password reset:", result)

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())
