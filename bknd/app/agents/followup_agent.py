import json

from pydantic import BaseModel, Field

from app.services.ai_service import generate_response


class FollowUpResult(BaseModel):
    needs_follow_up: bool = False
    questions: list[str] = Field(default_factory=list)
    reason: str = ""


def generate_follow_up_questions(
    user_message: str,
    intake_data: dict,
    classification_data: dict,
    conversation_history: list[dict] | None = None,
    language: str = "en",
) -> FollowUpResult:
    recent_history = conversation_history or []
    history_text = "\n".join(
        f"{message.get('role', 'unknown')}: {str(message.get('content', ''))[:800]}"
        for message in recent_history[-8:]
    )
    language_instruction = {
        "en": "Write every question and the reason in English.",
        "ur": "Write every question and the reason in Urdu script.",
        "roman_urdu": "Write every question and the reason in natural Pakistani Roman Urdu using Latin letters only. Do not use Urdu script.",
    }.get(language, "Write every question and the reason in English.")

    prompt = f"""
You are the Follow-up Agent for Apna Wakeel.

Apna Wakeel is a Pakistan-focused legal information and navigation
system.

Your job is to determine whether important information is missing
from the user's case before the system continues with legal
information research.

IMPORTANT RULES:

0. {language_instruction}
1. Use ONLY the information provided by the user and the structured
   intake/classification data.
2. Do NOT invent facts.
3. Do NOT give legal advice.
4. Do NOT cite laws.
5. Do NOT make legal conclusions.
6. Do NOT ask questions about information that is already provided.
7. Ask only questions that are relevant to understanding the case.
8. Keep questions simple and easy for a normal user to understand.
9. Ask a maximum of 3 questions, and only ask for details that could change the guidance.
10. If enough information is available, set needs_follow_up to false
    and return an empty questions list.
11. If important information is missing, set needs_follow_up to true.
12. Do not repeat questions already asked or answered in the conversation.
13. If the user is asking what to do next, provide the best available
    guidance instead of blocking on more details.
14. Return ONLY valid JSON.

Examples of useful missing information may include:
- location
- date or approximate time
- people involved
- injuries
- documents available
- whether a complaint/report was already made
- whether there is a disagreement or dispute
- what outcome the user is seeking

Do NOT automatically ask for all of these.
Only ask questions that are relevant to this particular case.

Required JSON structure:

{{
    "needs_follow_up": true,
    "questions": [
        "Question 1",
        "Question 2"
    ],
    "reason": "Brief explanation of why these questions are needed."
}}

USER MESSAGE:
{user_message}

RECENT CONVERSATION:
{history_text or "No earlier messages."}

INTAKE INFORMATION:
{json.dumps(intake_data, indent=2)}

CLASSIFICATION INFORMATION:
{json.dumps(classification_data, indent=2)}
"""

    raw_response = generate_response(prompt)

    try:
        data = json.loads(raw_response)
        data.setdefault("needs_follow_up", bool(data.get("questions")))
        return FollowUpResult(**data)

    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(
            f"Follow-up Agent returned invalid data: {e}"
        )