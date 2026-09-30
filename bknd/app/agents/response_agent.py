import json

from pydantic import BaseModel

from app.services.ai_service import generate_response
from app.legal_sources.evidence import EvidenceItem


class FinalResponse(BaseModel):
    answer: str
    next_steps: list[str]
    documents_needed: list[str]
    authorities: list[str]
    sources: list[EvidenceItem]
    uncertainty: list[str]
    disclaimer: str


def generate_final_response(
    user_message: str,
    intake_data: dict,
    classification_data: dict,
    evidence: list[EvidenceItem],
    verification_results: list[dict],
) -> FinalResponse:

    evidence_data = [
        item.model_dump()
        for item in evidence
    ]

    prompt = f"""
You are the Final Response Agent for Apna Wakeel.

Apna Wakeel is a Pakistan-focused legal information and navigation
system.

Your job is to produce a clear, simple and evidence-based response
for the user.

IMPORTANT RULES:

1. Use ONLY the evidence provided below for legal factual claims.
2. Do NOT invent laws, sections, procedures, authorities, documents,
   deadlines or penalties.
3. Do NOT use your general legal knowledge as evidence.
4. If evidence is missing, say that the information could not be
   verified from the available sources.
5. Do NOT pretend that an unsupported claim is verified.
6. Clearly communicate uncertainty.
7. Do not guarantee a legal outcome.
8. Do not present yourself as a lawyer.
9. Use simple language and avoid unnecessary legal jargon.
10. Separate verified information from uncertainty.
11. Do not fabricate URLs or sources.
12. Only list authorities and sources that appear in the supplied
    evidence.

The response should help the user understand:
- what their issue appears to be
- what information is supported
- what they can do next
- what documents may be relevant
- which authority/source is relevant
- what remains uncertain

Return ONLY valid JSON.

Required structure:

{{
    "answer": "string",
    "next_steps": [],
    "documents_needed": [],
    "authorities": [],
    "sources": [],
    "uncertainty": [],
    "disclaimer": "string"
}}

USER MESSAGE:
{user_message}

INTAKE:
{json.dumps(intake_data, indent=2)}

CLASSIFICATION:
{json.dumps(classification_data, indent=2)}

EVIDENCE:
{json.dumps(evidence_data, indent=2)}

VERIFICATION RESULTS:
{json.dumps(verification_results, indent=2)}
"""

    raw_response = generate_response(prompt)

    try:
        data = json.loads(raw_response)
        return FinalResponse(**data)

    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(
            f"Final Response Agent returned invalid data: {e}"
        )