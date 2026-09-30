import Logo from "./Logo.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <Logo size={64} />
          <p className="footer-text">
            <strong>{t("brand")}</strong> {t("footer.text")}
          </p>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} {t("brand")}
        </p>
      </div>
    </footer>
  );
}
