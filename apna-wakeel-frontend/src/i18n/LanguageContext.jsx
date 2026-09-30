import { createContext, useContext, useEffect, useState } from "react";
import en from "./en.js";
import ur from "./ur.js";
import romanUrdu from "./romanUrdu.js";

// -----------------------------------------------------------------------------
// LANGUAGES
// To add Khowar later:
//   1. Copy en.js to khw.js and translate the text on the right side.
//   2. Add:  import khw from "./khw.js";
//   3. Add one line below:  khw: { code: "khw", name: "کھوار", dir: "rtl", strings: khw },
// Any text you have not translated yet falls back to English automatically.
// -----------------------------------------------------------------------------
export const languages = {
  en: { code: "en", name: "English", dir: "ltr", strings: en },
  ur: { code: "ur", name: "اردو", dir: "rtl", strings: ur },
  roman_urdu: { code: "roman_urdu", name: "Roman Urdu", dir: "ltr", htmlLang: "ur-Latn", strings: romanUrdu },
};

const LanguageContext = createContext(null);

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem("language");
    if (saved && languages[saved]) return saved;
  } catch (error) {
    // storage not available, that is fine
  }
  return "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getSavedLanguage);
  const [voiceLanguage, setVoiceLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem("voiceLanguage");
      return ["en", "ur", "roman_urdu"].includes(saved) ? saved : "en";
    } catch {
      return "en";
    }
  });

  // Tell the browser the language and reading direction (left-to-right or right-to-left).
  useEffect(() => {
    document.documentElement.lang = languages[language].htmlLang || language;
    document.documentElement.dir = languages[language].dir;
  }, [language]);

  function setLanguage(code) {
    if (!languages[code]) return;
    setLanguageState(code);
    try {
      localStorage.setItem("language", code);
    } catch (error) {
      // ignore
    }
  }

  function setVoiceLanguage(code) {
    if (!["en", "ur", "roman_urdu"].includes(code)) return;
    setVoiceLanguageState(code);
    try {
      localStorage.setItem("voiceLanguage", code);
    } catch {
      // storage not available, that is fine
    }
  }

  // t("some.key") gives the text in the current language.
  // t("some.key", { name: "Ali" }) also replaces {name} in the text.
  function t(key, values = {}) {
    let text = languages[language].strings[key] ?? en[key] ?? key;
    for (const name in values) {
      text = text.split(`{${name}}`).join(values[name]);
    }
    return text;
  }

  return <LanguageContext.Provider value={{ language, setLanguage, voiceLanguage, setVoiceLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
