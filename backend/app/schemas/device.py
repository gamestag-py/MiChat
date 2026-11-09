
import hashlib
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DeviceRegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    device_name: str = Field(min_length=1, max_length=80)
    platform: Literal["web", "android", "ios", "desktop", "other"] = "other"
    app_version: str | None = Field(default=None, max_length=40)
    registration_id: int | None = Field(default=None, ge=0, le=4294967295)
    identity_public_key: str = Field(min_length=1)

    @field_validator("identity_public_key")
    @classmethod
    def validate_public_key(cls, value: str) -> str:
        try:
            decoded = bytes.fromhex(value)
        except ValueError:
            raise ValueError("identity_public_key must be hexadecimal")

        if not decoded or len(decoded) > 128:
            raise ValueError("Public key must be between 1 and 128 bytes")

        return value.lower()


class DeviceResponse(BaseModel):
    id: str
    device_name: str
    platform: str
    app_version: str | None
    registration_id: int | None
    identity_key_fingerprint: str
    created_at: str
    last_seen_at: str | None
