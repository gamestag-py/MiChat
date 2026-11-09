
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.schemas.conversation import (
    ConversationCreateRequest,
)
from app.services.conversation_service import create_conversation


router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"],
)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_conversation(
    request: ConversationCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await create_conversation(
            creator_user_id=current_user["id"],
            participant_user_ids=request.participant_user_ids,
            conversation_type=request.conversation_type,
        )

        return {
            "success": True,
            "message": (
                "Conversation created successfully"
                if result["created"]
                else "Existing conversation found"
            ),
            "data": result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


from fastapi import Query
from app.services.conversation_service import list_conversations

@router.get("/")
async def get_my_conversations(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    result = await list_conversations(
        user_id=current_user["id"],
        limit=limit,
        offset=offset,
    )

    return {
        "success": True,
        "message": "Conversations retrieved successfully",
        "data": result,
    }

from app.services.conversation_service import get_conversation

@router.get("/{conversation_id}")
async def get_conversation_details(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = await get_conversation(
        conversation_id=conversation_id,
        user_id=current_user["id"],
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    return {
        "success": True,
        "message": "Conversation retrieved successfully",
        "data": result,
    }