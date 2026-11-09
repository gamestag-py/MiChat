
import asyncio

from app.db import db
from app.schemas.one_time_prekey import OneTimePrekeyBatchRequest
from app.services.one_time_prekey_service import register_one_time_prekeys


async def run_test():
    await db.init_pool()

    try:
        device_id = "233e17c1-1636-447f-b806-663d93eb685a"

        payload = OneTimePrekeyBatchRequest(
            prekeys=[
                {
                    "key_id": 2001,
                    "public_key": "11" * 32,
                },
                {
                    "key_id": 2002,
                    "public_key": "22" * 32,
                },
                {
                    "key_id": 2003,
                    "public_key": "33" * 32,
                },
            ]
        )

        result = await register_one_time_prekeys(
            user_id=1,
            device_id=device_id,
            payload=payload,
        )

        assert result["uploaded"] == 3
        assert result["key_ids"] == [2001, 2002, 2003]

        print("One-time prekey batch registration: PASSED")
        print(result)

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(run_test())
