from dataclasses import dataclass


@dataclass(frozen=True)
class LegalSource:
    name: str
    authority: str
    jurisdiction: str
    source_type: str
    domain: str
    official_domain: str
    search_url: str | None = None


LEGAL_SOURCES = [
    LegalSource(
        name="Pakistan Code",
        authority="Ministry of Law and Justice, Government of Pakistan",
        jurisdiction="Federal",
        source_type="legislation",
        domain="Federal laws and statutes",
        official_domain="pakistancode.gov.pk",
        search_url="https://pakistancode.gov.pk/english/",
    ),

    LegalSource(
        name="Khyber Pakhtunkhwa Government Portal",
        authority="Government of Khyber Pakhtunkhwa",
        jurisdiction="Khyber Pakhtunkhwa",
        source_type="government",
        domain="Provincial government information and services",
        official_domain="kp.gov.pk",
        search_url="https://kp.gov.pk/",
    ),

    LegalSource(
        name="NADRA",
        authority="National Database and Registration Authority",
        jurisdiction="Pakistan",
        source_type="government_authority",
        domain="Identity documents and registration services",
        official_domain="nadra.gov.pk",
    ),
]


def get_relevant_sources(
    jurisdiction: str,
    domain: str,
) -> list[LegalSource]:

    results = []

    for source in LEGAL_SOURCES:
        jurisdiction_match = (
            source.jurisdiction.lower() == jurisdiction.lower()
            or source.jurisdiction.lower() == "pakistan"
        )

        domain_match = (
            domain.lower() in source.domain.lower()
            or source.source_type.lower() in domain.lower()
        )

        if jurisdiction_match and domain_match:
            results.append(source)

    return results