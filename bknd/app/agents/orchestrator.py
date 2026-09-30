from concurrent.futures import ThreadPoolExecutor

from app.agents.intake_agent import intake_case
from app.agents.classification_agent import classify_case
from app.agents.research_agent import create_research_plan
from app.agents.response_agent import generate_final_response
from app.agents.verification_agent import verify_claim
from app.agents.followup_agent import generate_follow_up_questions

from app.legal_sources.source_registry import get_relevant_sources
from app.legal_sources.evidence_retriever import collect_evidence
from app.legal_sources.statute_retriever import collect_statute_evidence


def process_case(
    user_message: str,
    conversation_history: list[dict] | None = None,
) -> dict:

    # -----------------------------------------------------
    # 0. Prepare conversation context
    # -----------------------------------------------------

    conversation_history = conversation_history or []
    greeting = user_message.strip().lower().rstrip(".!?")
    if not conversation_history and greeting in {
        "hi",
        "hello",
        "hey",
        "salam",
        "assalamualaikum",
        "assalamu alaikum",
        "good morning",
        "good evening",
    }:
        return {"status": "needs_description"}

    if conversation_history:
        history_text = "\n".join(
            f"{message['role']}: {message['content']}"
            for message in conversation_history
        )

        intake_input = f"""
Previous conversation:

{history_text}

Current user message:

{user_message}
"""
    else:
        intake_input = user_message

    # -----------------------------------------------------
    # 1. Understand the user's situation
    # -----------------------------------------------------

    intake = intake_case(intake_input)

    # -----------------------------------------------------
    # 2. Classify the case
    # -----------------------------------------------------

    classification = classify_case(
        intake.model_dump()
    )

    # -----------------------------------------------------
    # 3. Check for missing information
    # -----------------------------------------------------

    intake_data = intake.model_dump()
    classification_data = classification.model_dump()
    with ThreadPoolExecutor(max_workers=2) as executor:
        follow_up_future = executor.submit(
            generate_follow_up_questions,
            user_message=user_message,
            intake_data=intake_data,
            classification_data=classification_data,
            conversation_history=conversation_history,
        )
        research_future = executor.submit(
            create_research_plan,
            intake_data,
            classification_data,
        )
        follow_up = follow_up_future.result()
        research = research_future.result()

    follow_up_data = follow_up.model_dump()
    previous_clarification_markers = (
        "could you please clarify:",
        "optional details you can share",
    )
    clarification_already_offered = any(
        message.get("role") == "assistant"
        and any(
            marker in str(message.get("content", "")).lower()
            for marker in previous_clarification_markers
        )
        for message in conversation_history
    )
    if clarification_already_offered:
        follow_up_data["questions"] = []
    else:
        follow_up_data["questions"] = follow_up_data["questions"][:3]

    # -----------------------------------------------------
    # 5. Create research plan
    # -----------------------------------------------------

    # -----------------------------------------------------
    # 6. Select relevant registered sources
    # -----------------------------------------------------

    sources = get_relevant_sources(
        classification.jurisdiction,
        classification.legal_domain,
    )

    # -----------------------------------------------------
    # 7. Retrieve evidence
    # -----------------------------------------------------

    non_legislation_sources = [
        source for source in sources if source.source_type != "legislation"
    ]
    law_names = []
    case_domain = classification.legal_domain.lower()
    location_context = f"{classification.jurisdiction} {classification.locality}".lower()
    case_context = " ".join([
        user_message,
        intake.problem_summary,
        intake.category,
        classification.matter_type,
        case_domain,
        " ".join(intake.facts),
    ]).lower()
    involves_offence = any(
        term in case_context
        for term in ("theft", "stolen", "robbery", "criminal", "offence", "fir", "police report")
    )
    if involves_offence:
        law_names.extend(["Pakistan Penal Code, 1860", "Code of Criminal Procedure, 1898"])
        if "khyber" in location_context or "chitral" in location_context:
            law_names.extend([
                "Khyber Pakhtunkhwa Criminal Procedure Code",
                "Khyber Pakhtunkhwa Police Act",
            ])
        law_names.extend(
            law_name
            for law_name in research.laws_to_check
            if any(
                term in law_name.lower()
                for term in ("penal code", "criminal procedure", "police act", "constitution")
            )
        )
    else:
        law_names.extend(research.laws_to_check)
    constitutional_context = " ".join(
        [user_message, *research.research_questions, *research.evidence_needed]
    ).lower()
    if any(term in constitutional_context for term in ("constitution", "fundamental right", "constitutional")):
        law_names.append("Constitution of the Islamic Republic of Pakistan")
    law_names = list(dict.fromkeys(law_names))
    statute_questions = list(research.research_questions)
    if involves_offence:
        statute_questions.extend([
            "Definition of theft of movable property under section 378 of the Pakistan Penal Code",
            "Theft of a car or other motor vehicle under section 381A of the Pakistan Penal Code",
            "Filing an FIR for a cognizable theft under section 154 of the Code of Criminal Procedure",
            "Police investigation of a cognizable theft under section 156 of the Code of Criminal Procedure",
        ])
    statute_questions = list(dict.fromkeys(statute_questions))

    with ThreadPoolExecutor(max_workers=2) as executor:
        general_evidence_future = executor.submit(
            collect_evidence,
            non_legislation_sources,
            research.research_questions,
        )
        statute_evidence_future = executor.submit(
            collect_statute_evidence,
            law_names,
            statute_questions,
            f"{classification.jurisdiction} {classification.locality}",
        )
        evidence = general_evidence_future.result()
        evidence.extend(statute_evidence_future.result())

    # -----------------------------------------------------
    # 8. Verify claims/questions against available evidence
    # -----------------------------------------------------

    with ThreadPoolExecutor(max_workers=min(3, max(1, len(research.research_questions)))) as executor:
        verification_results = [
            result.model_dump()
            for result in executor.map(
                lambda question: verify_claim(question, evidence),
                research.research_questions,
            )
        ]

    # -----------------------------------------------------
    # 9. Generate final user-facing response
    # -----------------------------------------------------

    final_response = generate_final_response(
        user_message=user_message,
        intake_data=intake_data,
        classification_data=classification_data,
        evidence=evidence,
        verification_results=verification_results,
    )

    # -----------------------------------------------------
    # 10. Return complete pipeline result
    # -----------------------------------------------------

    return {
        "intake": intake.model_dump(),

        "classification": classification.model_dump(),

            "follow_up": follow_up_data,

        "research": research.model_dump(),

        "sources": [
            {
                "name": source.name,
                "authority": source.authority,
                "jurisdiction": source.jurisdiction,
                "source_type": source.source_type,
                "official_domain": source.official_domain,
            }
            for source in sources
        ],

        "evidence": [
            item.model_dump()
            for item in evidence
        ],

        "verification": verification_results,

        "response": final_response.model_dump(),

        "status": "completed",
    }