import { useLanguage } from "../i18n/LanguageContext.jsx";

// Small progress indicator shown on the four flow screens.
const labelKeys = ["flow.describe", "flow.questions", "flow.analysis", "flow.results"];

export default function FlowSteps({ current }) {
  const { t } = useLanguage();
  // current is a number from 1 to 4

  return (
    <nav aria-label={t("flow.aria")} className="flow-steps">
      <ol>
        {labelKeys.map((key, index) => {
          const number = index + 1;
          let state = "upcoming";
          if (number < current) state = "done";
          if (number === current) state = "current";

          return (
            <li key={key} className={`flow-step ${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="flow-dot" aria-hidden="true">
                {state === "done" ? "✓" : number}
              </span>
              <span className="flow-label">
                {t(key)}
                {state === "done" && <span className="visually-hidden">{t("flow.done")}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
