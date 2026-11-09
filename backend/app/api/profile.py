
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.dependencies import get_current_user
from app.schemas.profile import (
    ProfileUpdateRequest,
    ProfileResponse,
    UsernameAvailabilityResponse,
)
from app.services.profile_service import (
    get_profile,
    is_username_available,
    update_profile,
)


router = APIRouter(prefix="/profile", tags=["Profile"])

limiter = Limiter(key_func=get_remote_address)


@router.get("/me", response_model=ProfileResponse)
async def my_profile(
    current_user: dict = Depends(get_current_user),
):
    profile = await get_profile(current_user["id"])

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found.",
        )

    return profile


@router.get(
    "/username/{username}",
    response_model=UsernameAvailabilityResponse,
)
@limiter.limit("10/minute")
async def check_username(
    request: Request,
    username: str,
    current_user: dict = Depends(get_current_user),
):
    available = await is_username_available(
        username,
        current_user_id=current_user["id"],
    )

    return {
        "username": username.lower(),
        "available": available,
    }


@router.patch("/me")
async def edit_profile(
    payload: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        await update_profile(current_user["id"], payload)

        profile = await get_profile(current_user["id"])

        return {
            "success": True,
            "message": "Profile updated successfully.",
            "profile": profile,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        )
