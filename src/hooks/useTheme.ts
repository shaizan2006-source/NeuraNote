// src/hooks/useTheme.ts

'use client';

import { useThemeContext } from '@/context/ThemeContext';
import { ThemeMode, THEME_COLORS } from '@/types/theme';

export function useTheme() {
  const { theme, setTheme, isLoading } = useThemeContext();

  const colors = THEME_COLORS[theme];

  return {
    theme,
    setTheme,
    colors,
    isLoading,
    isDarkMode: theme === 'dark',
    isGradientMode: theme === 'gradient',
  };
}
