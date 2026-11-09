
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SignedPrekeyRegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key_id: int = Field(ge=0, le=4294967295)
    public_key: str = Field(min_length=1)
    signature: str = Field(min_length=1)

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

    @field_validator("signature")
    @classmethod
    def validate_signature(cls, value: str) -> str:
        try:
            decoded = bytes.fromhex(value)
        except ValueError:
            raise ValueError("signature must be hexadecimal")

        if not decoded or len(decoded) > 256:
            raise ValueError("Signature must be between 1 and 256 bytes")

        return value.lower()
