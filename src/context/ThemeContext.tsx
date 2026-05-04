'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode, ThemeContextType, DEFAULT_THEME } from '@/types/theme';
import { supabase } from '@/lib/supabase';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Try to get user's authenticated theme preference
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // User authenticated: fetch from user_profiles
          const { data, error } = await supabase
            .from('user_profiles')
            .select('theme_preference')
            .eq('id', user.id)
            .single();

          if (!error && data?.theme_preference) {
            const savedTheme = data.theme_preference as ThemeMode;
            setThemeState(savedTheme);
            applyTheme(savedTheme);
            setIsLoading(false);
            return;
          }
        }

        // Not authenticated: try localStorage
        const storedTheme = localStorage.getItem('ask-my-notes:theme') as ThemeMode | null;
        if (storedTheme) {
          setThemeState(storedTheme);
          applyTheme(storedTheme);
        } else {
          // Default to gradient mode
          setThemeState(DEFAULT_THEME);
          applyTheme(DEFAULT_THEME);
        }
      } catch (error) {
        console.error('[ThemeProvider] Error initializing theme:', error);
        setThemeState(DEFAULT_THEME);
        applyTheme(DEFAULT_THEME);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, []);

  const applyTheme = (newTheme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove('theme-gradient', 'theme-dark', 'theme-light');
    root.classList.add(`theme-${newTheme}`);
  };

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Save to localStorage immediately (for offline/unauthenticated)
    localStorage.setItem('ask-my-notes:theme', newTheme);

    // Try to save to user account (if authenticated)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('user_profiles')
          .update({ theme_preference: newTheme })
          .eq('id', user.id);
      }
    } catch (error) {
      console.warn('[ThemeProvider] Could not save theme to account:', error);
      // Fail silently - localStorage fallback is enough
    }
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    isLoading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}
