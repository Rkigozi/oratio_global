import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

type Theme = "dark" | "light";
export type ThemeMode = Theme | "system";

const themeColors: Record<Theme, { page: string; safeArea: string }> = {
  dark: { page: "#0A1A3A", safeArea: "#0A1A3A" },
  light: { page: "#F0F3F9", safeArea: "#FFFFFF" },
};

interface ThemeState {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState>({
  theme: "dark",
  themeMode: "system",
  setThemeMode: () => {},
  toggleTheme: () => {},
});

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function getSystemTheme(): Theme {
  try {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch { /* empty */ }
  return "dark";
}

function getStoredThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem("oratio_theme");
    if (isThemeMode(stored)) return stored;
  } catch { /* empty */ }
  return "system";
}

function storeThemeMode(themeMode: ThemeMode) {
  try {
    localStorage.setItem("oratio_theme", themeMode);
  } catch { /* empty */ }
}

function applyTheme(theme: Theme) {
  const color = themeColors[theme];
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.setProperty("--oratio-page-bg", color.page);
  document.documentElement.style.setProperty("--oratio-safe-area-bg", color.safeArea);
  document.documentElement.style.backgroundColor = color.safeArea;
  document.body.style.backgroundColor = color.safeArea;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", color.safeArea);
}

async function getSupabaseClient() {
  const { supabase } = await import("../services/supabase");
  return supabase;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getStoredThemeMode());
  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme());
  const theme: Theme = themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Load profile preference once; localStorage still wins immediately on first paint.
  useEffect(() => {
    let active = true;

    const loadProfileTheme = async () => {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();

      if (!active || !data?.preferences || typeof data.preferences !== "object") return;

      const prefs = data.preferences as Record<string, unknown>;
      if (isThemeMode(prefs.theme)) {
        setThemeModeState(prefs.theme);
        storeThemeMode(prefs.theme);
      }
    };

    void loadProfileTheme();

    return () => {
      active = false;
    };
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "light" : "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const syncThemePreference = useCallback((next: ThemeMode) => {
    const sync = async () => {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();

      const merged = { ...((data?.preferences as Record<string, unknown>) || {}), theme: next };
      await supabase.from("profiles").update({ preferences: merged }).eq("id", user.id);
    };

    void sync();
  }, []);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setThemeModeState(next);
    storeThemeMode(next);
    syncThemePreference(next);
  }, [syncThemePreference]);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const currentTheme: Theme = prev === "system" ? getSystemTheme() : prev;
      const next: Theme = currentTheme === "dark" ? "light" : "dark";
      storeThemeMode(next);
      syncThemePreference(next);
      return next;
    });
  }, [syncThemePreference]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
