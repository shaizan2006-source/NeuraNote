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
  gradient: {
    brand: '#8B5CF6',
    aiSignal: '#22D3EE',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    bgBase: 'linear-gradient(to bottom, #0A0A0A, #1A1A2E)',
    bgSurface: '#111111',
    textPrimary: '#FFFFFF',
    textSecondary: '#E5E7EB',
    border: 'rgba(255, 255, 255, 0.06)',
  },
  dark: {
    brand: '#14B8A6',
    brandLight: '#2DD4BF',
    aiSignal: '#2DD4BF',
    success: '#10B981',
    warning: '#FBBF24',
    error: '#F43F5E',
    bgBase: '#050505',
    bgSurface: '#0F0F0F',
    textPrimary: '#FFFFFF',
    textSecondary: '#E5E7EB',
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
