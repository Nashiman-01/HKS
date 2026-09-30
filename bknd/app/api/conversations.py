from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import text

from app.api.dependencies import get_authenticated_user
from app.database.connection import engine
from app.agents.orchestrator import process_case


router = APIRouter(
    prefix="/api/conversations",
    tags=["Conversations"],
)


class CreateConversationRequest(BaseModel):
    title: str | None = None


class CreateMessageRequest(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Message content cannot be empty")

        return value


# ---------------------------------------------------------
# CREATE CONVERSATION
# ---------------------------------------------------------

@router.post("")
async def create_conversation(
    data: CreateConversationRequest,
    user=Depends(get_authenticated_user),
):
    query = text("""
        INSERT INTO public.conversations (
            user_id,
            title
        )
        VALUES (
            :user_id,
            :title
        )
        RETURNING
            id,
            user_id,
            title,
            created_at,
            updated_at
    """)

    with engine.begin() as connection:
        result = connection.execute(
            query,
            {
                "user_id": str(user.id),
                "title": data.title,
            },
        )

        conversation = result.mappings().first()

    return {
        "message": "Conversation created successfully",
        "data": dict(conversation),
    }


# ---------------------------------------------------------
# GET USER'S CONVERSATIONS
# ---------------------------------------------------------

@router.get("")
async def get_conversations(
    user=Depends(get_authenticated_user),
):
    query = text("""
        SELECT
            id,
            user_id,
            title,
            created_at,
            updated_at
        FROM public.conversations
        WHERE user_id = :user_id
        ORDER BY updated_at DESC
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "user_id": str(user.id),
            },
        )

        conversations = result.mappings().all()

    return {
        "message": "Conversations retrieved successfully",
        "data": [
            dict(conversation)
            for conversation in conversations
        ],
    }


# ---------------------------------------------------------
# GET SINGLE CONVERSATION
# ---------------------------------------------------------

@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user=Depends(get_authenticated_user),
):
    query = text("""
        SELECT
            id,
            user_id,
            title,
            created_at,
            updated_at
        FROM public.conversations
        WHERE id = :conversation_id
          AND user_id = :user_id
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "conversation_id": conversation_id,
                "user_id": str(user.id),
            },
        )

        conversation = result.mappings().first()

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    return {
        "message": "Conversation retrieved successfully",
        "data": dict(conversation),
    }


# ---------------------------------------------------------
# CREATE MESSAGE + AI RESPONSE
# ---------------------------------------------------------

@router.post("/{conversation_id}/messages")
async def create_message(
    conversation_id: str,
    data: CreateMessageRequest,
    user=Depends(get_authenticated_user),
):

    # -----------------------------------------------------
    # 1. Verify conversation ownership
    # -----------------------------------------------------

    conversation_query = text("""
        SELECT id
        FROM public.conversations
        WHERE id = :conversation_id
          AND user_id = :user_id
    """)

    with engine.connect() as connection:
        conversation_result = connection.execute(
            conversation_query,
            {
                "conversation_id": conversation_id,
                "user_id": str(user.id),
            },
        )

        conversation = conversation_result.mappings().first()

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    # -----------------------------------------------------
    # 2. Get previous conversation messages
    # -----------------------------------------------------

    history_query = text("""
        SELECT
            role,
            content
        FROM public.messages
        WHERE conversation_id = :conversation_id
        ORDER BY created_at ASC
    """)

    with engine.connect() as connection:
        result = connection.execute(
            history_query,
            {
                "conversation_id": conversation_id,
            },
        )

        conversation_history = [
            dict(message)
            for message in result.mappings().all()
        ]

    # -----------------------------------------------------
    # 3. Save user's message
    # -----------------------------------------------------

    user_message_query = text("""
        INSERT INTO public.messages (
            conversation_id,
            role,
            content
        )
        VALUES (
            :conversation_id,
            'user',
            :content
        )
        RETURNING
            id,
            conversation_id,
            role,
            content,
            created_at
    """)

    with engine.begin() as connection:
        result = connection.execute(
            user_message_query,
            {
                "conversation_id": conversation_id,
                "content": data.content,
            },
        )

        user_message = result.mappings().first()

        # Update conversation timestamp
        update_query = text("""
            UPDATE public.conversations
            SET updated_at = now()
            WHERE id = :conversation_id
              AND user_id = :user_id
        """)

        connection.execute(
            update_query,
            {
                "conversation_id": conversation_id,
                "user_id": str(user.id),
            },
        )

    # -----------------------------------------------------
    # 4. Run complete Apna Wakeel pipeline WITH CONTEXT
    # -----------------------------------------------------

    try:
        pipeline_result = process_case(
            data.content,
            conversation_history,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error in process_case: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Unable to process the message right now. Please try again.",
        )

    # -----------------------------------------------------
    # 5. Get AI response
    # -----------------------------------------------------

    try:
        if pipeline_result.get("status") == "needs_follow_up":
            follow_up_questions = pipeline_result.get("follow_up", {}).get("questions", [])
            if follow_up_questions:
                formatted_questions = "\n".join(f"{i+1}. {q}" for i, q in enumerate(follow_up_questions))
                ai_response = f"To help provide accurate legal information for your matter under Pakistani law, could you please clarify:\n\n{formatted_questions}"
            else:
                ai_response = "Could you please share a few more details about where and when this occurred?"
        else:
            ai_response = pipeline_result.get("response", {}).get("answer") or "I have processed your inquiry. Based on Pakistani legal principles, please review the steps and remedies available."
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error formatting AI response: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="The system could not generate a valid response. Please try again.",
        )

    # -----------------------------------------------------
    # 6. Save AI response
    # -----------------------------------------------------

    assistant_message_query = text("""
        INSERT INTO public.messages (
            conversation_id,
            role,
            content
        )
        VALUES (
            :conversation_id,
            'assistant',
            :content
        )
        RETURNING
            id,
            conversation_id,
            role,
            content,
            created_at
    """)

    with engine.begin() as connection:
        result = connection.execute(
            assistant_message_query,
            {
                "conversation_id": conversation_id,
                "content": ai_response,
            },
        )

        assistant_message = result.mappings().first()

        # Update conversation timestamp again
        update_query = text("""
            UPDATE public.conversations
            SET updated_at = now()
            WHERE id = :conversation_id
              AND user_id = :user_id
        """)

        connection.execute(
            update_query,
            {
                "conversation_id": conversation_id,
                "user_id": str(user.id),
            },
        )

    # -----------------------------------------------------
    # 7. Return both messages
    # -----------------------------------------------------

    return {
        "message": "Message processed successfully",
        "user_message": dict(user_message),
        "assistant_message": dict(assistant_message),
    }


# ---------------------------------------------------------
# GET ALL MESSAGES IN A CONVERSATION
# ---------------------------------------------------------

@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    user=Depends(get_authenticated_user),
):

    # First verify conversation ownership
    conversation_query = text("""
        SELECT id
        FROM public.conversations
        WHERE id = :conversation_id
          AND user_id = :user_id
    """)

    with engine.connect() as connection:
        conversation_result = connection.execute(
            conversation_query,
            {
                "conversation_id": conversation_id,
                "user_id": str(user.id),
            },
        )

        conversation = conversation_result.mappings().first()

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    # Get messages
    messages_query = text("""
        SELECT
            id,
            conversation_id,
            role,
            content,
            created_at
        FROM public.messages
        WHERE conversation_id = :conversation_id
        ORDER BY created_at ASC
    """)

    with engine.connect() as connection:
        result = connection.execute(
            messages_query,
            {
                "conversation_id": conversation_id,
            },
        )

        messages = result.mappings().all()

    return {
        "message": "Messages retrieved successfully",
        "data": [
            dict(message)
            for message in messages
        ],
    }


# ---------------------------------------------------------
# DELETE CONVERSATION
# ---------------------------------------------------------

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user=Depends(get_authenticated_user),
):
    query = text("""
        DELETE FROM public.conversations
        WHERE id = :conversation_id
          AND user_id = :user_id
        RETURNING id
    """)

    with engine.begin() as connection:
        result = connection.execute(
            query,
            {
                "conversation_id": conversation_id,
                "user_id": str(user.id),
            },
        )

        deleted_conversation = result.mappings().first()

    if deleted_conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    return {
        "message": "Conversation deleted successfully",
        "conversation_id": str(deleted_conversation["id"]),
    }