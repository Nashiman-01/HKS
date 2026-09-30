import { createContext, useContext, useEffect, useState } from "react";

// Remembers light or dark mode.
//  - If the person has chosen before, we use their choice (saved in the browser).
//  - Otherwise we follow their device setting.

const ThemeContext = createContext(null);

function readSaved() {
  try {
    const value = localStorage.getItem("theme");
    return value === "dark" || value === "light" ? value : null;
  } catch (error) {
    return null;
  }
}

function systemTheme() {
  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readSaved() || systemTheme());
  const [hasChoice, setHasChoice] = useState(() => readSaved() !== null);

  // Put the theme on the page so the CSS can react to it.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0c1611" : "#faf6ee");
  }, [theme]);

  // Until the person picks, follow the device setting if it changes.
  useEffect(() => {
    if (hasChoice || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setTheme(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [hasChoice]);

  function toggleTheme() {
    // "theme-anim" makes colours fade for a moment instead of jumping (see styles.css)
    const root = document.documentElement;
    root.classList.add("theme-anim");
    setTimeout(() => root.classList.remove("theme-anim"), 400);

    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setHasChoice(true);
    try {
      localStorage.setItem("theme", next);
    } catch (error) {
      // storage not available, that is fine
    }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
