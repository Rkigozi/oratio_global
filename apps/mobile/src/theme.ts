export const colors = {
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
  danger: '#FF6B6B',
  warning: '#FBBF24',
  success: '#6EE7B7',
  white: '#FFFFFF',
};

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
