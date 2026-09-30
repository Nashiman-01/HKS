import { useEffect, useState } from "react";
import FlowSteps from "../components/FlowSteps.jsx";
import Button from "../components/Button.jsx";
import Alert from "../components/Alert.jsx";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import { analyzeProblem } from "../services/api.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// A calm waiting screen. The stages tick off one by one while the analysis runs.
const messageKeys = ["analysis.msg1", "analysis.msg2", "analysis.msg3", "analysis.msg4"];

const MIN_SHOW_TIME = 4000; // so the screen never just flashes by

export default function Analysis({ problem, answers, onDone, onBack }) {
  const { t, language } = useLanguage();
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState("");
  const [tryCount, setTryCount] = useState(0);

  // Move through the stages.
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, messageKeys.length - 1));
    }, 1200);
    return () => clearInterval(timer);
  }, [tryCount]);

  // Ask the back end for the analysis.
  useEffect(() => {
    let cancelled = false;
    setError("");
    setMessageIndex(0);

    const started = Date.now();
    analyzeProblem({ problem: problem.text, province: problem.province, answers, language })
      .then((result) => {
        const remaining = Math.max(0, MIN_SHOW_TIME - (Date.now() - started));
        setTimeout(() => {
          if (!cancelled) onDone(result);
        }, remaining);
      })
      .catch((requestError) => {
        if (import.meta.env.DEV) console.error("Legal analysis request failed:", requestError);
        if (!cancelled) {
          const errorKey = requestError?.status === 429
            ? "analysis.rateLimited"
            : requestError?.message === "api.endpointUnavailable"
              ? "analysis.backendUnsupported"
            : requestError?.status === 504
              ? "analysis.timeout"
              : requestError?.status === 503
                ? "analysis.serviceUnavailable"
                : "analysis.error";
          setError(t(errorKey));
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tryCount, language]);

  return (
    <div className="container flow-page">
      <FlowSteps current={3} />

      {error ? (
        <Alert tone="error" icon="alert" role="alert">
          <p>{error}</p>
          <div className="btn-row">
            <Button onClick={() => setTryCount(tryCount + 1)}>{t("common.tryAgain")}</Button>
            <Button variant="secondary" onClick={onBack}>
              {t("analysis.backStart")}
            </Button>
          </div>
        </Alert>
      ) : (
        <div className="analysis-card">
          <span className="loader-emblem" aria-hidden="true">
            <span className="loader" />
            <Logo size={60} />
          </span>

          {/* role="status" lets screen readers announce each new stage politely */}
          <p className="status-message" role="status">
            {t(messageKeys[messageIndex])}…
          </p>

          {/* The list is only a visual companion to the message above */}
          <ol className="analysis-steps" aria-hidden="true">
            {messageKeys.map((key, i) => {
              const state = i < messageIndex ? "done" : i === messageIndex ? "current" : "pending";
              return (
                <li key={key} className={`analysis-step ${state}`}>
                  <span className="analysis-mark">{state === "done" ? <Icon name="tick" size={14} /> : null}</span>
                  <span>{t(key)}</span>
                </li>
              );
            })}
          </ol>

          <p className="hint">{t("analysis.time")}</p>
        </div>
      )}
    </div>
  );
}
