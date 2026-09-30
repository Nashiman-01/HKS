import ResultSection from "./ResultSection.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// "Which type of lawyer may help?" — shown only as orientation, never as a
// definitive instruction. lawyerType: { type, reason, prepare: [] }
export default function LawyerRecommendation({ lawyerType, hasLegalAid }) {
  const { t } = useLanguage();
  if (!lawyerType) return null;

  return (
    <ResultSection id="lawyer-type" title={t("results.lawyerType")} icon="briefcase">
      <p className="section-note">{t("results.lawyerTypeNote")}</p>

      <div className="lawyer-card">
        <p className="lawyer-label">{t("results.lawyerTypeLabel")}</p>
        <h3>{lawyerType.type}</h3>

        <p className="subheading">{t("results.lawyerWhy")}</p>
        <p>{lawyerType.reason}</p>

        {lawyerType.prepare && lawyerType.prepare.length > 0 && (
          <>
            <p className="subheading">{t("results.lawyerPrepare")}</p>
            <ul className="plain-list">
              {lawyerType.prepare.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}

        {hasLegalAid && (
          <p className="lawyer-aid-link">
            {t("results.lawyerNeedHelp")} <a href="#legal-aid">{t("results.lawyerFindHelp")}</a>
          </p>
        )}
      </div>
    </ResultSection>
  );
}
