
import asyncio
import uuid

from app.db import db
from app.services.profile_service import (
    get_profile,
    is_username_available,
    update_profile,
)
from app.schemas.profile import ProfileUpdateRequest


async def run_tests():
    await db.init_pool()

    # Replace this with an existing user ID from your database.
    user_id = 1

    test_username = f"test_{uuid.uuid4().hex[:10]}"

    try:
        # 1. Check initial profile
        profile = await get_profile(user_id)

        assert profile is not None, "Profile not found"
        print("1. Profile retrieval: PASSED")
        print(profile)

        # 2. Check username availability
        available = await is_username_available(test_username)

        assert available is True, "Generated username should be available"
        print("2. Username availability: PASSED")

        # 3. Update profile
        payload = ProfileUpdateRequest(
            username=test_username,
            display_name="MiChat Test User",
            bio="Testing profile service",
        )

        updated = await update_profile(user_id, payload)

        assert updated is True, "Profile update failed"
        print("3. Profile update: PASSED")

        # 4. Verify updated profile
        updated_profile = await get_profile(user_id)

        assert updated_profile["username"] == test_username
        assert updated_profile["display_name"] == "MiChat Test User"
        assert updated_profile["bio"] == "Testing profile service"

        print("4. Updated profile verification: PASSED")

        # 5. Username should be unavailable to another user
        available = await is_username_available(test_username)

        assert available is False
        print("5. Duplicate username detection: PASSED")

        # 6. Current user can retain their own username
        available = await is_username_available(
            test_username,
            current_user_id=user_id,
        )

        assert available is True
        print("6. Own username availability: PASSED")

        # 7. Update only bio
        payload = ProfileUpdateRequest(bio="Updated bio")

        await update_profile(user_id, payload)

        updated_profile = await get_profile(user_id)

        assert updated_profile["bio"] == "Updated bio"
        print("7. Partial profile update: PASSED")

        print("\nAll profile service tests passed.")

    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(run_tests())
