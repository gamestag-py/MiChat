
import asyncio

from app.db import db
from app.services.privacy_service import (
    get_privacy_settings,
    update_privacy_settings,
)
from app.schemas.privacy import PrivacyUpdateRequest


async def run_tests():
    await db.init_pool()

    # Use an existing test account ID.
    user_id = 1

    original = await get_privacy_settings(user_id)

    assert original is not None, "Privacy settings not found"
    print("1. Retrieve privacy settings: PASSED")
    print(original)

    try:
        payload = PrivacyUpdateRequest(
            profile_visibility="contacts",
            avatar_visibility="nobody",
            last_seen_visibility="nobody",
            read_receipts_enabled=False,
            allow_group_add="nobody",
            searchable_by_phone=False,
        )

        await update_privacy_settings(user_id, payload)

        updated = await get_privacy_settings(user_id)

        assert updated["profile_visibility"] == "contacts"
        assert updated["avatar_visibility"] == "nobody"
        assert updated["last_seen_visibility"] == "nobody"
        assert updated["read_receipts_enabled"] == 0
        assert updated["allow_group_add"] == "nobody"
        assert updated["searchable_by_phone"] == 0

        print("2. Update all privacy settings: PASSED")

        payload = PrivacyUpdateRequest(
            profile_visibility="everyone"
        )

        await update_privacy_settings(user_id, payload)

        updated = await get_privacy_settings(user_id)

        assert updated["profile_visibility"] == "everyone"
        assert updated["avatar_visibility"] == "nobody"

        print("3. Partial privacy update: PASSED")

    finally:
        # Restore original settings after testing.
        restore_payload = PrivacyUpdateRequest(**dict(original))
        await update_privacy_settings(user_id, restore_payload)
        print("4. Restore original settings: PASSED")

        await db.close()

    print("\nAll privacy service tests passed.")


if __name__ == "__main__":
    asyncio.run(run_tests())
