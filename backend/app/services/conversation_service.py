
from uuid import uuid4

import aiomysql

from app.db import db


async def create_conversation(
    creator_user_id: int,
    participant_user_ids: list[int],
    conversation_type: str = "direct",
) -> dict:
    """
    Create a direct or group conversation.

    The creator is automatically added as owner.
    participant_user_ids contains the other participants.
    """

    if conversation_type not in ("direct", "group"):
        raise ValueError("Invalid conversation type")

    if not participant_user_ids:
        raise ValueError("At least one participant is required")

    if creator_user_id in participant_user_ids:
        raise ValueError("Creator must not be included in participants")

    if len(participant_user_ids) != len(set(participant_user_ids)):
        raise ValueError("Duplicate participants are not allowed")

    if conversation_type == "direct" and len(participant_user_ids) != 1:
        raise ValueError("Direct conversations require exactly two users")

    all_user_ids = sorted([creator_user_id, *participant_user_ids])

    conversation_id = uuid4()
    conversation_id_bytes = conversation_id.bytes

    async with db.transaction() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:

            # Lock user rows to serialize concurrent creation requests.
            placeholders = ", ".join(["%s"] * len(all_user_ids))

            await cur.execute(
                f"""
                SELECT id, account_status
                FROM users
                WHERE id IN ({placeholders})
                ORDER BY id
                FOR UPDATE
                """,
                tuple(all_user_ids),
            )

            users = await cur.fetchall()

            if len(users) != len(all_user_ids):
                raise ValueError("One or more users do not exist")

            if any(user["account_status"] != "active" for user in users):
                raise ValueError("One or more users are not active")

            # Direct conversation: reuse an existing conversation.
            if conversation_type == "direct":
                low_id, high_id = all_user_ids

                await cur.execute(
                    """
                    SELECT cp.conversation_id
                    FROM conversation_pairs cp
                    INNER JOIN conversations c
                        ON c.id = cp.conversation_id
                    INNER JOIN conversation_members cm1
                        ON cm1.conversation_id = c.id
                        AND cm1.user_id = %s
                        AND cm1.left_at IS NULL
                    INNER JOIN conversation_members cm2
                        ON cm2.conversation_id = c.id
                        AND cm2.user_id = %s
                        AND cm2.left_at IS NULL
                    WHERE cp.user_low_id = %s
                      AND cp.user_high_id = %s
                      AND c.deleted_at IS NULL
                    LIMIT 1
                    """,
                    (creator_user_id, participant_user_ids[0], low_id, high_id),
                )

                existing = await cur.fetchone()

                if existing:
                    return {
                        "id": str(
                            __import__("uuid").UUID(
                                bytes=existing["conversation_id"]
                            )
                        ),
                        "conversation_type": "direct",
                        "created": False,
                    }

            # Create conversation.
            await cur.execute(
                """
                INSERT INTO conversations (
                    id,
                    conversation_type,
                    created_by
                )
                VALUES (%s, %s, %s)
                """,
                (
                    conversation_id_bytes,
                    conversation_type,
                    creator_user_id,
                ),
            )

            # Add creator and participants.
            member_values = []

            for user_id in all_user_ids:
                role = "owner" if user_id == creator_user_id else "member"
                member_values.append(
                    (
                        conversation_id_bytes,
                        user_id,
                        role,
                        creator_user_id,
                    )
                )

            await cur.executemany(
                """
                INSERT INTO conversation_members (
                    conversation_id,
                    user_id,
                    member_role,
                    added_by_user_id
                )
                VALUES (%s, %s, %s, %s)
                """,
                member_values,
            )

            # Initialize per-user conversation settings.
            settings_values = [
                (conversation_id_bytes, user_id)
                for user_id in all_user_ids
            ]

            await cur.executemany(
                """
                INSERT INTO conversation_user_settings (
                    conversation_id,
                    user_id
                )
                VALUES (%s, %s)
                """,
                settings_values,
            )

            # Store normalized user pair for direct conversations.
            if conversation_type == "direct":
                await cur.execute(
                    """
                    INSERT INTO conversation_pairs (
                        conversation_id,
                        user_low_id,
                        user_high_id
                    )
                    VALUES (%s, %s, %s)
                    """,
                    (
                        conversation_id_bytes,
                        all_user_ids[0],
                        all_user_ids[1],
                    ),
                )

    return {
        "id": str(conversation_id),
        "conversation_type": conversation_type,
        "created": True,
    }





from uuid import UUID


async def list_conversations(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """
    Return active conversations belonging to a user,
    including active members and personal settings.
    """

    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    # Fetch total conversation count.
    count_row = await db.fetch_one(
        """
        SELECT COUNT(*) AS total
        FROM conversation_members cm
        INNER JOIN conversations c
            ON c.id = cm.conversation_id
        WHERE cm.user_id = %s
          AND cm.left_at IS NULL
          AND c.deleted_at IS NULL
        """,
        (user_id,),
    )

    total = count_row["total"] if count_row else 0

    # Fetch conversation list.
    conversations = await db.fetch_all(
        """
        SELECT
            c.id,
            c.conversation_type,
            c.created_at,
            c.updated_at,
            c.last_sequence,
            c.group_key_epoch,

            COALESCE(s.is_archived, 0) AS is_archived,
            COALESCE(s.is_muted, 0) AS is_muted,
            s.muted_until,
            COALESCE(s.is_pinned, 0) AS is_pinned,
            COALESCE(s.last_read_sequence, 0) AS last_read_sequence

        FROM conversation_members cm

        INNER JOIN conversations c
            ON c.id = cm.conversation_id

        LEFT JOIN conversation_user_settings s
            ON s.conversation_id = c.id
            AND s.user_id = cm.user_id

        WHERE cm.user_id = %s
          AND cm.left_at IS NULL
          AND c.deleted_at IS NULL

        ORDER BY
            COALESCE(s.is_pinned, 0) DESC,
            c.updated_at DESC

        LIMIT %s OFFSET %s
        """,
        (user_id, limit, offset),
    )

    if not conversations:
        return {
            "conversations": [],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    # Convert binary conversation IDs to UUIDs.
    conversation_ids = [
        row["id"] for row in conversations
    ]

    placeholders = ", ".join(
        ["%s"] * len(conversation_ids)
    )

    # Fetch active members for all conversations.
    members = await db.fetch_all(
        f"""
        SELECT
            cm.conversation_id,
            cm.user_id,
            cm.member_role,
            cm.joined_at,
            p.username,
            p.display_name

        FROM conversation_members cm

        INNER JOIN user_profiles p
            ON p.user_id = cm.user_id

        WHERE cm.conversation_id IN ({placeholders})
          AND cm.left_at IS NULL

        ORDER BY cm.joined_at ASC
        """,
        tuple(conversation_ids),
    )

    members_by_conversation = {}

    for member in members:
        conversation_id = member["conversation_id"]

        members_by_conversation.setdefault(
            conversation_id, []
        ).append({
            "user_id": member["user_id"],
            "username": member["username"],
            "display_name": member["display_name"],
            "member_role": member["member_role"],
            "joined_at": member["joined_at"],
        })

    result = []

    for conversation in conversations:
        raw_id = conversation["id"]
        conversation_uuid = str(UUID(bytes=raw_id))

        result.append({
            "id": conversation_uuid,
            "conversation_type": conversation["conversation_type"],
            "name": None,
            "created_at": conversation["created_at"],
            "updated_at": conversation["updated_at"],
            "last_sequence": conversation["last_sequence"],
            "group_key_epoch": conversation["group_key_epoch"],
            "members": members_by_conversation.get(raw_id, []),
            "settings": {
                "is_archived": bool(conversation["is_archived"]),
                "is_muted": bool(conversation["is_muted"]),
                "muted_until": conversation["muted_until"],
                "is_pinned": bool(conversation["is_pinned"]),
                "last_read_sequence": conversation["last_read_sequence"],
            },
        })

    return {
        "conversations": result,
        "total": total,
        "limit": limit,
        "offset": offset,
    }



async def get_conversation(
    conversation_id: str,
    user_id: int,
) -> dict | None:
    """
    Retrieve conversation details.
    Only active members can access the conversation.
    """

    try:
        conversation_uuid = UUID(conversation_id)
    except (ValueError, TypeError, AttributeError):
        return None

    raw_id = conversation_uuid.bytes

    # Verify active membership and retrieve conversation details.
    conversation = await db.fetch_one(
        """
        SELECT
            c.id,
            c.conversation_type,
            c.created_at,
            c.updated_at,
            c.last_sequence,
            c.group_key_epoch,

            s.is_archived,
            s.is_muted,
            s.muted_until,
            s.is_pinned,
            s.last_read_sequence

        FROM conversations c

        INNER JOIN conversation_members cm
            ON cm.conversation_id = c.id
            AND cm.user_id = %s
            AND cm.left_at IS NULL

        LEFT JOIN conversation_user_settings s
            ON s.conversation_id = c.id
            AND s.user_id = %s

        WHERE c.id = %s
          AND c.deleted_at IS NULL

        LIMIT 1
        """,
        (user_id, user_id, raw_id),
    )

    if not conversation:
        return None

    # Retrieve active members.
    members = await db.fetch_all(
        """
        SELECT
            cm.user_id,
            cm.member_role,
            cm.joined_at,
            p.username,
            p.display_name

        FROM conversation_members cm

        INNER JOIN user_profiles p
            ON p.user_id = cm.user_id

        WHERE cm.conversation_id = %s
          AND cm.left_at IS NULL

        ORDER BY cm.joined_at ASC
        """,
        (raw_id,),
    )

    return {
        "id": str(UUID(bytes=conversation["id"])),
        "conversation_type": conversation["conversation_type"],
        "name": None,
        "created_at": conversation["created_at"],
        "updated_at": conversation["updated_at"],
        "last_sequence": conversation["last_sequence"],
        "group_key_epoch": conversation["group_key_epoch"],
        "members": [
            {
                "user_id": member["user_id"],
                "username": member["username"],
                "display_name": member["display_name"],
                "member_role": member["member_role"],
                "joined_at": member["joined_at"],
            }
            for member in members
        ],
        "settings": {
            "is_archived": bool(conversation["is_archived"]),
            "is_muted": bool(conversation["is_muted"]),
            "muted_until": conversation["muted_until"],
            "is_pinned": bool(conversation["is_pinned"]),
            "last_read_sequence": conversation["last_read_sequence"] or 0,
        },
    }
