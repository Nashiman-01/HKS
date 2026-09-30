import { languages, useLanguage } from "../i18n/LanguageContext.jsx";

// One button per language. A new language added in LanguageContext.jsx
// shows up here automatically.
export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="lang-switch" role="group" aria-label={t("nav.language")}>
      {Object.values(languages).map((lang) => (
        <button
          key={lang.code}
          type="button"
          lang={lang.code}
          className={language === lang.code ? "active" : ""}
          aria-pressed={language === lang.code}
          onClick={() => setLanguage(lang.code)}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
}
