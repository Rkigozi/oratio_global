import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeMode = Theme | 'system';

type ThemeState = {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeState>({
  theme: 'dark',
  themeMode: 'system',
  setThemeMode: () => undefined,
});

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function useTheme() {
  return useContext(ThemeContext);
}
