
import asyncio
import secrets

from app.db import db
from app.schemas.device import DeviceRegisterRequest
from app.schemas.one_time_prekey import OneTimePrekeyBatchRequest
from app.services.device_service import register_device
from app.services.one_time_prekey_service import (
    register_one_time_prekeys,
    claim_one_time_prekey,
)

USER_ID = 1

# Existing active device belonging to user 1
REQUESTER_DEVICE_ID = "8693fd83-6874-4ae0-921d-19c9b9e628f2"


async def run_tests():
    await db.init_pool()

    try:
        # 1. Create a fresh recipient device
        device_payload = DeviceRegisterRequest(
            device_name="Prekey Claim Test Device",
            platform="web",
            app_version="1.0.0",
            identity_public_key=secrets.token_hex(32),
        )

        device = await register_device(USER_ID, device_payload)
        recipient_device_id = device["id"]

        print("1. Test recipient device created: PASSED")

        # 2. Upload three prekeys
        key_ids = [5001, 5002, 5003]

        payload = OneTimePrekeyBatchRequest(
            prekeys=[
                {
                    "key_id": key_id,
                    "public_key": secrets.token_hex(32),
                }
                for key_id in key_ids
            ]
        )

        await register_one_time_prekeys(
            user_id=USER_ID,
            device_id=recipient_device_id,
            payload=payload,
        )

        print("2. Test prekeys uploaded: PASSED")

        # 3. Claim all three
        claimed_ids = []

        for expected_id in key_ids:
            result = await claim_one_time_prekey(
                user_id=USER_ID,
                recipient_device_id=recipient_device_id,
                requesting_device_id=REQUESTER_DEVICE_ID,
            )

            assert result is not None
            assert result["key_id"] == expected_id

            claimed_ids.append(result["key_id"])

        assert len(set(claimed_ids)) == 3

        print("3. Three unique prekeys claimed: PASSED")

        # 4. Verify no prekeys remain
        result = await claim_one_time_prekey(
            user_id=USER_ID,
            recipient_device_id=recipient_device_id,
            requesting_device_id=REQUESTER_DEVICE_ID,
        )

        assert result is None

        print("4. Empty prekey pool: PASSED")

        # 5. Verify database claim records
        row = await db.fetch_one(
            """
            SELECT COUNT(*) AS total
            FROM device_one_time_prekeys
            WHERE device_id = %s
              AND claimed_by_device_id = %s
              AND claimed_at IS NOT NULL
            """,
            (
                bytes.fromhex(recipient_device_id.replace("-", "")),
                bytes.fromhex(REQUESTER_DEVICE_ID.replace("-", "")),
            ),
        )

        assert int(row["total"]) == 3

        print("5. Database claim verification: PASSED")
        print("\nALL PREKEY CLAIM TESTS PASSED")

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(run_tests())
