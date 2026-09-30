from pydantic import BaseModel


class EvidenceItem(BaseModel):
    source_name: str
    source_url: str
    source_title: str
    jurisdiction: str
    source_type: str

    relevant_text: str

    retrieval_method: str = "official_source"

    retrieval_score: int | None = None

    verified: bool = False

    verification_notes: str | None = None

    retrieved_at: str | None = None

    citation: str | None = None

    page_number: int | None = None

    official_status: str | None = None
    
class Claim(BaseModel):
    claim: str
    evidence: list[EvidenceItem]    