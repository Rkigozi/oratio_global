import { DynamicColorIOS, Platform } from 'react-native';

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceHover: string;
  surfaceElevated: string;
  overlay: string;
  surfaceBorder: string;
  divider: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  accentTint: string;
  accentTintSoft: string;
  accentBorder: string;
  danger: string;
  warning: string;
  success: string;
  white: string;
  scrim: string;
  brandGlow: string;
  mapHeader: string;
  mapControl: string;
  mapMessage: string;
  mapSheet: string;
  markerHalo: string;
  markerHaloBorder: string;
  markerCore: string;
};

export const lightColors: ThemeColors = {
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceHover: '#EDF0F7',
  surfaceElevated: '#FFFFFF',
  overlay: '#FFFFFF',
  surfaceBorder: 'rgba(38, 51, 89, 0.16)',
  divider: 'rgba(38, 51, 89, 0.1)',
  text: '#18233F',
  textSecondary: '#35405E',
  textMuted: '#65708F',
  textDim: '#8992A8',
  textFaint: '#A4ACBE',
  accent: '#5267D8',
  accentDark: '#4156C2',
  accentLight: '#7183E8',
  accentTint: 'rgba(82, 103, 216, 0.1)',
  accentTintSoft: 'rgba(82, 103, 216, 0.05)',
  accentBorder: 'rgba(82, 103, 216, 0.22)',
  danger: '#BF3F4D',
  warning: '#995800',
  success: '#14705A',
  white: '#FFFFFF',
  scrim: 'rgba(18, 27, 49, 0.3)',
  brandGlow: 'rgba(82, 103, 216, 0.12)',
  mapHeader: 'rgba(245, 247, 251, 0.92)',
  mapControl: 'rgba(255, 255, 255, 0.94)',
  mapMessage: 'rgba(255, 255, 255, 0.96)',
  mapSheet: 'rgba(255, 255, 255, 0.98)',
  markerHalo: 'rgba(183, 125, 33, 0.2)',
  markerHaloBorder: 'rgba(142, 91, 10, 0.58)',
  markerCore: '#A56500',
};

export const darkColors: ThemeColors = {
  bg: '#0A1A3A',
  surface: '#0F1432',
  surfaceHover: '#141C3C',
  surfaceElevated: '#111A3A',
  overlay: '#0C1430',
  surfaceBorder: 'rgba(124, 143, 255, 0.14)',
  divider: 'rgba(124, 143, 255, 0.1)',
  text: '#E2E4F0',
  textSecondary: '#C5CBE2',
  textMuted: '#8890B5',
  textDim: '#4E5573',
  textFaint: '#3E4460',
  accent: '#7C8FFF',
  accentDark: '#5A6FD6',
  accentLight: '#A0B4FF',
  accentTint: 'rgba(124, 143, 255, 0.12)',
  accentTintSoft: 'rgba(124, 143, 255, 0.06)',
  accentBorder: 'rgba(124, 143, 255, 0.24)',
  danger: '#FF6B6B',
  warning: '#FBBF24',
  success: '#6EE7B7',
  white: '#FFFFFF',
  scrim: 'rgba(2, 8, 22, 0.62)',
  brandGlow: 'rgba(124, 143, 255, 0.2)',
  mapHeader: 'rgba(10, 26, 58, 0.86)',
  mapControl: 'rgba(10, 26, 58, 0.9)',
  mapMessage: 'rgba(10, 26, 58, 0.94)',
  mapSheet: 'rgba(12, 20, 48, 0.97)',
  markerHalo: 'rgba(232, 182, 107, 0.24)',
  markerHaloBorder: 'rgba(255, 236, 194, 0.7)',
  markerCore: '#F4C979',
};

function adaptiveColor(light: string, dark: string): string {
  if (light === dark) return light;
  if (Platform.OS !== 'ios') return dark;
  return DynamicColorIOS({ light, dark }) as unknown as string;
}

export const colors = Object.fromEntries(
  (Object.keys(darkColors) as Array<keyof ThemeColors>).map((key) => [
    key,
    adaptiveColor(lightColors[key], darkColors[key]),
  ])
) as ThemeColors;

export const fontFamilies = {
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  heading: 'Sora_400Regular',
  headingMedium: 'Sora_500Medium',
  headingSemiBold: 'Sora_600SemiBold',
} as const;

export const fonts = {
  brand: {
    fontFamily: fontFamilies.heading,
    fontSize: 30,
    letterSpacing: 8,
  },
  heading: {
    fontFamily: fontFamilies.headingMedium,
    fontSize: 20,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
  },
  small: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
  },
};

export const radii = {
  control: 8,
  surface: 8,
  pill: 999,
} as const;
