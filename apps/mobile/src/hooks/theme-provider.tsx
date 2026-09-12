import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { useAuth } from './auth-context';
import { isThemeMode, ThemeContext, type Theme, type ThemeMode } from './theme-context';
import { supabase } from '../services/supabase';

const THEME_STORAGE_KEY = 'oratio_theme';

function applyThemeMode(themeMode: ThemeMode) {
  Appearance.setColorScheme(themeMode === 'system' ? 'unspecified' : themeMode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const systemTheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);
  const theme: Theme =
    themeMode === 'system' ? (systemTheme === 'light' ? 'light' : 'dark') : themeMode;

  useEffect(() => {
    let active = true;

    const loadStoredTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (active && isThemeMode(stored)) {
          setThemeModeState(stored);
          applyThemeMode(stored);
        } else if (active) {
          applyThemeMode('system');
        }
      } catch {
        if (active) applyThemeMode('system');
      } finally {
        if (active) setHydrated(true);
      }
    };

    void loadStoredTheme();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    let active = true;

    const loadProfileTheme = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', user.id)
          .single();
        const preferences = data?.preferences as Record<string, unknown> | null | undefined;
        const profileTheme = preferences?.theme;
        if (!active || !isThemeMode(profileTheme)) return;

        setThemeModeState(profileTheme);
        applyThemeMode(profileTheme);
        void AsyncStorage.setItem(THEME_STORAGE_KEY, profileTheme).catch(() => undefined);
      } catch {
        // Keep the local preference when the profile cannot be reached.
      }
    };

    void loadProfileTheme();
    return () => {
      active = false;
    };
  }, [hydrated, user]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setThemeModeState(next);
    applyThemeMode(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => undefined);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
