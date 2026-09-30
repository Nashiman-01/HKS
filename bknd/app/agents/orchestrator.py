from app.agents.intake_agent import intake_case
from app.agents.classification_agent import classify_case
from app.agents.research_agent import create_research_plan
from app.agents.response_agent import generate_final_response
from app.agents.verification_agent import verify_claim
from app.agents.followup_agent import generate_follow_up_questions

from app.legal_sources.source_registry import get_relevant_sources
from app.legal_sources.evidence_retriever import collect_evidence


def process_case(
    user_message: str,
    conversation_history: list[dict] | None = None,
) -> dict:

    # -----------------------------------------------------
    # 0. Prepare conversation context
    # -----------------------------------------------------

    conversation_history = conversation_history or []

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

    follow_up = generate_follow_up_questions(
        user_message=user_message,
        intake_data=intake.model_dump(),
        classification_data=classification.model_dump(),
    )

    # -----------------------------------------------------
    # 4. Stop if important information is missing
    # -----------------------------------------------------

    if follow_up.needs_follow_up:

        return {
            "intake": intake.model_dump(),

            "classification": classification.model_dump(),

            "follow_up": follow_up.model_dump(),

            "status": "needs_follow_up",
        }

    # -----------------------------------------------------
    # 5. Create research plan
    # -----------------------------------------------------

    research = create_research_plan(
        intake.model_dump(),
        classification.model_dump(),
    )

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

    evidence = collect_evidence(
        sources,
        research.research_questions,
    )

    # -----------------------------------------------------
    # 8. Verify claims/questions against available evidence
    # -----------------------------------------------------

    verification_results = []

    for question in research.research_questions:

        result = verify_claim(
            claim=question,
            evidence=evidence,
        )

        verification_results.append(
            result.model_dump()
        )

    # -----------------------------------------------------
    # 9. Generate final user-facing response
    # -----------------------------------------------------

    final_response = generate_final_response(
        user_message=user_message,
        intake_data=intake.model_dump(),
        classification_data=classification.model_dump(),
        evidence=evidence,
        verification_results=verification_results,
    )

    # -----------------------------------------------------
    # 10. Return complete pipeline result
    # -----------------------------------------------------

    return {
        "intake": intake.model_dump(),

        "classification": classification.model_dump(),

        "follow_up": follow_up.model_dump(),

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