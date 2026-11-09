
import uuid

from app.db import db
from app.services.one_time_prekey_service import claim_one_time_prekey


async def get_device_key_bundle(
    user_id: int,
    recipient_device_id: str,
    requesting_device_id: str,
):
    try:
        recipient_uuid = uuid.UUID(recipient_device_id)
    except (ValueError, TypeError, AttributeError):
        raise ValueError("Invalid recipient device ID")

    # Retrieve the recipient's active device identity.
    device = await db.fetch_one(
        """
        SELECT
            id,
            user_id,
            identity_public_key,
            identity_key_fingerprint
        FROM devices
        WHERE id = %s
          AND revoked_at IS NULL
        LIMIT 1
        """,
        (recipient_uuid.bytes,)
    )

    if not device:
        raise ValueError("Recipient device not found or revoked")

    # Retrieve the latest active, non-expired signed prekey.
    signed_prekey = await db.fetch_one(
        """
        SELECT
            key_id,
            public_key,
            signature,
            created_at,
            expires_at
        FROM device_signed_prekeys
        WHERE device_id = %s
          AND retired_at IS NULL
          AND (
              expires_at IS NULL
              OR expires_at > CURRENT_TIMESTAMP(3)
          )
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
        (recipient_uuid.bytes,)
    )

    if not signed_prekey:
        raise ValueError("Recipient device has no active signed prekey")

    # Claim one one-time prekey atomically.
    one_time_prekey = await claim_one_time_prekey(
        user_id=user_id,
        recipient_device_id=recipient_device_id,
        requesting_device_id=requesting_device_id,
    )

    return {
        "device_id": recipient_device_id,
        "identity_key": bytes(
            device["identity_public_key"]
        ).hex(),
        "identity_key_fingerprint": bytes(
            device["identity_key_fingerprint"]
        ).hex(),
        "signed_prekey": {
            "key_id": signed_prekey["key_id"],
            "public_key": bytes(
                signed_prekey["public_key"]
            ).hex(),
            "signature": bytes(
                signed_prekey["signature"]
            ).hex(),
        },
        "one_time_prekey": (
            {
                "key_id": one_time_prekey["key_id"],
                "public_key": one_time_prekey["public_key"],
            }
            if one_time_prekey
            else None
        ),
    }
