
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user

from app.schemas.device import DeviceRegisterRequest
from app.schemas.one_time_prekey import (
    OneTimePrekeyBatchRequest,
    OneTimePrekeyClaimRequest,
)
from app.schemas.signed_prekey import SignedPrekeyRegisterRequest

from app.services.device_service import (
    register_device,
    get_user_devices,
    revoke_device,
)
from app.services.one_time_prekey_service import (
    claim_one_time_prekey,
    register_one_time_prekeys,
)
from app.services.signed_prekey_service import register_signed_prekey
from app.services.key_bundle_service import get_device_key_bundle


router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_new_device(
    payload: DeviceRegisterRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        device = await register_device(
            user_id=current_user["id"],
            payload=payload,
        )

        return {
            "success": True,
            "message": "Device registered successfully",
            "device": device,
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to register device",
        )


@router.get("/")
async def list_my_devices(
    current_user: dict = Depends(get_current_user),
):
    devices = await get_user_devices(current_user["id"])

    return {
        "success": True,
        "message": "Devices retrieved successfully",
        "total": len(devices),
        "devices": devices,
    }


@router.delete("/{device_id}")
async def revoke_my_device(
    device_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        revoked = await revoke_device(
            current_user["id"],
            device_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not revoked:
        raise HTTPException(
            status_code=404,
            detail="Device not found or already revoked",
        )

    return {
        "success": True,
        "message": "Device revoked successfully",
    }


@router.post("/{device_id}/signed-prekeys", status_code=201)
async def register_device_signed_prekey(
    device_id: str,
    payload: SignedPrekeyRegisterRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await register_signed_prekey(
            user_id=current_user["id"],
            device_id=device_id,
            payload=payload,
        )

        return {
            "success": True,
            "message": "Signed prekey registered successfully",
            "data": result,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{device_id}/one-time-prekeys", status_code=201)
async def upload_one_time_prekeys(
    device_id: str,
    payload: OneTimePrekeyBatchRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await register_one_time_prekeys(
            user_id=current_user["id"],
            device_id=device_id,
            payload=payload,
        )

        return {
            "success": True,
            "message": "One-time prekeys uploaded successfully",
            "data": result,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{device_id}/one-time-prekeys/claim")
async def claim_device_one_time_prekey(
    device_id: str,
    payload: OneTimePrekeyClaimRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await claim_one_time_prekey(
            user_id=current_user["id"],
            recipient_device_id=device_id,
            requesting_device_id=str(payload.requesting_device_id),
        )

        return {
            "success": True,
            "message": (
                "One-time prekey claimed successfully"
                if result else "No available one-time prekeys"
            ),
            "data": result,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{device_id}/key-bundle")
async def fetch_device_key_bundle(
    device_id: str,
    payload: OneTimePrekeyClaimRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        bundle = await get_device_key_bundle(
            user_id=current_user["id"],
            recipient_device_id=device_id,
            requesting_device_id=str(payload.requesting_device_id),
        )

        return {
            "success": True,
            "message": "Key bundle retrieved successfully",
            "data": bundle,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
