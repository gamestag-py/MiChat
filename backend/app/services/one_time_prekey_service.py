
import uuid

from app.db import db


async def register_one_time_prekeys(
    user_id: int,
    device_id: str,
    payload,
):
    try:
        device_uuid = uuid.UUID(device_id)
    except ValueError:
        raise ValueError("Invalid device ID")

    # Verify device ownership and active status.
    device = await db.fetch_one(
        """
        SELECT id
        FROM devices
        WHERE id = %s
          AND user_id = %s
          AND revoked_at IS NULL
        LIMIT 1
        """,
        (device_uuid.bytes, user_id),
    )

    if not device:
        raise ValueError("Device not found or revoked")

    prekeys = [
        (
            device_uuid.bytes,
            item.key_id,
            bytes.fromhex(item.public_key),
        )
        for item in payload.prekeys
    ]

    # Insert the complete batch.
    await db.execute_many(
        """
        INSERT INTO device_one_time_prekeys (
            device_id,
            key_id,
            public_key
        )
        VALUES (%s, %s, %s)
        """,
        prekeys,
    )

    return {
        "device_id": str(device_uuid),
        "uploaded": len(prekeys),
        "key_ids": [item.key_id for item in payload.prekeys],
    }



import uuid
import aiomysql

from app.db import db


async def claim_one_time_prekey(
    user_id: int,
    recipient_device_id: str,
    requesting_device_id: str,
):
    try:
        recipient_uuid = uuid.UUID(recipient_device_id)
        requester_uuid = uuid.UUID(requesting_device_id)
    except ValueError:
        raise ValueError("Invalid device ID")

    async with db.transaction() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:

            # Verify the requesting device belongs to the authenticated user.
            await cursor.execute(
                """
                SELECT id
                FROM devices
                WHERE id = %s
                  AND user_id = %s
                  AND revoked_at IS NULL
                LIMIT 1
                """,
                (requester_uuid.bytes, user_id),
            )

            requester = await cursor.fetchone()

            if not requester:
                raise ValueError(
                    "Requesting device not found or revoked"
                )

            # Verify that the recipient device is active.
            await cursor.execute(
                """
                SELECT id
                FROM devices
                WHERE id = %s
                  AND revoked_at IS NULL
                LIMIT 1
                """,
                (recipient_uuid.bytes,),
            )

            recipient = await cursor.fetchone()

            if not recipient:
                raise ValueError(
                    "Recipient device not found or revoked"
                )

            # Lock one available prekey.
            await cursor.execute(
                """
                SELECT id, key_id, public_key
                FROM device_one_time_prekeys
                WHERE device_id = %s
                  AND claimed_at IS NULL
                ORDER BY id ASC
                LIMIT 1
                FOR UPDATE
                """,
                (recipient_uuid.bytes,),
            )

            prekey = await cursor.fetchone()

            if not prekey:
                return None

            # Mark the prekey as claimed inside the same transaction.
            await cursor.execute(
                """
                UPDATE device_one_time_prekeys
                SET
                    claimed_at = CURRENT_TIMESTAMP(3),
                    claimed_by_device_id = %s
                WHERE id = %s
                  AND claimed_at IS NULL
                """,
                (
                    requester_uuid.bytes,
                    prekey["id"],
                ),
            )

            if cursor.rowcount != 1:
                raise RuntimeError("Unable to claim prekey")

            return {
                "recipient_device_id": str(recipient_uuid),
                "requesting_device_id": str(requester_uuid),
                "key_id": prekey["key_id"],
                "public_key": bytes(prekey["public_key"]).hex(),
            }
