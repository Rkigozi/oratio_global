import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from '../services/supabase';

type Theme = "dark" | "light";

const themeColors: Record<Theme, string> = {
  dark: "#0A1A3A",
  light: "#F8F9FC",
};

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState>({
  theme: "dark",
  toggleTheme: () => {},
});

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("oratio_theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* empty */ }
  return "dark";
}

function applyTheme(theme: Theme) {
  const color = themeColors[theme];
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.setProperty("--oratio-page-bg", color);
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", color);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  // Apply theme on mount
  useEffect(() => {
    applyTheme(theme);
    // Sync to Supabase preferences if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.preferences && typeof data.preferences === "object") {
              const prefs = data.preferences as Record<string, unknown>;
              if (prefs.theme === "light" || prefs.theme === "dark") {
                setTheme(prefs.theme);
                applyTheme(prefs.theme);
              }
            }
          });
      }
    });
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      // Only apply system theme if user hasn't set a preference
      if (!localStorage.getItem("oratio_theme")) {
        const t: Theme = e.matches ? "light" : "dark";
        setTheme(t);
        applyTheme(t);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem("oratio_theme", next);
      } catch { /* empty */ }
      // Sync to Supabase
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from("profiles")
            .select("preferences")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
              const merged = { ...((data?.preferences as Record<string, unknown>) || {}), theme: next };
              supabase.from("profiles").update({ preferences: merged }).eq("id", user.id);
            });
        }
      });
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
