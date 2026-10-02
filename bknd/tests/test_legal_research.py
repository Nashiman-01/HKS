import json
from unittest.mock import Mock
from unittest.mock import patch

from app.agents import followup_agent, intake_agent, orchestrator, response_agent
from app.agents.orchestrator import process_case
from app.api.conversations import format_case_response
from app.legal_sources.source_registry import get_relevant_sources
from app.legal_sources.statute_retriever import (
    LawRecord,
    _record_matches,
    _section_references,
)
from app.agents.verification_agent import verify_claim
from app.legal_sources.evidence import EvidenceItem
from app.api.legal import normalize_analysis


class Model:
    def __init__(self, data):
        self.data = data

    def model_dump(self):
        return self.data


def test_pakistan_criminal_cases_select_federal_legislation():
    sources = get_relevant_sources("Pakistan", "criminal")

    assert any(source.name == "Pakistan Code" for source in sources)


def test_statute_matching_respects_jurisdiction_and_act_title():
    federal_record = LawRecord(
        "Pakistan Penal Code (PPC), 1860",
        "https://pakistancode.gov.pk/english/law",
        "Federal",
        "pakistancode.gov.pk",
    )
    provincial_record = LawRecord(
        "The Khyber Pakhtunkhwa Police Act, 2017",
        "https://kpcode.kp.gov.pk/homepage/lawDetails/1",
        "Khyber Pakhtunkhwa",
        "kpcode.kp.gov.pk",
    )

    assert _record_matches(federal_record, "Pakistan Penal Code")
    assert _record_matches(provincial_record, "Khyber Pakhtunkhwa Police Act")
    assert not _record_matches(federal_record, "Khyber Pakhtunkhwa Police Act")
    assert _record_matches(federal_record, "Pakistan Penal Code, 1860")
    old_motor_vehicles_act = LawRecord(
        "Motor Vehicles Act, 1939",
        "https://pakistancode.gov.pk/english/old-act",
        "Federal",
        "pakistancode.gov.pk",
    )
    assert not _record_matches(old_motor_vehicles_act, "Motor Vehicles Act, 1999")


def test_verifier_citations_are_mapped_to_retrieved_sources():
    source = EvidenceItem(
        source_name="Pakistan Code",
        source_url="https://pakistancode.gov.pk/law.pdf",
        source_title="Code of Criminal Procedure",
        jurisdiction="Federal",
        source_type="legislation",
        relevant_text="Information in cognizable cases",
        citation="CrPC section 154",
    )
    model_response = {
        "claim": "FIR procedure",
        "supported": True,
        "confidence": "high",
        "reasoning": "The retrieved provision addresses cognizable cases.",
        "evidence_used": ["Code of Criminal Procedure, CrPC section 154"],
        "uncertainty": [],
    }

    with patch(
        "app.agents.verification_agent.generate_response",
        return_value=json.dumps(model_response),
    ):
        result = verify_claim("FIR procedure", [source])

    assert result.evidence_used == [source]


def test_section_references_select_theft_and_fir_provisions():
    page_text = """138. Procedure where he claims jury
149. Police to prevent cognizable offences
154. Information in cognizable cases
364A. Kidnapping or abducting a person under fourteen
378. Theft
379. Punishment for theft
"""

    references = _section_references(
        page_text,
        ["reporting a cognizable theft to police and FIR procedure", "theft of a motorcycle"],
    )

    assert any(reference.startswith("section 154") for reference in references)
    assert any(reference.startswith("section 378") for reference in references)
    assert not any(reference.startswith("section 138") for reference in references)
    assert not any(reference.startswith("section 364A") for reference in references)


def test_chat_response_displays_law_citation_and_review_status():
    text = format_case_response({
        "intake": {"problem_summary": "A motorcycle was stolen."},
        "response": {
            "answer": "The relevant theft provision is identified below.",
            "next_steps": ["File a police report."],
            "documents_needed": [],
            "uncertainty": [],
            "disclaimer": "",
        },
        "evidence": [{
            "source_type": "legislation",
            "citation": "Pakistan Penal Code, section 378 (Theft), page 68",
            "source_url": "https://pakistancode.gov.pk/pdffiles/example.pdf",
            "official_status": "Under Review",
        }],
    })

    assert "Your to-do list:" in text
    assert "section 378" in text
    assert "https://pakistancode.gov.pk/pdffiles/example.pdf" in text
    assert "under review" in text.lower()


def test_chat_response_uses_localized_labels():
    labels = {
        "caseSummary": "Muamlay ka khulasa",
        "currentGuidance": "Filhal hum yeh bata sakte hain",
        "nextSteps": "Aap ke aglay qadam",
        "needDescription": "Mukhtasaran batayein kya hua.",
    }
    text = format_case_response({
        "intake": {"problem_summary": "Maslay ka khulasa"},
        "response": {
            "answer": "Roman Urdu mein jawab.",
            "next_steps": ["Mutaliqa daftar se rabta karein."],
            "documents_needed": [],
            "uncertainty": [],
            "disclaimer": "",
        },
        "evidence": [],
    }, labels)

    assert "Muamlay ka khulasa:" in text
    assert "Filhal hum yeh bata sakte hain:" in text
    assert "Aap ke aglay qadam:" in text
    assert "Case summary:" not in text
    assert format_case_response({"status": "needs_description"}, labels) == "Mukhtasaran batayein kya hua."


def test_roman_urdu_analysis_fallback_uses_roman_urdu_time_units():
    result = normalize_analysis({}, "A property issue", "Punjab", "roman_urdu")

    assert [step["time"] for step in result["timeline"]] == [
        "1 se 3 din",
        "1 se 2 haftay",
        "1 se 3 mahinay",
    ]


def test_chat_agents_request_natural_roman_urdu(monkeypatch):
    prompts = []

    def fake_response(prompt):
        prompts.append(prompt)
        return "{}"

    monkeypatch.setattr(intake_agent, "generate_response", fake_response)
    monkeypatch.setattr(followup_agent, "generate_response", fake_response)
    monkeypatch.setattr(response_agent, "generate_response", fake_response)

    intake_agent.intake_case("Mera masla", language="roman_urdu")
    followup_agent.generate_follow_up_questions(
        user_message="Mera masla",
        intake_data={},
        classification_data={},
        language="roman_urdu",
    )
    response_agent.generate_final_response(
        user_message="Mera masla",
        intake_data={},
        classification_data={},
        evidence=[],
        verification_results=[],
        language="roman_urdu",
    )

    assert len(prompts) == 3
    assert all("natural Pakistani Roman Urdu using Latin letters only" in prompt for prompt in prompts)
    assert all("Do not use Urdu script" in prompt for prompt in prompts)


def test_final_response_prompt_connects_user_facts_to_retrieved_law(monkeypatch):
    prompts = []
    monkeypatch.setattr(
        response_agent,
        "generate_response",
        lambda prompt: prompts.append(prompt) or json.dumps({"answer": "Explanation."}),
    )

    response_agent.generate_final_response(
        user_message="My landlord changed the locks while my belongings were inside.",
        intake_data={"problem_summary": "A tenant was locked out of a rented home."},
        classification_data={"jurisdiction": "Pakistan"},
        evidence=[],
        verification_results=[],
    )

    assert "Begin the answer by briefly restating the user's situation" in prompts[0]
    assert "connect its verified rule to the stated facts" in prompts[0]
    assert "say what is uncertain and what information is needed" in prompts[0]


def test_greeting_gets_short_case_description_prompt():
    assert process_case("hi") == {"status": "needs_description"}
    assert "describe what happened" in format_case_response({"status": "needs_description"})


def test_criminal_pipeline_adds_federal_and_kp_law_candidates(monkeypatch):
    intake = Model({"problem_summary": "A motorcycle theft.", "facts": []})
    intake.problem_summary = "A motorcycle theft."
    intake.category = "property"
    intake.facts = []
    classification = Model({
        "legal_domain": "property",
        "matter_type": "theft",
        "jurisdiction": "Khyber Pakhtunkhwa",
        "locality": "Chitral",
    })
    classification.legal_domain = "property"
    classification.matter_type = "theft"
    classification.jurisdiction = "Khyber Pakhtunkhwa"
    classification.locality = "Chitral"
    follow_up = Model({"needs_follow_up": False, "questions": [], "reason": ""})
    research = Model({
        "research_questions": ["theft law"],
        "evidence_needed": [],
        "laws_to_check": [],
    })
    research.research_questions = research.data["research_questions"]
    research.evidence_needed = research.data["evidence_needed"]
    research.laws_to_check = research.data["laws_to_check"]
    final = Model({"answer": "Sourced answer."})
    statute_lookup = Mock(return_value=[])

    monkeypatch.setattr(orchestrator, "intake_case", lambda _, **__: intake)
    monkeypatch.setattr(orchestrator, "classify_case", lambda _: classification)
    monkeypatch.setattr(orchestrator, "generate_follow_up_questions", lambda **_: follow_up)
    monkeypatch.setattr(orchestrator, "create_research_plan", lambda *_: research)
    monkeypatch.setattr(orchestrator, "get_relevant_sources", lambda *_: [])
    monkeypatch.setattr(orchestrator, "collect_evidence", lambda *_: [])
    monkeypatch.setattr(orchestrator, "collect_statute_evidence", statute_lookup)
    monkeypatch.setattr(orchestrator, "verify_claim", lambda claim, _: Model({"claim": claim}))
    monkeypatch.setattr(orchestrator, "generate_final_response", lambda **_: final)

    result = process_case("A motorcycle was stolen in Chitral.")
    law_names = statute_lookup.call_args.args[0]

    assert result["status"] == "evidence_unavailable"
    assert "Pakistan Penal Code, 1860" in law_names
    assert "Code of Criminal Procedure, 1898" in law_names
    assert "Khyber Pakhtunkhwa Police Act" in law_names