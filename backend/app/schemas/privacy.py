
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


Visibility = Literal["everyone", "contacts", "nobody"]


class PrivacyUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_visibility: Visibility | None = None
    avatar_visibility: Visibility | None = None
    last_seen_visibility: Visibility | None = None
    read_receipts_enabled: bool | None = None
    allow_group_add: Visibility | None = None
    searchable_by_phone: bool | None = None

    @model_validator(mode="after")
    def validate_at_least_one_field(self):
        if all(
            value is None
            for value in self.model_dump().values()
        ):
            raise ValueError("Provide at least one privacy setting")

        return self


class PrivacyResponse(BaseModel):
    profile_visibility: Visibility
    avatar_visibility: Visibility
    last_seen_visibility: Visibility
    read_receipts_enabled: bool
    allow_group_add: Visibility
    searchable_by_phone: bool
