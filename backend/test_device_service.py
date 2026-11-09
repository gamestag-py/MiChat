
import asyncio

from app.db import db
from app.schemas.device import DeviceRegisterRequest
from app.services.device_service import register_device


async def run_test():
    await db.init_pool()

    try:
        payload = DeviceRegisterRequest(
            device_name="MiChat Test Browser",
            platform="web",
            app_version="1.0.0",
            registration_id=12345,
            identity_public_key="11" * 32,
        )

        result = await register_device(
            user_id=1,
            payload=payload,
        )

        assert result["device_name"] == "MiChat Test Browser"
        assert result["platform"] == "web"
        assert len(result["id"]) == 36
        assert len(result["identity_key_fingerprint"]) == 64

        print("Device registration: PASSED")
        print(result)

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(run_test())
