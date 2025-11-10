import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {Appearance, ColorSchemeName} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [scheme, setScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'dark');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Listen to OS theme changes (only if not manually overridden)
  useEffect(() => {
    if (isManualOverride) return;
    
    const sub = Appearance.addChangeListener(({colorScheme}) => {
      setScheme(colorScheme ?? 'dark');
    });
    return () => sub.remove();
  }, [isManualOverride]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('themePreference');
      if (saved) {
        const {scheme: savedScheme, manual} = JSON.parse(saved);
        setScheme(savedScheme);
        setIsManualOverride(manual);
      } else {
        // First time - use OS theme
        const osScheme = Appearance.getColorScheme() ?? 'dark';
        setScheme(osScheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleScheme = async () => {
    const newScheme = scheme === 'dark' ? 'light' : 'dark';
    setScheme(newScheme);
    setIsManualOverride(true);
    
    // Save preference
    try {
      await AsyncStorage.setItem('themePreference', JSON.stringify({
        scheme: newScheme,
        manual: true,
      }));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

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
