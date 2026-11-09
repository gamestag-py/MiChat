
import asyncio

from app.db import db
from app.schemas.signed_prekey import SignedPrekeyRegisterRequest
from app.services.signed_prekey_service import register_signed_prekey


async def run_test():
    await db.init_pool()

    try:
        # Use the device UUID created by your earlier registration test.
        device_id = "233e17c1-1636-447f-b806-663d93eb685a"

        payload = SignedPrekeyRegisterRequest(
            key_id=1001,
            public_key="33" * 32,
            signature="44" * 64,
        )

        result = await register_signed_prekey(
            user_id=1,
            device_id=device_id,
            payload=payload,
        )

        assert result["key_id"] == 1001
        assert len(result["public_key"]) == 64
        assert len(result["signature"]) == 128

        print("Signed prekey registration: PASSED")
        print(result)

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(run_test())
