import Logo from "../components/Logo.jsx";
import Button from "../components/Button.jsx";
import Alert from "../components/Alert.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function ProtectedHome({ onLogout, authError, onDismissError }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <section className="container auth-page" aria-labelledby="account-title">
      <Logo size={72} className="auth-emblem" />
      <h1 id="account-title" className="page-title">{t("auth.accountReady")}</h1>
      <p className="page-intro">{user?.email}</p>
      <Alert tone="info">{t("auth.stageOneNote")}</Alert>
      {authError && (
        <p className="error" role="alert">{t(`auth.${authError}`)}</p>
      )}
      <div className="btn-row">
        <Button onClick={onLogout}>{t("nav.logout")}</Button>
        {authError && (
          <Button variant="secondary" onClick={onDismissError}>{t("common.dismiss")}</Button>
        )}
      </div>
    </section>
  );
}