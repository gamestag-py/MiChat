
import uuid

from app.db import db


async def register_signed_prekey(
    user_id: int,
    device_id: str,
    payload,
):
    try:
        device_uuid = uuid.UUID(device_id)
    except ValueError:
        raise ValueError("Invalid device ID")

    public_key = bytes.fromhex(payload.public_key)
    signature = bytes.fromhex(payload.signature)

    # Verify device ownership and ensure it has not been revoked.
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

    # Prevent duplicate key IDs for the same device.
    existing = await db.fetch_one(
        """
        SELECT id
        FROM device_signed_prekeys
        WHERE device_id = %s
          AND key_id = %s
        LIMIT 1
        """,
        (device_uuid.bytes, payload.key_id),
    )

    if existing:
        raise ValueError("This signed prekey ID already exists")

    await db.execute(
        """
        INSERT INTO device_signed_prekeys (
            device_id,
            key_id,
            public_key,
            signature
        )
        VALUES (%s, %s, %s, %s)
        """,
        (
            device_uuid.bytes,
            payload.key_id,
            public_key,
            signature,
        ),
    )

    return {
        "device_id": str(device_uuid),
        "key_id": payload.key_id,
        "public_key": payload.public_key,
        "signature": payload.signature,
    }
