import Icon from "../components/Icon.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { languages, useLanguage } from "../i18n/LanguageContext.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";

export default function Settings({ user, onLogout }) {
  const { t, language, voiceLanguage, setVoiceLanguage } = useLanguage();
  const { theme } = useTheme();
  const name = user?.user_metadata?.full_name || t("settings.notProvided");

  return (
    <section className="workspace-page settings-page" aria-labelledby="settings-title">
      <header className="workspace-page-heading">
        <p className="app-eyebrow">{t("chat.workspace")}</p>
        <h2 id="settings-title">{t("settings.title")}</h2>
        <p>{t("settings.intro")}</p>
      </header>

      <section className="settings-section" aria-labelledby="settings-account">
        <h3 id="settings-account">{t("settings.account")}</h3>
        <dl className="settings-account-grid">
          <div><dt>{t("settings.name")}</dt><dd>{name}</dd></div>
          <div><dt>{t("settings.email")}</dt><dd dir="ltr">{user?.email || t("settings.notProvided")}</dd></div>
        </dl>
      </section>

      <section className="settings-section" aria-labelledby="settings-preferences">
        <h3 id="settings-preferences">{t("settings.preferences")}</h3>
        <div className="settings-control-row">
          <div><strong>{t("settings.language")}</strong><p>{t("settings.languageHelp")}</p></div>
          <LanguageSwitcher />
        </div>
        <div className="settings-control-row">
          <div><label htmlFor="settings-voice-language">{t("settings.voiceLanguage")}</label><p>{t("settings.voiceLanguageHelp")}</p></div>
          <select id="settings-voice-language" value={voiceLanguage} onChange={(event) => setVoiceLanguage(event.target.value)}>
            {Object.values(languages).map((item) => <option key={item.code} value={item.code}>{t(`settings.languageName.${item.code}`)}</option>)}
          </select>
        </div>
        <div className="settings-control-row">
          <div><strong>{t("settings.theme")}</strong><p>{t(theme === "dark" ? "settings.darkSelected" : "settings.lightSelected")}</p></div>
          <ThemeToggle />
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-privacy">
        <h3 id="settings-privacy">{t("settings.privacy")}</h3>
        <ul className="settings-info-list">
          <li><Icon name="message" size={18} /><p>{t("settings.conversationData")}</p></li>
          <li><Icon name="file" size={18} /><p>{t("settings.documentData")}</p></li>
          <li><Icon name="shield" size={18} /><p>{t("settings.credentialsNote")}</p></li>
        </ul>
      </section>

      <section className="settings-section settings-actions" aria-labelledby="settings-account-actions">
        <h3 id="settings-account-actions">{t("settings.accountActions")}</h3>
        <button className="app-button app-button-danger" type="button" onClick={onLogout}><Icon name="external" size={18} />{t("settings.logout")}</button>
        <p className="workspace-disclaimer">{t("settings.disclaimer")}</p>
      </section>
      <span className="visually-hidden" aria-live="polite">{t("settings.currentLanguage", { language: t(`settings.languageName.${language}`) })}</span>
    </section>
  );
}
