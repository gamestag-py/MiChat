from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ConversationCreateRequest(BaseModel):
    participant_user_ids: list[int] = Field(
        min_length=1,
        max_length=50
    )
    conversation_type: Literal["direct", "group"] = "direct"
    name: str | None = Field(default=None, max_length=100)


class ConversationMemberResponse(BaseModel):
    user_id: int
    username: str
    display_name: str
    member_role: Literal["owner", "admin", "member"]
    joined_at: datetime


class ConversationResponse(BaseModel):
    id: UUID
    conversation_type: Literal["direct", "group"]
    name: str | None = None
    created_at: datetime
    updated_at: datetime
    members: list[ConversationMemberResponse] = Field(default_factory=list)


class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]
    total: int


class ConversationUpdateRequest(BaseModel):
    name: str | None = Field(default=None, max_length=100)


class ConversationMemberAddRequest(BaseModel):
    user_ids: list[int] = Field(min_length=1, max_length=50)


class ConversationMemberRemoveRequest(BaseModel):
    user_id: int


class ConversationSettingsUpdateRequest(BaseModel):
    is_archived: bool | None = None
    is_muted: bool | None = None
    muted_until: datetime | None = None
    is_pinned: bool | None = None