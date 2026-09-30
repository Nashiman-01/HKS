import json

from pydantic import BaseModel

from app.services.ai_service import generate_response


class FollowUpResult(BaseModel):
    needs_follow_up: bool
    questions: list[str]
    reason: str


def generate_follow_up_questions(
    user_message: str,
    intake_data: dict,
    classification_data: dict,
) -> FollowUpResult:

    prompt = f"""
You are the Follow-up Agent for Apna Wakeel.

Apna Wakeel is a Pakistan-focused legal information and navigation
system.

Your job is to determine whether important information is missing
from the user's case before the system continues with legal
information research.

IMPORTANT RULES:

1. Use ONLY the information provided by the user and the structured
   intake/classification data.
2. Do NOT invent facts.
3. Do NOT give legal advice.
4. Do NOT cite laws.
5. Do NOT make legal conclusions.
6. Do NOT ask questions about information that is already provided.
7. Ask only questions that are relevant to understanding the case.
8. Keep questions simple and easy for a normal user to understand.
9. Ask a maximum of 5 questions.
10. If enough information is available, set needs_follow_up to false
    and return an empty questions list.
11. If important information is missing, set needs_follow_up to true.
12. Return ONLY valid JSON.

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

INTAKE INFORMATION:
{json.dumps(intake_data, indent=2)}

CLASSIFICATION INFORMATION:
{json.dumps(classification_data, indent=2)}
"""

    raw_response = generate_response(prompt)

    try:
        data = json.loads(raw_response)
        return FollowUpResult(**data)

    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(
            f"Follow-up Agent returned invalid data: {e}"
        )