import asyncio

from app.services.auth_service import register_user
from app.db import db
from app.services.auth_service import AccountAlreadyExistsError

async def main():
    try:
        user_id = await register_user(
            email="t1est2@example.com",
            phone_number=None,
            username="testuser12341",
            display_name="Test User",
            password="StrongPassword123!",
        )

        print("Registered user ID:", user_id)
    except AccountAlreadyExistsError as ue:
        print(ue)
    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())