from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.schemas.privacy import PrivacyUpdateRequest, PrivacyResponse
from app.services.privacy_service import (
    get_privacy_settings,
    update_privacy_settings,
)

router = APIRouter(prefix="/privacy", tags=["Privacy"])


@router.get("/me", response_model=PrivacyResponse)
async def get_my_privacy_settings(
    current_user: dict = Depends(get_current_user),
):
    settings = await get_privacy_settings(current_user["id"])

    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Privacy settings not found",
        )

    return settings


@router.patch("/me", response_model=PrivacyResponse)
async def update_my_privacy_settings(
    payload: PrivacyUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    await update_privacy_settings(current_user["id"], payload)

    settings = await get_privacy_settings(current_user["id"])

    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Privacy settings not found",
        )

    return settings