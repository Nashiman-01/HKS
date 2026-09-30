import json

from pydantic import BaseModel, Field

from app.services.ai_service import generate_response


class ResearchResult(BaseModel):
    research_questions: list[str] = Field(default_factory=list)
    source_types: list[str] = Field(default_factory=list)
    priority_jurisdictions: list[str] = Field(default_factory=list)
    evidence_needed: list[str] = Field(default_factory=list)
    laws_to_check: list[str] = Field(default_factory=list)


def create_research_plan(
    intake_data: dict,
    classification_data: dict,
) -> ResearchResult:

    prompt = f"""
You are the Research Agent for Apna Wakeel.

Apna Wakeel is a Pakistan-focused legal information and navigation
system.

Your job is to create a research plan based on the user's intake
information and case classification.

You are NOT responsible for giving the final legal answer.

Do NOT:
- give legal advice
- make legal conclusions
- invent laws
- invent legal sources
- claim that a source says something unless actual source evidence
  has been provided
- fabricate URLs

Your job is to determine:

1. research_questions
2. source_types
3. priority_jurisdictions
4. evidence_needed
5. laws_to_check

Research questions should describe what needs to be verified.

Source types should identify appropriate authoritative sources,
for example:

- Pakistan federal legislation
- Khyber Pakhtunkhwa legislation
- KP government department
- district government
- police authority
- court judgment
- court rules
- NADRA
- revenue department
- local government
- official government procedure

Priority jurisdictions should identify the relevant geographic or
legal level.

Evidence_needed should describe the specific facts or legal
information required before a reliable answer can be produced.

Laws_to_check should contain only plausible statute or constitutional
document names to search in official government catalogs. Do not cite
sections or claim that a law applies; retrieval and verification happen later.

IMPORTANT:

Do not provide the final legal answer.

Do not invent a source.

Return ONLY valid JSON.

Required JSON structure:

{{
    "research_questions": [],
    "source_types": [],
    "priority_jurisdictions": [],
    "evidence_needed": [],
    "laws_to_check": []
}}

INTAKE INFORMATION:

{json.dumps(intake_data, indent=2)}

CLASSIFICATION INFORMATION:

{json.dumps(classification_data, indent=2)}
"""

    raw_response = generate_response(prompt)

    try:
        data = json.loads(raw_response)
        data["research_questions"] = data.get("research_questions", [])[:3]
        return ResearchResult(**data)

    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(
            f"Research Agent returned invalid data: {e}"
        )