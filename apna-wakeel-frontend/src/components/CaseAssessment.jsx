import Icon from "./Icon.jsx";
import Badge from "./Badge.jsx";
import ResultSection from "./ResultSection.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// "Case Assessment" — an information/navigation feature, never a prediction of
// how a court will rule. No percentages, no "you will win/lose" language
// anywhere in this component; see the safety note rendered at the top.
//
// assessment: {
//   summary,
//   strengths: [], weaknesses: [], missingInfo: [],
//   evidenceStrength: "low" | "moderate" | "strong" | "unknown",
//   preparedness:     "needsMore" | "reasonable" | "professionalReview",
//   improve: [],
// }

const STRENGTH_TONE = { low: "amber", moderate: "gold", strong: "green", unknown: "neutral" };
const PREPAREDNESS_TONE = { needsMore: "amber", reasonable: "green", professionalReview: "gold" };

export default function CaseAssessment({ assessment }) {
  const { t } = useLanguage();
  if (!assessment) return null;

  return (
    <ResultSection id="case-assessment" title={t("results.caseAssessment")} icon="clipboard">
      <p className="section-note">{t("results.caseAssessmentNote")}</p>

      <p>{assessment.summary}</p>

      <div className="assessment-badges">
        <div>
          <span className="assessment-badge-label">{t("results.evidenceStrength")}</span>
          <Badge tone={STRENGTH_TONE[assessment.evidenceStrength] || "neutral"}>
            {t(`assessment.strength.${assessment.evidenceStrength}`)}
          </Badge>
        </div>
        <div>
          <span className="assessment-badge-label">{t("results.preparedness")}</span>
          <Badge tone={PREPAREDNESS_TONE[assessment.preparedness] || "neutral"}>
            {t(`assessment.preparedness.${assessment.preparedness}`)}
          </Badge>
        </div>
      </div>

      <div className="assessment-grid">
        {assessment.strengths?.length > 0 && (
          <div className="assessment-col assessment-good">
            <h3>
              <Icon name="tick" size={17} />
              {t("results.strengths")}
            </h3>
            <ul>
              {assessment.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {assessment.weaknesses?.length > 0 && (
          <div className="assessment-col assessment-warn">
            <h3>
              <Icon name="alert" size={17} />
              {t("results.weaknesses")}
            </h3>
            <ul>
              {assessment.weaknesses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {assessment.missingInfo?.length > 0 && (
          <div className="assessment-col">
            <h3>
              <Icon name="minus" size={17} />
              {t("results.missingInfo")}
            </h3>
            <ul>
              {assessment.missingInfo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {assessment.improve?.length > 0 && (
        <>
          <p className="subheading">{t("results.improve")}</p>
          <ol className="improve-list">
            {assessment.improve.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </>
      )}
    </ResultSection>
  );
}
