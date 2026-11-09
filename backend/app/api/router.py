
from fastapi import APIRouter
from app.core.responses import success_response

api_router = APIRouter()
from app.api.conversations import router as conversations_router
api_router.include_router(conversations_router)

from app.api.routes.auth import router as auth_router
from app.api.profile import router as profile_router

api_router.include_router(profile_router)

from app.api.privacy import router as privacy_router

api_router.include_router(privacy_router)

from app.api.devices import router as devices_router

api_router.include_router(devices_router)

@api_router.get("/status")
async def api_status():
    return success_response(
        data={
            "version": "1.0.0",
            "service": "MiChat API"
        },
        message="API is operational"
    )


api_router.include_router(auth_router)
