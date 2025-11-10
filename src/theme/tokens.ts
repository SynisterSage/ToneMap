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

// Purple-focused glassmorphism color palette
export const lightColors = {
  primary: '#8B5CF6',        // Vibrant purple
  accent: '#A78BFA',         // Lighter purple accent
  background: '#F8F9FD',     // Very light blue-tinted background
  surface: '#FFFFFF',        // Pure white for glass cards
  surfaceGlass: 'rgba(255, 255, 255, 0.7)', // Frosted glass
  textPrimary: '#1E1B4B',    // Deep purple-black
  textSecondary: '#6B7280',
  border: '#E9D5FF',         // Light purple border
  borderGlass: 'rgba(139, 92, 246, 0.1)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
  },
};

export const darkColors = {
  primary: '#A78BFA',        // Softer purple for dark mode
  accent: '#C4B5FD',         // Even lighter purple
  background: '#0A0118',     // Very dark purple-black
  surface: '#1C1525',        // Dark purple surface
  surfaceGlass: 'rgba(28, 21, 37, 0.7)', // Dark frosted glass
  textPrimary: '#F3F4F6',
  textSecondary: '#9CA3AF',
  border: '#3B2B54',         // Dark purple border
  borderGlass: 'rgba(167, 139, 250, 0.15)',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  purple: {
    50: '#1C1525',
    100: '#2D1F3E',
    200: '#3B2B54',
    300: '#4C3968',
    400: '#6B21A8',
    500: '#7E22CE',
    600: '#9333EA',
    700: '#A855F7',
    800: '#C084FC',
    900: '#E9D5FF',
  },
};

// Glassmorphism utilities
export const glassmorphism = {
  blur: {
    light: 10,
    medium: 20,
    heavy: 40,
  },
  opacity: {
    subtle: 0.5,
    medium: 0.7,
    strong: 0.85,
  },
  shadow: {
    light: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    },
    medium: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 6,
    },
    heavy: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 32,
      elevation: 9,
    },
  },
  border: {
    width: 1,
    style: 'solid' as const,
  },
};

export type ThemeTokens = typeof lightColors & typeof spacing & typeof typography;
