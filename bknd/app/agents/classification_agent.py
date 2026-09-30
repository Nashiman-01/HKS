import json

from pydantic import BaseModel

from app.services.ai_service import generate_response


class ClassificationResult(BaseModel):
    legal_domain: str = "unclear"
    jurisdiction: str = "Unknown"
    locality: str = "unknown"
    matter_type: str = "unclear"
    requires_local_procedure: bool = False
    confidence: str = "low"


def classify_case(intake_data: dict) -> ClassificationResult:
    prompt = f"""
You are the Classification Agent for Apna Wakeel.

Apna Wakeel is a Pakistan-focused legal information and navigation
system.

Your job is to classify the user's case based ONLY on the intake
information provided.

Do NOT:
- give legal advice
- cite laws
- invent facts
- invent legal authorities
- make a final legal conclusion
- assume facts that are not present

Determine:

1. legal_domain
2. jurisdiction
3. locality
4. matter_type
5. requires_local_procedure
6. confidence

Possible legal domains include:

- traffic
- criminal
- civil
- family
- property
- employment
- harassment
- fraud
- identity_documents
- government_services
- other
- unclear

Jurisdiction should identify the relevant level, such as:

- Pakistan
- Khyber Pakhtunkhwa
- Federal
- Unknown

Locality should contain a city/district/area if known.
Otherwise use "unknown".

Possible confidence values:

- high
- medium
- low
- unclear

Set requires_local_procedure to true when the matter may depend on
local government, district, provincial, police, court, or other
location-specific procedures.

Return ONLY valid JSON.

Required JSON structure:

{{
    "legal_domain": "string",
    "jurisdiction": "string",
    "locality": "string",
    "matter_type": "string",
    "requires_local_procedure": true,
    "confidence": "string"
}}

Intake information:

{json.dumps(intake_data, indent=2)}
"""

    raw_response = generate_response(prompt)

    try:
        data = json.loads(raw_response)
        return ClassificationResult(**data)

    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(
            f"Classification Agent returned invalid data: {e}"
        )