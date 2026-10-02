import asyncio

import pytest
from fastapi import HTTPException

from app.api import legal


def test_public_analysis_limits_result_when_no_official_evidence(monkeypatch):
    monkeypatch.setattr(legal, "process_case", lambda *args, **kwargs: {
        "intake": {"problem_summary": "A contract dispute."},
        "classification": {"legal_domain": "civil", "matter_type": "contract", "jurisdiction": "Pakistan", "locality": "unknown"},
        "response": {"answer": "Unsupported generated legal claim", "authorities": ["Made-up court"]},
        "evidence": [],
    })

    result = asyncio.run(legal.analyze_problem(legal.AnalyzeRequest(problem="A contract dispute")))

    assert result["sourceStatus"] == "none"
    assert result["sources"] == []
    assert result["authority"] is None
    assert "Official legal-source evidence could not be retrieved" in result["explanation"][0]
    assert "Unsupported generated legal claim" not in result["explanation"][0]


def test_public_analysis_only_returns_official_retrieved_sources(monkeypatch):
    monkeypatch.setattr(legal, "process_case", lambda *args, **kwargs: {
        "intake": {"problem_summary": "A contract dispute."},
        "classification": {"legal_domain": "civil", "matter_type": "contract", "jurisdiction": "Pakistan", "locality": "unknown"},
        "response": {"answer": "Evidence-based explanation.", "authorities": ["Authority in retrieved evidence"]},
        "evidence": [
            {"source_name": "Pakistan Code", "source_url": "https://pakistancode.gov.pk/law.pdf", "source_title": "Contract Act", "source_type": "legislation", "relevant_text": "Official text."},
            {"source_name": "Unknown", "source_url": "https://example.org/fake", "source_title": "Fabricated source", "source_type": "law", "relevant_text": "Untrusted."},
        ],
    })

    result = asyncio.run(legal.analyze_problem(legal.AnalyzeRequest(problem="A contract dispute")))

    assert result["sourceStatus"] == "retrieved"
    assert len(result["sources"]) == 1
    assert result["sources"][0]["url"] == "https://pakistancode.gov.pk/law.pdf"
    assert result["sources"][0]["status"] == "unverified"
    assert result["authority"]["name"] == "Authority in retrieved evidence"


def test_public_analysis_does_not_fall_back_after_ai_failure(monkeypatch):
    monkeypatch.setattr(legal, "process_case", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("private provider detail")))

    with pytest.raises(HTTPException) as caught:
        asyncio.run(legal.analyze_problem(legal.AnalyzeRequest(problem="A contract dispute")))

    assert caught.value.status_code == 503
    assert caught.value.detail == "legal.aiUnavailable"
