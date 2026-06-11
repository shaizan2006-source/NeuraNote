/**
 * Theme type definitions
 * Supports three theme modes: gradient (default), dark (teal), light (coming soon)
 */

export type ThemeMode = 'gradient' | 'dark' | 'light';

export interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isLoading: boolean;
}

export interface ThemeColors {
  brand: string;
  brandLight?: string;
  aiSignal: string;
  success: string;
  warning: string;
  error: string;
  bgBase: string;
  bgSurface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

export const THEME_COLORS: Record<ThemeMode, ThemeColors> = {
  // Obsidian & Aurum — keep in sync with src/styles/variables.css (canonical)
  gradient: {
    brand: '#D4AF6E',
    brandLight: '#EACF96',
    aiSignal: '#EACF96',
    success: '#34D399',
    warning: '#F5B544',
    error: '#F0584F',
    bgBase: '#08080A',
    bgSurface: '#131317',
    textPrimary: '#F5F5F4',
    textSecondary: '#A1A1A6',
    border: 'rgba(255, 255, 255, 0.06)',
  },
  dark: {
    brand: '#D4AF6E',
    brandLight: '#EACF96',
    aiSignal: '#EACF96',
    success: '#34D399',
    warning: '#F5B544',
    error: '#F0584F',
    bgBase: '#08080A',
    bgSurface: '#131317',
    textPrimary: '#F5F5F4',
    textSecondary: '#A1A1A6',
    border: 'rgba(255, 255, 255, 0.06)',
  },
  light: {
    brand: '#8B5CF6',
    aiSignal: '#22D3EE',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    bgBase: '#FFFFFF',
    bgSurface: '#F5F5F5',
    textPrimary: '#000000',
    textSecondary: '#666666',
    border: 'rgba(0, 0, 0, 0.06)',
  },
};

export const DEFAULT_THEME: ThemeMode = 'gradient';
