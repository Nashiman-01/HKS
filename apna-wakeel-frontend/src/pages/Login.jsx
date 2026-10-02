import { useRef, useState } from "react";
import { signInWithPassword, signUpWithPassword } from "../services/auth.js";
import { API_BASE_URL } from "../lib/apiConfig.js";
import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import Alert from "../components/Alert.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const MIN_PASSWORD_LENGTH = 8;

function getAuthErrorKey(error) {
  const details = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (error?.message === "api.notConfigured") return "api.notConfigured";
  if (error?.message === "supabase_not_configured") return "auth.notConfigured";
  if (error?.code === "email_not_confirmed" || /email not confirmed/.test(details)) {
    return "auth.emailNotConfirmed";
  }
  if (/already registered|already exists|user already exists|user_already_exists|account_exists/.test(details)) {
    return "auth.accountExists";
  }
  if (error?.code === "weak_password" || /weak password|password.{0,80}(weak|short|at least|characters|contain|should)/.test(details)) {
    return "auth.weakPassword";
  }
  if (error?.code === "invalid_credentials" || /invalid login credentials|invalid credentials|invalid email or password|invalid_credentials/.test(details)) {
    return "auth.invalidCredentials";
  }
  if (/invalid email|email.*(invalid|not valid)|email_address_invalid/.test(details)) return "login.errEmail";
  if (error?.status === 429 || /rate limit|too many requests/.test(details)) return "auth.rateLimited";
  if (error?.name === "AuthRetryableFetchError" || error instanceof TypeError || /network|fetch failed/.test(details)) {
    return "auth.networkError";
  }
  if (error?.status >= 500) return "auth.providerError";
  return error?.status ? "auth.providerError" : "auth.genericError";
}

export default function Login({ onAuthenticated, initialMode = "login", onModeChange, onForgotPassword }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isSignup = mode === "signup";

  function switchMode() {
    const nextMode = isSignup ? "login" : "signup";
    setMode(nextMode);
    onModeChange?.(nextMode);
    setErrors({});
    setAuthError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    setAuthError("");
    setSuccess("");

    const newErrors = {};
    if (isSignup && name.trim() === "") newErrors.name = t("login.errName");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = t("login.errEmail");
    if (!password || (isSignup && password.length < MIN_PASSWORD_LENGTH)) newErrors.password = t("login.errPassword");
    if (isSignup && confirmPassword !== password) newErrors.confirmPassword = t("login.errConfirmPassword");

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = isSignup
        ? await signUpWithPassword({ name: name.trim(), email: email.trim(), password })
        : await signInWithPassword({ email: email.trim(), password });

      if (result.session) {
        onAuthenticated();
      } else if (isSignup && (result.user?.identities?.length === 0 || result.alreadyRegistered)) {
        setAuthError("auth.accountExists");
      } else {
        setSuccess("auth.confirmEmail");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Authentication request failed:", error);
      setAuthError(getAuthErrorKey(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="container auth-page">
      <Logo size={72} className="auth-emblem" />
      <h1 className="page-title">{isSignup ? t("login.signupTitle") : t("login.title")}</h1>
      <p className="page-intro">{isSignup ? t("login.signupIntro") : t("login.intro")}</p>

      <form onSubmit={handleSubmit} noValidate className="form auth-card" aria-busy={submitting}>
        {!API_BASE_URL && <Alert tone="warning" icon="alert">{t("api.notConfigured")}</Alert>}

        {isSignup && (
          <div className="field">
            <label htmlFor="name">{t("login.name")}</label>
            <input
              id="name"
              type="text"
              className="text-input"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="error" role="alert">
                {errors.name}
              </p>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">{t("login.email")}</label>
          <input
            id="email"
            type="email"
            dir="ltr"
            className="text-input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            required
          />
          {errors.email && (
            <p id="email-error" className="error" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">{t("login.password")}</label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            className="text-input"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "password-error" : undefined}
            required
          />
          {errors.password && (
            <p id="password-error" className="error" role="alert">
              {errors.password}
            </p>
          )}
          {isSignup && (
              <p className="hint">{t("login.passwordHint")}</p>
          )}
          <div className="check-row">
            <input id="show-password" type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            <label htmlFor="show-password">{t("login.showPassword")}</label>
          </div>
        </div>

        {isSignup && (
          <div className="field">
            <label htmlFor="confirm-password">{t("login.confirmPassword")}</label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              dir="ltr"
              className="text-input"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={errors.confirmPassword ? "true" : "false"}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              required
            />
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="error" role="alert">{errors.confirmPassword}</p>
            )}
          </div>
        )}

        {authError && (
          <p className="error" role="alert">
            {t(authError)}
          </p>
        )}

        {success && <Alert tone="success" role="status">{t(success)}</Alert>}

        <Button type="submit" size="lg" disabled={submitting || !API_BASE_URL}>
          {submitting ? t("login.working") : isSignup ? t("login.signupSubmit") : t("login.submit")}
        </Button>
        {!isSignup && (
          <button type="button" className="link-button auth-forgot-link" onClick={onForgotPassword}>
            {t("login.forgotPassword")}
          </button>
        )}
      </form>

      <div className="auth-links">
        <button type="button" className="link-button" onClick={switchMode}>
          {isSignup ? t("login.switchToLogin") : t("login.switchToSignup")}
        </button>
      </div>
    </div>
  );
}
