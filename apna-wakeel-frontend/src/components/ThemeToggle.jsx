import Icon from "./Icon.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// A small switch: sun on one side, moon on the other.
// It is a real button with role="switch", so screen readers say "Dark mode, on/off".

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={isDark}
      aria-label={t("theme.dark")}
      title={t("theme.dark")}
      onClick={toggleTheme}
    >
      <span className="theme-track" aria-hidden="true">
        <span className="theme-thumb" />
        <span className={`theme-icon ${!isDark ? "on" : ""}`}>
          <Icon name="sun" size={15} />
        </span>
        <span className={`theme-icon ${isDark ? "on" : ""}`}>
          <Icon name="moon" size={15} />
        </span>
      </span>
    </button>
  );
}
