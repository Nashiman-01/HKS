import { useEffect, useState } from "react";
import Alert from "../components/Alert.jsx";
import Button from "../components/Button.jsx";
import Logo from "../components/Logo.jsx";
import { completePasswordReset } from "../services/auth.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

function resetErrorKey(error) {
  const details = `${error?.message || ""} ${error?.code || ""}`.toLowerCase();
    if (/password_reset_link_invalid|expired|invalid.*(token|otp|link)|otp.*(expired|invalid)|invalid_request|session missing|not authenticated/.test(details)) return "passwordReset.linkInvalid";
  if (error instanceof TypeError || /network|fetch failed/i.test(details)) return "auth.networkError";
  if (error?.status === 429) return "auth.rateLimited";
  return "auth.providerError";
}

export default function ResetPassword({ onComplete, onBack }) {
  const { t } = useLanguage();
  const [recovery, setRecovery] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkError = query.get("error_code") || query.get("error") || fragment.get("error_code") || fragment.get("error");
    if (linkError) {
      setError("passwordReset.linkInvalid");
      return undefined;
    }

    let active = true;
    let subscription;
    const finishRecovery = (session) => {
      if (!active || !session?.access_token) return;
      setRecovery(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    };
    import("../lib/supabase.js").then(async ({ supabase }) => {
      if (!active) return;
      if (!supabase) {
        setError("passwordReset.notConfigured");
        return;
      }
      const authChange = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) finishRecovery(session);
      });
      subscription = authChange.data.subscription;
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) setError("passwordReset.linkInvalid");
      else if (data.session) finishRecovery(data.session);
      else setError("passwordReset.linkInvalid");
    }).catch(() => {
      if (active) setError("passwordReset.linkInvalid");
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("passwordReset.passwordShort");
      return;
    }
    if (password !== confirmPassword) {
      setError("passwordReset.passwordMismatch");
      return;
    }
    if (!recovery || submitting) return;

    setSubmitting(true);
    try {
      await completePasswordReset(password);
      setRecovery(null);
      setSuccess(true);
      window.setTimeout(onComplete, 1400);
    } catch (requestError) {
      setError(resetErrorKey(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container auth-page">
      <Logo size={72} className="auth-emblem" />
      <h1 className="page-title">{t("passwordReset.newTitle")}</h1>
      <p className="page-intro">{t("passwordReset.newIntro")}</p>
      {success ? (
        <div className="auth-card">
          <Alert tone="success" role="status">{t("passwordReset.updated")}</Alert>
          <Button onClick={onComplete}>{t("passwordReset.backToLogin")}</Button>
        </div>
      ) : recovery ? (
        <form onSubmit={handleSubmit} noValidate className="form auth-card" aria-busy={submitting}>
          <div className="field">
            <label htmlFor="new-password">{t("passwordReset.newPassword")}</label>
            <input id="new-password" type="password" dir="ltr" className="text-input" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <p className="hint">{t("passwordReset.passwordHint")}</p>
          </div>
          <div className="field">
            <label htmlFor="confirm-new-password">{t("passwordReset.confirmPassword")}</label>
            <input id="confirm-new-password" type="password" dir="ltr" className="text-input" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </div>
          {error && <p className="error" role="alert">{t(error)}</p>}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? t("passwordReset.working") : t("passwordReset.submit")}
          </Button>
        </form>
      ) : (
        <div className="auth-card">
          {error && <p className="error" role="alert">{t(error)}</p>}
          <Button onClick={onBack}>{t("passwordReset.backToLogin")}</Button>
        </div>
      )}
    </div>
  );
}