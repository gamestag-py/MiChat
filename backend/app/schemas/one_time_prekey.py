
from pydantic import BaseModel, ConfigDict, Field, field_validator


class OneTimePrekeyItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key_id: int = Field(ge=0, le=4294967295)
    public_key: str = Field(min_length=1)

    @field_validator("public_key")
    @classmethod
    def validate_public_key(cls, value: str) -> str:
        try:
            decoded = bytes.fromhex(value)
        except ValueError:
            raise ValueError("public_key must be hexadecimal")

        if not decoded or len(decoded) > 128:
            raise ValueError("Public key must be between 1 and 128 bytes")

        return value.lower()


class OneTimePrekeyBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prekeys: list[OneTimePrekeyItem] = Field(min_length=1, max_length=100)

    @field_validator("prekeys")
    @classmethod
    def validate_unique_key_ids(cls, value):
        key_ids = [item.key_id for item in value]

        if len(key_ids) != len(set(key_ids)):
            raise ValueError("Duplicate key_id values are not allowed")

        return value


from pydantic import BaseModel, ConfigDict
from uuid import UUID


class OneTimePrekeyClaimRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requesting_device_id: UUID
