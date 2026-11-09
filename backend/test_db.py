
import asyncio
from app.db import db


async def main():
    try:
        await db.init_pool()

        result = await db.fetch_one(
            "SELECT COUNT(*) AS total FROM users"
        )

        print("Database connected successfully!")
        print("Total users:", result["total"])

    except Exception as e:
        print("Database test failed:", e)

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(main())
