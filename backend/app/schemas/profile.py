
import re

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    username: str | None = Field(default=None, min_length=3, max_length=32)
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=200)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value):
        if value is not None:
            if not re.fullmatch(r"[a-zA-Z0-9_]+", value):
                raise ValueError(
                    "Username can contain only letters, numbers and underscores"
                )
            return value.lower()
        return value

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value):
        if value is not None and not value.strip():
            raise ValueError("Display name cannot be empty")
        return value

    @model_validator(mode="after")
    def validate_at_least_one_field(self):
        if all(
            value is None
            for value in (
                self.username,
                self.display_name,
                self.bio,
            )
        ):
            raise ValueError("Provide at least one profile field")
        return self


class ProfileResponse(BaseModel):
    user_id: int
    username: str
    display_name: str
    bio: str | None = None


class UsernameAvailabilityResponse(BaseModel):
    username: str
    available: bool
