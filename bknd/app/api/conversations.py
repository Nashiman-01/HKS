from fastapi import APIRouter, Depends, HTTPException
from groq import RateLimitError
from pydantic import BaseModel, field_validator
from sqlalchemy import text

from app.api.dependencies import get_authenticated_user
from app.database.connection import engine
from app.agents.orchestrator import process_case


router = APIRouter(
    prefix="/api/conversations",
    tags=["Conversations"],
)


def format_case_response(pipeline_result: dict) -> str:
    if pipeline_result.get("status") == "needs_description":
        return "Please briefly describe what happened and where. Share what outcome you need; you can leave out details you do not know."

    intake = pipeline_result.get("intake", {})
    response = pipeline_result.get("response", {})
    sections = []

    case_summary = intake.get("problem_summary")
    if case_summary:
        sections.append(f"Case summary:\n{case_summary}")

    answer = response.get("answer")
    if answer:
        sections.append(f"What we can tell you now:\n{answer}")

    next_steps = response.get("next_steps") or [
        "Keep relevant messages, documents, photos, and dates together.",
        "For advice specific to your situation, consult a qualified lawyer or the relevant local authority.",
    ]
    todo_list = "\n".join(f"{index}. {step}" for index, step in enumerate(next_steps, 1))
    sections.append(f"Your to-do list:\n{todo_list}")

    documents_needed = response.get("documents_needed") or []
    if documents_needed:
        documents = "\n".join(f"- {item}" for item in documents_needed)
        sections.append(f"Keep these documents or details ready:\n{documents}")

    questions = (pipeline_result.get("follow_up", {}).get("questions") or [])[:3]
    if questions:
        optional_questions = "\n".join(
            f"{index}. {question}"
            for index, question in enumerate(questions, 1)
        )
        sections.append(
            "Optional details you can share (answer any you know, or skip these):\n"
            f"{optional_questions}"
        )

    uncertainty = response.get("uncertainty") or []
    if uncertainty:
        sections.append("What the available sources do not specify:\n" + "\n".join(f"- {item}" for item in uncertainty))

    legal_references = []
    seen_references = set()
    for item in pipeline_result.get("evidence", []):
        if item.get("source_type") != "legislation":
            continue
        reference = item.get("citation") or item.get("source_title")
        source_url = item.get("source_url")
        if not reference or not source_url:
            continue
        key = (reference, source_url)
        if key in seen_references:
            continue
        seen_references.add(key)
        status = f" [{item['official_status']}]" if item.get("official_status") else ""
        legal_references.append(f"- {reference}{status}\n  {source_url}")

    if legal_references:
        sections.append("Official legal references:\n" + "\n".join(legal_references[:8]))
    if any(item.get("official_status") == "Under Review" for item in pipeline_result.get("evidence", [])):
        sections.append("The Pakistan Code marks at least one consolidated text as under review; check the relevant Gazette notification for later amendments.")

    disclaimer = response.get("disclaimer")
    if disclaimer:
        normalized_disclaimer = str(disclaimer).lower()
        boilerplate = ("not a lawyer", "not legal advice", "not a substitute for")
        if not any(phrase in normalized_disclaimer for phrase in boilerplate):
            sections.append(str(disclaimer))

    return "\n\n".join(sections) or "I could not prepare a response from the available information. Please try again."


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
        INSERT INTO conversations (
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
        FROM conversations
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
        FROM conversations
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
def create_message(
    conversation_id: str,
    data: CreateMessageRequest,
    user=Depends(get_authenticated_user),
):

    # -----------------------------------------------------
    # 1. Verify conversation ownership
    # -----------------------------------------------------

    conversation_query = text("""
        SELECT id
        FROM conversations
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
        FROM messages
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
        INSERT INTO messages (
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
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
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
        if isinstance(e, RateLimitError):
            raise HTTPException(
                status_code=429,
                detail="The AI service has reached its current usage limit. Please check your Groq quota and try again later.",
            ) from e
        raise HTTPException(
            status_code=500,
            detail="Unable to process the message right now. Please try again.",
        )

    # -----------------------------------------------------
    # 5. Get AI response
    # -----------------------------------------------------

    try:
        ai_response = format_case_response(pipeline_result)
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
        INSERT INTO messages (
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
            UPDATE conversations
            SET updated_at = CURRENT_TIMESTAMP
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
        FROM conversations
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
        FROM messages
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
        DELETE FROM conversations
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