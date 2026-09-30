import json
import re

from groq import RateLimitError
from pydantic import BaseModel, Field

from app.services.ai_service import generate_response
from app.legal_sources.evidence import EvidenceItem


class VerificationResult(BaseModel):
    claim: str
    supported: bool = False
    confidence: str = "unclear"
    reasoning: str = "The available response did not include a verification rationale."
    evidence_used: list[EvidenceItem] = Field(default_factory=list)
    uncertainty: list[str] = Field(default_factory=list)


def _verification_evidence(claim: str, evidence: list[EvidenceItem]) -> list[dict]:
    query_words = {
        word for word in re.findall(r"[a-z0-9]{4,}", claim.lower())
    }
    ranked = []

    for item in evidence:
        text_words = set(re.findall(r"[a-z0-9]{4,}", item.relevant_text.lower()))
        overlap = len(query_words & text_words)
        score = overlap * 10 + (item.retrieval_score or 0)
        if score:
            ranked.append((score, item))

    ranked.sort(key=lambda pair: pair[0], reverse=True)
    selected = []
    for _, item in ranked[:3]:
        evidence_data = item.model_dump()
        text = item.relevant_text
        section_numbers = re.findall(r"section\s+(\d+[A-Za-z]?)", item.citation or "", re.IGNORECASE)
        section_start = next(
            (
                match.start()
                for number in section_numbers
                for match in [re.search(rf"(?<!\w){re.escape(number)}\.", text)]
                if match
            ),
            None,
        )
        if section_start is not None:
            start = max(0, section_start - 120)
            evidence_data["relevant_text"] = text[start:start + 1800]
        else:
            evidence_data["relevant_text"] = text[:1800]
        selected.append(evidence_data)

    return selected


def verify_claim(
    claim: str,
    evidence: list[EvidenceItem],
) -> VerificationResult:

    evidence_data = _verification_evidence(claim, evidence)

    prompt = f"""
You are the Verification Agent for Apna Wakeel.

Apna Wakeel is a Pakistan-focused legal information and navigation
system.

Your job is to determine whether a legal claim is actually supported
by the provided evidence.

IMPORTANT RULES:

  or uncertain.

Possible confidence values:


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

    try:
        raw_response = generate_response(prompt)
    except RateLimitError:
        return VerificationResult(
            claim=claim,
            supported=False,
            confidence="unclear",
            reasoning="Automatic verification was rate-limited and could not be completed.",
            uncertainty=["This claim has not been automatically verified against the retrieved sources."],
        )

    try:
        data = json.loads(raw_response)
        data.setdefault("claim", claim)
        returned_sources = data.get("evidence_used") or []
        if not isinstance(returned_sources, list):
            returned_sources = []
        matched_sources = []
        for returned_source in returned_sources:
            reference = (
                returned_source
                if isinstance(returned_source, str)
                else json.dumps(returned_source, ensure_ascii=False)
            ).lower()
            for item in evidence:
                trusted_references = (
                    item.source_name,
                    item.source_title,
                    item.source_url,
                    item.citation or "",
                )
                if any(value and value.lower() in reference for value in trusted_references):
                    if item not in matched_sources:
                        matched_sources.append(item)
        data["evidence_used"] = matched_sources
        if returned_sources and not matched_sources:
            data["supported"] = False
            data["confidence"] = "unclear"
            uncertainty = data.get("uncertainty")
            if not isinstance(uncertainty, list):
                uncertainty = []
            uncertainty.append("The model's cited evidence could not be matched to a retrieved official source.")
            data["uncertainty"] = uncertainty
        return VerificationResult(**data)

    except (json.JSONDecodeError, ValueError) as e:
        raise ValueError(
            f"Verification Agent returned invalid data: {e}"
        )