export const spacing = {
  xsmall: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
};

export const typography = {
  h1: 32,
  h2: 24,
  h3: 20,
  body: 16,
  small: 12,
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
  },
};

export const lightColors = {
  primary: '#6C5CE7',
  accent: '#00B894',
  background: '#F7F9FC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#4B5563',
  border: '#E6E9EF',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const darkColors = {
  primary: '#7C3AED',
  accent: '#34D399',
  background: '#0B1220',
  surface: '#0F1724',
  textPrimary: '#E6EEF8',
  textSecondary: '#9CA3AF',
  border: '#162132',
  success: '#10B981',
  warning: '#FBBF24',
  error: '#F87171',
};

export type ThemeTokens = typeof lightColors & typeof spacing & typeof typography;
