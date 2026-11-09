
from pymysql.err import IntegrityError

from app.db import db


async def get_profile(user_id: int):
    return await db.fetch_one(
        """
        SELECT
            u.id AS user_id,
            p.username,
            p.display_name,
            p.bio
        FROM users u
        INNER JOIN user_profiles p ON p.user_id = u.id
        WHERE u.id = %s
          AND u.account_status = 'active'
        LIMIT 1
        """,
        (user_id,),
    )


async def is_username_available(
    username: str,
    current_user_id: int | None = None,
) -> bool:

    username = username.strip().lower()

    if current_user_id is not None:
        query = """
            SELECT user_id
            FROM user_profiles
            WHERE username = %s
              AND user_id != %s
            LIMIT 1
        """
        params = (username, current_user_id)
    else:
        query = """
            SELECT user_id
            FROM user_profiles
            WHERE username = %s
            LIMIT 1
        """
        params = (username,)

    existing = await db.fetch_one(query, params)

    return existing is None


async def update_profile(user_id: int, payload) -> bool:

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        return False

    if "username" in updates:
        updates["username"] = updates["username"].lower()

        available = await is_username_available(
            updates["username"],
            current_user_id=user_id,
        )

        if not available:
            raise ValueError("Username is already taken")

    allowed_fields = {
        "username",
        "display_name",
        "bio",
    }

    if not set(updates).issubset(allowed_fields):
        raise ValueError("Invalid profile fields")

    columns = ", ".join(
        f"{column} = %s" for column in updates
    )

    values = list(updates.values())
    values.append(user_id)

    try:
        await db.execute(
            f"""
            UPDATE user_profiles
            SET {columns},
                profile_updated_at = UTC_TIMESTAMP(3)
            WHERE user_id = %s
            """,
            tuple(values),
        )

        return True

    except IntegrityError as exc:
        if exc.args and exc.args[0] == 1062:
            raise ValueError("Username is already taken") from exc
        raise
