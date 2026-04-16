"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "biohacked-theme";

export function ThemeProvider({ children }) {
  // Initialise from localStorage or default to dark (SSR-safe)
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    // Runs once on mount — pick up what the no-flash script already set
    const applied = document.documentElement.getAttribute("data-theme");
    if (applied === "light" || applied === "dark") {
      setThemeState(applied);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      const initial = saved === "light" || saved === "dark" ? saved : "dark";
      setThemeState(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const setTheme = (next) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, isDark: theme === "dark", isLight: theme === "light" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
