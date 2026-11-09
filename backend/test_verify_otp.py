
import asyncio

from app.db import db
from app.services.verification_service import (
    create_verification,
    verify_otp,
)


async def main():
    user_id = 12
    email = "test@example.com"

    try:
        otp = await create_verification(
            user_id=user_id,
            verification_type="email",
            destination=email,
        )

        print("Generated OTP:", otp)

        result = await verify_otp(
            user_id=user_id,
            verification_type="email",
            destination=email,
            otp=otp,
        )

        print("Verification successful:", result)

        # Reusing the same OTP must fail.
        second_result = await verify_otp(
            user_id=user_id,
            verification_type="email",
            destination=email,
            otp=otp,
        )

        print("OTP reuse rejected:", not second_result)

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())
