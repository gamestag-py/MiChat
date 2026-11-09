
import hashlib
import uuid

from app.db import db


async def register_device(user_id: int, payload):
    device_id = uuid.uuid4()
    
    public_key = bytes.fromhex(payload.identity_public_key)
    fingerprint = hashlib.sha256(public_key).digest()

    await db.execute(
        """
        INSERT INTO devices (
            id,
            user_id,
            device_name,
            platform,
            app_version,
            registration_id,
            identity_public_key,
            identity_key_fingerprint
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            device_id.bytes,
            user_id,
            payload.device_name,
            payload.platform,
            payload.app_version,
            payload.registration_id,
            public_key,
            fingerprint,
        ),
    )

    return {
        "id": str(device_id),
        "device_name": payload.device_name,
        "platform": payload.platform,
        "app_version": payload.app_version,
        "registration_id": payload.registration_id,
        "identity_key_fingerprint": fingerprint.hex(),
    }



import uuid

from app.db import db


async def get_user_devices(user_id: int):
    rows = await db.fetch_all(
        """
        SELECT
            id,
            device_name,
            platform,
            app_version,
            registration_id,
            identity_key_fingerprint,
            created_at,
            last_seen_at,
            revoked_at
        FROM devices
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user_id,),
    )

    devices = []

    for row in rows:
        devices.append({
            "id": str(uuid.UUID(bytes=bytes(row["id"]))),
            "device_name": row["device_name"],
            "platform": row["platform"],
            "app_version": row["app_version"],
            "registration_id": row["registration_id"],
            "identity_key_fingerprint": bytes(
                row["identity_key_fingerprint"]
            ).hex(),
            "created_at": row["created_at"].isoformat(),
            "last_seen_at": (
                row["last_seen_at"].isoformat()
                if row["last_seen_at"] else None
            ),
            "revoked_at": (
                row["revoked_at"].isoformat()
                if row["revoked_at"] else None
            ),
        })

    return devices



async def revoke_device(user_id: int, device_id: str) -> bool:
    import uuid

    try:
        device_uuid = uuid.UUID(device_id)
    except ValueError:
        raise ValueError("Invalid device ID")

    affected = await db.execute(
        """
        UPDATE devices
        SET revoked_at = CURRENT_TIMESTAMP(3)
        WHERE id = %s
          AND user_id = %s
          AND revoked_at IS NULL
        """,
        (device_uuid.bytes, user_id),
    )

    return affected > 0
