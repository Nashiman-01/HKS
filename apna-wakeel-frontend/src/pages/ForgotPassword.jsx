import { useState } from "react";
import Alert from "../components/Alert.jsx";
import Button from "../components/Button.jsx";
import Logo from "../components/Logo.jsx";
import { requestPasswordReset } from "../services/auth.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

function resetErrorKey(error) {
  if (error?.message === "supabase_not_configured") return "passwordReset.notConfigured";
  if (error instanceof TypeError || /network|fetch failed/i.test(error?.message || "")) return "auth.networkError";
  if (error?.status === 429) return "auth.rateLimited";
  return "auth.providerError";
}

export default function ForgotPassword({ onBack }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSent(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("login.errEmail");
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (requestError) {
      setError(resetErrorKey(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container auth-page">
      <Logo size={72} className="auth-emblem" />
      <h1 className="page-title">{t("passwordReset.requestTitle")}</h1>
      <p className="page-intro">{t("passwordReset.requestIntro")}</p>
      <form onSubmit={handleSubmit} noValidate className="form auth-card" aria-busy={submitting}>
        <div className="field">
          <label htmlFor="reset-email">{t("login.email")}</label>
          <input
            id="reset-email"
            type="email"
            dir="ltr"
            className="text-input"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error === "login.errEmail")}
          />
        </div>
        {error && <p className="error" role="alert">{t(error)}</p>}
        {sent && <Alert tone="success" role="status">{t("passwordReset.requestSent")}</Alert>}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? t("passwordReset.requestWorking") : t("passwordReset.requestSubmit")}
        </Button>
      </form>
      <div className="auth-links">
        <button type="button" className="link-button" onClick={onBack}>{t("passwordReset.backToLogin")}</button>
      </div>
    </div>
  );
}