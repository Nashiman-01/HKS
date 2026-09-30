import LanguageSwitcher from "./LanguageSwitcher.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import Logo from "./Logo.jsx";
import Button from "./Button.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// Two rows, like a public-service website:
//   1. a slim green utility bar: short description on the left, language and light/dark on the right
//   2. the main bar: logo and name on the left, navigation and "Start Now" on the right
// The links look like links but are real <button>s, because they change what the page shows.

export default function Navbar({ user, onHome, onNavigate, onStart, onLogin, onLogout, onAccount }) {
  const { t } = useLanguage();
  const displayName = user?.user_metadata?.full_name || user?.email || "";

  return (
    <header className="site-header">
      <div className="utility">
        <div className="container utility-inner">
          <p className="utility-text">{t("topbar.text")}</p>
          <div className="utility-controls">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="navbar">
        <div className="container navbar-inner">
            <button className="brand" onClick={user ? onAccount : onHome} aria-label={t("nav.goHome")}>
            <Logo size={54} />
            <span className="brand-text">
              <span className="brand-name">{t("brand")}</span>
              <span className="brand-sub">{t("hero.eyebrow")}</span>
            </span>
          </button>

          <nav aria-label={t("nav.main")}>
            <ul className="nav-list">
              <li className="nav-secondary">
                <button className="nav-link" onClick={() => onNavigate("how-it-works")}>
                  {t("nav.howItWorks")}
                </button>
              </li>
              <li className="nav-secondary">
                <button className="nav-link" onClick={() => onNavigate("about")}>
                  {t("nav.about")}
                </button>
              </li>
              <li>
                {user ? (
                  <span className="nav-user">
                    <button className="nav-link" onClick={onAccount}>{t("nav.hello", { name: displayName })}</button>
                    <button className="nav-link" onClick={onLogout}>
                      {t("nav.logout")}
                    </button>
                  </span>
                ) : (
                  <button className="nav-link" onClick={onLogin}>
                    {t("nav.login")}
                  </button>
                )}
              </li>
              <li>
                <Button size="sm" onClick={onStart}>
                  {t("nav.startNow")}
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
