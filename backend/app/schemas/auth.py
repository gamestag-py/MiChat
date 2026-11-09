
import re

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str | None = Field(default=None, max_length=255)
    phone_number: str | None = Field(default=None, max_length=24)

    username: str = Field(min_length=3, max_length=32)
    display_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        if value is not None:
            value = value.lower()
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
                raise ValueError("Invalid email address")
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value):
        if value is not None:
            if not re.fullmatch(r"\+?[1-9]\d{7,14}", value):
                raise ValueError("Invalid phone number")
        return value

    @field_validator("username")
    @classmethod
    def validate_username(cls, value):
        if not re.fullmatch(r"[a-zA-Z0-9_]+", value):
            raise ValueError(
                "Username can contain only letters, numbers and underscores"
            )
        return value.lower()

    @model_validator(mode="after")
    def require_contact_method(self):
        if not self.email and not self.phone_number:
            raise ValueError("Email or phone number is required")
        return self


class RegisterResponse(BaseModel):
    success: bool = True
    message: str
    user_id: int
    username: str
    display_name: str





class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str | None = Field(default=None, max_length=255)
    phone_number: str | None = Field(default=None, max_length=24)
    password: str = Field(min_length=1, max_length=128)

    @model_validator(mode="after")
    def require_identifier(self):
        if not self.email and not self.phone_number:
            raise ValueError("Email or phone number is required")

        if self.email and self.phone_number:
            raise ValueError("Provide either email or phone number, not both")

        if self.email:
            self.email = self.email.lower()

        return self


class LoginResponse(BaseModel):
    success: bool = True
    message: str
    access_token: str
    token_type: str = "bearer"
    expires_in: int



from typing import Literal


class VerifyOTPRequest(BaseModel):
    user_id: int = Field(gt=0)
    verification_type: Literal["email", "phone"]
    destination: str = Field(min_length=1, max_length=255)
    otp: str = Field(pattern=r"^\d{6}$")


class VerifyOTPResponse(BaseModel):
    success: bool
    message: str





class ResendOTPRequest(BaseModel):
    user_id: int = Field(gt=0)
    verification_type: Literal["email", "phone"]
    destination: str = Field(min_length=1, max_length=255)
