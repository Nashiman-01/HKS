import json

from pydantic import BaseModel

from app.services.ai_service import generate_response
from app.legal_sources.evidence import EvidenceItem


class VerificationResult(BaseModel):
    claim: str
    supported: bool
    confidence: str
    reasoning: str
    evidence_used: list[EvidenceItem]
    uncertainty: list[str]


def verify_claim(
    claim: str,
    evidence: list[EvidenceItem],
) -> VerificationResult:

    evidence_data = [
        item.model_dump()
        for item in evidence
        if item.relevant_text
    ]

    prompt = f"""
You are the Verification Agent for Apna Wakeel.

Apna Wakeel is a Pakistan-focused legal information and navigation
system.

Your job is to determine whether a legal claim is actually supported
by the provided evidence.

IMPORTANT RULES:

- Do NOT invent evidence.
- Do NOT assume that a source supports a claim.
- Do NOT use your own general legal knowledge as evidence.
- Only use the evidence explicitly provided below.
- If there is insufficient evidence, mark the claim as unsupported
  or uncertain.
- Do not make a final legal conclusion.
- Do not provide legal advice.
- Clearly identify uncertainty.

Possible confidence values:

- high
- medium
- low
- unclear

Return ONLY valid JSON.

Required structure:

{{
    "claim": "string",
    "supported": true,
    "confidence": "high",
    "reasoning": "string",
    "evidence_used": [],
    "uncertainty": []
}}

CLAIM:

{claim}

EVIDENCE:

{json.dumps(evidence_data, indent=2)}
"""

    raw_response = generate_response(prompt)

    try:
        data = json.loads(raw_response)
        return VerificationResult(**data)

    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(
            f"Verification Agent returned invalid data: {e}"
        )