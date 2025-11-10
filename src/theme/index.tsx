import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {Appearance, ColorSchemeName} from 'react-native';
import {darkColors, lightColors, spacing, typography, glassmorphism, ThemeTokens} from './tokens';

type Theme = {
  colors: typeof lightColors;
  spacing: typeof spacing;
  typography: typeof typography;
  glassmorphism: typeof glassmorphism;
  scheme: ColorSchemeName;
  toggleScheme?: () => void;
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [scheme, setScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    const sub = Appearance.addChangeListener(({colorScheme}) => {
      setScheme(colorScheme ?? 'light');
    });
    return () => sub.remove();
  }, []);

  const toggleScheme = () => setScheme(s => (s === 'dark' ? 'light' : 'dark'));

  const theme = useMemo<Theme>(() => {
    const colors = scheme === 'dark' ? darkColors : lightColors;
    return {colors, spacing, typography, glassmorphism, scheme, toggleScheme};
  }, [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
