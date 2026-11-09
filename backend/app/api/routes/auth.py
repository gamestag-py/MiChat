
from fastapi import APIRouter, HTTPException


from fastapi import APIRouter, HTTPException, Response

from app.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
)
from app.schemas.auth import RegisterRequest, RegisterResponse
from app.services.auth_service import (
    register_user,
    AccountAlreadyExistsError,
)

from app.services.auth_service import (
    register_user,
    authenticate_user,
    AccountAlreadyExistsError,
    InvalidCredentialsError,
)

from app.services.session_service import create_session
from app.core.config import settings


from app.schemas.auth import VerifyOTPRequest, VerifyOTPResponse
from app.services.verification_service import verify_otp

from fastapi import Cookie

from app.services.refresh_service import (
    rotate_refresh_token,
    InvalidRefreshTokenError,
)

from app.services.logout_service import revoke_session

from fastapi import Depends
from app.core.dependencies import get_current_user

from app.services.logout_service import revoke_all_sessions

from app.services.auth_service import (
    EmailNotVerifiedError,
    PhoneNotVerifiedError,
)



router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)




from fastapi import status





from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import RegisterRequest, RegisterResponse
from app.services.auth_service import (
    register_user,
    AccountAlreadyExistsError
)



from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import RegisterRequest, RegisterResponse
from app.services.auth_service import (
    register_user,
    AccountAlreadyExistsError
)

from app.schemas.auth import ResendOTPRequest
from app.db import db
from app.services.verification_service import create_verification
import logging

logger = logging.getLogger("michat.auth")









@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=201,
)
async def register(payload: RegisterRequest):
    try:
        user_id = await register_user(
            email=payload.email,
            phone_number=payload.phone_number,
            username=payload.username,
            display_name=payload.display_name,
            password=payload.password,
        )

        return RegisterResponse(
            message="Account created successfully",
            user_id=user_id,
            username=payload.username,
            display_name=payload.display_name,
        )

    except AccountAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))




@router.post(
    "/verify-otp",
    response_model=VerifyOTPResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_account_otp(payload: VerifyOTPRequest):

    verified = await verify_otp(
        user_id=payload.user_id,
        verification_type=payload.verification_type,
        destination=payload.destination,
        otp=payload.otp,
    )

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    return VerifyOTPResponse(
        success=True,
        message=(
            "Email verified successfully."
            if payload.verification_type == "email"
            else "Phone number verified successfully."
        ),
    )



@router.post("/resend-otp")
async def resend_otp(payload: ResendOTPRequest):

    # Check account and verification status
    if payload.verification_type == "email":
        query = """
            SELECT id, email, email_verified_at
            FROM users
            WHERE id = %s
            LIMIT 1
        """
    else:
        query = """
            SELECT id, phone_number, phone_verified_at
            FROM users
            WHERE id = %s
            LIMIT 1
        """

    user = await db.fetch_one(query, (payload.user_id,))

    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    destination_column = (
        "email" if payload.verification_type == "email"
        else "phone_number"
    )

    verified_column = (
        "email_verified_at" if payload.verification_type == "email"
        else "phone_verified_at"
    )

    if user[destination_column] != payload.destination:
        raise HTTPException(status_code=400, detail="Invalid destination.")

    if user[verified_column] is not None:
        raise HTTPException(
            status_code=400,
            detail="This contact method is already verified."
        )

    # Enforce 60-second cooldown
    latest = await db.fetch_one(
        """
        SELECT
            TIMESTAMPDIFF(
                SECOND,
                created_at,
                UTC_TIMESTAMP()
            ) AS seconds_ago
        FROM account_verifications
        WHERE user_id = %s
          AND verification_type = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (payload.user_id, payload.verification_type)
    )

    # if latest and latest["seconds_ago"] < 60:
    #     remaining = 60 - latest["seconds_ago"]

    #     raise HTTPException(
    #         status_code=429,
    #         detail=f"Please wait {remaining} seconds before requesting another OTP."
    #     )

    # Generate a new OTP
    otp = await create_verification(
        user_id=payload.user_id,
        verification_type=payload.verification_type,
        destination=payload.destination
    )

    logger.info(
        "Development OTP resend for %s: %s",
        payload.destination,
        otp
    )

    return {
        "success": True,
        "message": "A new verification OTP has been generated."
    }



@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    payload: LoginRequest,
    response: Response,
):
    try:
        user = await authenticate_user(
            email=payload.email,
            phone_number=payload.phone_number,
            password=payload.password,
        )

    except EmailNotVerifiedError:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Please verify your email before logging in."
            }
        )

    except PhoneNotVerifiedError:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PHONE_NOT_VERIFIED",
                "message": "Please verify your phone number before logging in."
            }
        )

    except InvalidCredentialsError:
        raise HTTPException(
            status_code=401,
            detail="Invalid email/phone number or password.",
        )

    session = await create_session(user["user_id"])

    response.set_cookie(
        key="michat_refresh",
        value=session["refresh_token"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )

    return LoginResponse(
        message="Login successful",
        access_token=session["access_token"],
        token_type="bearer",
        expires_in=session["expires_in"],
    )



@router.post(
    "/refresh",
    response_model=LoginResponse,
)
async def refresh_access_token(
    response: Response,
    michat_refresh: str | None = Cookie(default=None),
):
    if not michat_refresh:
        raise HTTPException(
            status_code=401,
            detail="Refresh token is missing.",
        )

    try:
        tokens = await rotate_refresh_token(michat_refresh)

    except InvalidRefreshTokenError:
        response.delete_cookie(
            key="michat_refresh",
            path="/api/v1/auth",
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token.",
        )

    response.set_cookie(
        key="michat_refresh",
        value=tokens["refresh_token"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )

    return LoginResponse(
        message="Token refreshed successfully",
        access_token=tokens["access_token"],
        token_type="bearer",
        expires_in=tokens["expires_in"],
    )



@router.post("/logout")
async def logout(
    response: Response,
    michat_refresh: str | None = Cookie(default=None),
):
    if michat_refresh:
        await revoke_session(michat_refresh)

    response.delete_cookie(
        key="michat_refresh",
        path="/api/v1/auth",
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
    )

    return {
        "success": True,
        "message": "Logged out successfully",
    }



@router.get("/me")
async def get_profile(
    current_user: dict = Depends(get_current_user),
):
    return {
        "success": True,
        "message": "Authenticated user",
        "data": {
            "user_id": current_user["id"],
            "email": current_user["email"],
            "phone_number": current_user["phone_number"],
            "username": current_user["username"],
            "display_name": current_user["display_name"],
        },
    }




@router.post("/logout-all")
async def logout_all(
    response: Response,
    current_user: dict = Depends(get_current_user),
):
    revoked_count = await revoke_all_sessions(
        current_user["id"]
    )

    response.delete_cookie(
        key="michat_refresh",
        path="/api/v1/auth",
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
    )

    return {
        "success": True,
        "message": "Logged out from all devices successfully",
        "revoked_sessions": revoked_count,
    }
