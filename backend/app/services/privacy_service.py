
from app.db import db


PRIVACY_FIELDS = {
    "profile_visibility",
    "avatar_visibility",
    "last_seen_visibility",
    "read_receipts_enabled",
    "allow_group_add",
    "searchable_by_phone",
}


async def get_privacy_settings(user_id: int):
    return await db.fetch_one(
        """
        SELECT
            profile_visibility,
            avatar_visibility,
            last_seen_visibility,
            read_receipts_enabled,
            allow_group_add,
            searchable_by_phone
        FROM user_privacy_settings
        WHERE user_id = %s
        LIMIT 1
        """,
        (user_id,),
    )


async def update_privacy_settings(user_id: int, payload) -> bool:
    updates = payload.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    if not updates:
        raise ValueError("Provide at least one privacy setting")

    if not set(updates).issubset(PRIVACY_FIELDS):
        raise ValueError("Invalid privacy settings")

    columns = ", ".join(
        f"{column} = %s" for column in updates
    )

    values = list(updates.values())
    values.append(user_id)

    affected = await db.execute(
        f"""
        UPDATE user_privacy_settings
        SET {columns}
        WHERE user_id = %s
        """,
        tuple(values),
    )

    return affected > 0
