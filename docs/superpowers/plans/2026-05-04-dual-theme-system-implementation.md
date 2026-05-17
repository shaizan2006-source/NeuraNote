# Dual Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete dual-theme system (Gradient Mode default + Dark Mode/Teal) with theme toggle, persistent storage, smooth animations, and AI Dust idle animation.

**Architecture:** 
- React Context for theme state management + localStorage/Supabase persistence
- CSS variables for dynamic color switching (no component rewrites needed)
- Canvas-based AI Dust animation for idle states
- Navbar dropdown toggle with 250ms theme transition animation

**Tech Stack:** React 18, Next.js, TypeScript, Supabase (auth + user_profiles), CSS3 (custom properties + animations)

---

## 📁 File Structure

**Files to Create:**
```
src/
├── types/
│   └── theme.ts                          [Theme TypeScript types]
├── context/
│   └── ThemeContext.tsx                  [React Context + Provider]
├── hooks/
│   ├── useTheme.ts                       [Theme management hook]
│   └── useIdleDetection.ts               [Idle detection hook]
├── components/
│   ├── Theme/
│   │   ├── ThemeToggle.tsx               [Sun/Moon icon + dropdown]
│   │   ├── ThemeProvider.tsx             [Wrapper component]
│   │   └── theme-toggle.module.css       [Dropdown styles]
│   └── AIDust/
│       ├── AIDustLayer.tsx               [Canvas animation]
│       ├── ai-dust.config.ts             [Configuration]
│       └── ai-dust.css                   [CSS]
└── styles/
    ├── variables.css                     [CSS variables for both themes]
    ├── theme-animation.css               [Theme transition animation]
    └── dust-animation.css                [Dust particle animation]

Files to Modify:
├── app/layout.tsx                        [Wrap with ThemeProvider, add AIDustLayer]
├── app/components/navbar.tsx             [Add ThemeToggle]
├── app/globals.css                       [Import new CSS files]
└── tsconfig.json                         [Verify path aliases]

Database:
└── migrations/
    └── [timestamp]_add_theme_preference.sql  [Add theme_preference to user_profiles]
```

---

## ✅ PHASE 1: SETUP (Core Infrastructure)

### Task 1: Create Theme Types

**Files:**
- Create: `src/types/theme.ts`

- [ ] **Step 1: Write TypeScript types file**

```typescript
// src/types/theme.ts

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
```

- [ ] **Step 2: Verify file created**

Run: `ls -la src/types/theme.ts`
Expected: File exists with 100+ lines

- [ ] **Step 3: Commit**

```bash
git add src/types/theme.ts
git commit -m "types: add theme system TypeScript definitions"
```

---

### Task 2: Create React Context & Provider

**Files:**
- Create: `src/context/ThemeContext.tsx`

- [ ] **Step 1: Write ThemeContext**

```typescript
// src/context/ThemeContext.tsx

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode, ThemeContextType, DEFAULT_THEME } from '@/types/theme';
import { supabase } from '@/lib/supabase'; // Adjust path to your supabase client

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
```

- [ ] **Step 2: Verify file created**

Run: `ls -la src/context/ThemeContext.tsx`
Expected: File exists, ~140 lines

- [ ] **Step 3: Commit**

```bash
git add src/context/ThemeContext.tsx
git commit -m "feat: create theme context with localStorage + Supabase persistence"
```

---

### Task 3: Create useTheme Hook

**Files:**
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Write hook**

```typescript
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
```

- [ ] **Step 2: Verify file created**

Run: `ls -la src/hooks/useTheme.ts`
Expected: File exists, ~25 lines

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTheme.ts
git commit -m "feat: create useTheme hook for component-level theme access"
```

---

### Task 4: Create CSS Variables File

**Files:**
- Create: `src/styles/variables.css`

- [ ] **Step 1: Write CSS variables**

```css
/* src/styles/variables.css */

/**
 * Theme CSS Variables
 * Both gradient (default) and dark (teal) modes defined here
 * Applied via :root class (theme-gradient, theme-dark, theme-light)
 */

:root.theme-gradient {
  /* Gradient Mode (Default - Purple + Cyan) */
  --color-brand: #8B5CF6;
  --color-brand-dark: #6D28D9;
  --color-brand-light: #8B5CF6;
  --color-ai-signal: #22D3EE;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;

  --bg-base: linear-gradient(to bottom, #0A0A0A, #1A1A2E);
  --bg-surface: #111111;
  --bg-surface-alt: #18181B;
  --bg-surface-alt-2: #1F1F23;

  --color-text-primary: #FFFFFF;
  --color-text-secondary: #E5E7EB;
  --color-border: rgba(255, 255, 255, 0.06);
  --color-border-strong: rgba(255, 255, 255, 0.12);

  /* Semantic */
  --color-info: #3B82F6;
  --color-tip: #8B5CF6;
}

:root.theme-dark {
  /* Dark Mode (Teal Accent) */
  --color-brand: #14B8A6;
  --color-brand-dark: #0D9488;
  --color-brand-light: #2DD4BF;
  --color-ai-signal: #2DD4BF;
  --color-success: #10B981;
  --color-warning: #FBBF24;
  --color-error: #F43F5E;

  --bg-base: #050505;
  --bg-surface: #0F0F0F;
  --bg-surface-alt: #1A1A1A;
  --bg-surface-alt-2: #252525;

  --color-text-primary: #FFFFFF;
  --color-text-secondary: #E5E7EB;
  --color-border: rgba(255, 255, 255, 0.06);
  --color-border-strong: rgba(255, 255, 255, 0.12);

  /* Semantic */
  --color-info: #3B82F6;
  --color-tip: #10B981;
}

:root.theme-light {
  /* Light Mode (Coming Soon) */
  --color-brand: #8B5CF6;
  --color-brand-dark: #6D28D9;
  --color-brand-light: #8B5CF6;
  --color-ai-signal: #22D3EE;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;

  --bg-base: #FFFFFF;
  --bg-surface: #F5F5F5;
  --bg-surface-alt: #EEEEEE;
  --bg-surface-alt-2: #E5E5E5;

  --color-text-primary: #000000;
  --color-text-secondary: #666666;
  --color-border: rgba(0, 0, 0, 0.06);
  --color-border-strong: rgba(0, 0, 0, 0.12);

  /* Semantic */
  --color-info: #3B82F6;
  --color-tip: #8B5CF6;
}

/* Transition for smooth theme switching */
html {
  transition: background-color 250ms ease-in-out;
}

body {
  background-color: var(--bg-base);
  color: var(--color-text-primary);
  transition: background-color 250ms ease-in-out, color 250ms ease-in-out;
}
```

- [ ] **Step 2: Verify file created**

Run: `ls -la src/styles/variables.css`
Expected: File exists, ~70 lines

- [ ] **Step 3: Commit**

```bash
git add src/styles/variables.css
git commit -m "style: add CSS variables for both theme modes"
```

---

### Task 5: Create Theme Transition Animation CSS

**Files:**
- Create: `src/styles/theme-animation.css`

- [ ] **Step 1: Write animation CSS**

```css
/* src/styles/theme-animation.css */

/**
 * Theme switching animation
 * 250ms left-to-right slide with color transition mid-slide
 */

@keyframes themeSlideOut {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  50% {
    transform: translateX(-20px);
    opacity: 0.8;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

.theme-transitioning {
  animation: themeSlideOut 250ms ease-in-out;
}

/* Card hover animation (applies to all theme modes) */
@keyframes cardHover {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-2px);
  }
}

.card:hover {
  animation: cardHover 200ms ease-out forwards;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: box-shadow 200ms ease-out;
}

/* Button press animation for primary buttons */
@keyframes buttonPress {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0.97);
  }
}

.button-primary:active {
  animation: buttonPress 100ms ease-in forwards;
}

/* AI Breathing pulse animation */
@keyframes aiBreathPulse {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.ai-breath-pulse {
  animation: aiBreathPulse 3s infinite ease-in-out;
}

/* Secondary button hover */
.button-secondary:hover {
  opacity: 0.7;
  transition: opacity 200ms ease-out, border-color 200ms ease-out;
}
```

- [ ] **Step 2: Verify file created**

Run: `ls -la src/styles/theme-animation.css`
Expected: File exists, ~70 lines

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme-animation.css
git commit -m "style: add theme transition and component animations"
```

---

### Task 6: Create ThemeToggle Component

**Files:**
- Create: `src/components/Theme/ThemeToggle.tsx`
- Create: `src/components/Theme/theme-toggle.module.css`

- [ ] **Step 1: Write ThemeToggle component**

```typescript
// src/components/Theme/ThemeToggle.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ThemeMode } from '@/types/theme';
import styles from './theme-toggle.module.css';

export function ThemeToggle() {
  const { theme, setTheme, isLoading } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleThemeSelect = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  if (isLoading) {
    return <div className={styles.togglePlaceholder} />;
  }

  return (
    <div className={styles.themeToggleWrapper} ref={dropdownRef}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme menu"
        aria-expanded={isOpen}
      >
        {theme === 'gradient' && (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
        {theme === 'dark' && (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={`${styles.dropdownItem} ${theme === 'dark' ? styles.active : ''}`}
            onClick={() => handleThemeSelect('dark')}
          >
            <span className={styles.icon}>🌙</span>
            Dark Mode (Teal)
            {theme === 'dark' && <span className={styles.checkmark}>✓</span>}
          </button>

          <button
            className={`${styles.dropdownItem} ${styles.disabled}`}
            disabled
            title="Coming soon"
          >
            <span className={styles.icon}>☀️</span>
            Light Mode
            <span className={styles.badge}>Coming soon</span>
          </button>

          <button
            className={`${styles.dropdownItem} ${theme === 'gradient' ? styles.active : ''}`}
            onClick={() => handleThemeSelect('gradient')}
          >
            <span className={styles.icon}>🎨</span>
            Gradient Mode
            {theme === 'gradient' && <span className={styles.checkmark}>✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write theme-toggle.module.css**

```css
/* src/components/Theme/theme-toggle.module.css */

.themeToggleWrapper {
  position: relative;
  display: inline-block;
}

.toggleButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 200ms ease-out;
}

.toggleButton:hover {
  border-color: var(--color-brand);
  background: var(--bg-surface-alt);
}

.toggleButton:active {
  transform: scale(0.97);
}

.icon {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Dropdown menu */
.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: var(--bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: dropdownSlideIn 150ms ease-out;
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdownItem {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms ease-out;
  text-align: left;
}

.dropdownItem:not(.disabled):hover {
  background: var(--bg-surface-alt);
}

.dropdownItem.active {
  background: var(--bg-surface-alt);
  color: var(--color-brand);
  font-weight: 500;
}

.dropdownItem.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkmark {
  margin-left: auto;
  color: var(--color-brand);
  font-weight: bold;
}

.badge {
  margin-left: auto;
  background: var(--color-warning);
  color: #000;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.togglePlaceholder {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-surface-alt);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
```

- [ ] **Step 3: Verify files created**

Run: `ls -la src/components/Theme/`
Expected: Both ThemeToggle.tsx and theme-toggle.module.css exist

- [ ] **Step 4: Commit**

```bash
git add src/components/Theme/
git commit -m "feat: create ThemeToggle component with dropdown menu"
```

---

### Task 7: Update App Layout (Wire Provider & Toggle)

**Files:**
- Modify: `app/layout.tsx` (or root layout file)
- Modify: `app/components/navbar.tsx` (or equivalent)

- [ ] **Step 1: Add ThemeProvider to root layout**

Read the current layout file first to understand its structure, then add:

```typescript
// app/layout.tsx - key changes

import { ThemeProvider } from '@/context/ThemeContext';
import '@/styles/variables.css';        // Add this import
import '@/styles/theme-animation.css';   // Add this import

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head>
        {/* existing meta tags */}
      </head>
      <body>
        <ThemeProvider>
          {/* existing layout components */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add ThemeToggle to navbar**

```typescript
// app/components/navbar.tsx - add to header/navbar component

import { ThemeToggle } from '@/components/Theme/ThemeToggle';

export function Navbar() {
  return (
    <nav className="navbar">
      {/* existing nav items */}
      
      <div className="navbar-actions">
        <ThemeToggle />
        {/* other action items (user menu, etc) */}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Verify changes**

Run: `grep -n "ThemeProvider\|ThemeToggle" app/layout.tsx app/components/navbar.tsx`
Expected: Both imports and components appear in the files

- [ ] **Step 4: Test that app compiles**

Run: `npm run build` (or your build command)
Expected: Build succeeds with no errors related to theme

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/components/navbar.tsx app/globals.css
git commit -m "feat: integrate ThemeProvider and ThemeToggle into app"
```

---

### Task 8: Create Supabase Migration (Add theme_preference Column)

**Files:**
- Create: `supabase/migrations/[timestamp]_add_theme_preference.sql`

- [ ] **Step 1: Create migration file**

Get current timestamp (e.g., `20260504120000`):

```sql
-- supabase/migrations/20260504120000_add_theme_preference.sql

-- Add theme_preference column to user_profiles table
-- Allows storing user's theme choice (gradient, dark, light)

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'gradient'
CHECK (theme_preference IN ('gradient', 'dark', 'light'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_theme_preference 
ON public.user_profiles(theme_preference);

-- Comment for clarity
COMMENT ON COLUMN public.user_profiles.theme_preference IS 'User theme preference: gradient, dark, or light';
```

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase CLI or dashboard:

```bash
supabase migration up
```

Or manually run the SQL in Supabase dashboard

Expected: No errors, column added to user_profiles

- [ ] **Step 3: Commit migration file**

```bash
git add supabase/migrations/20260504120000_add_theme_preference.sql
git commit -m "db: add theme_preference column to user_profiles"
```

---

## ✅ PHASE 1 CHECKPOINT

**Verify Phase 1 is complete:**

- [ ] All CSS variables working (`npm run dev`, inspect root element for `theme-gradient` class)
- [ ] ThemeToggle appears in navbar
- [ ] Clicking toggle opens dropdown with 3 options
- [ ] Selecting "Dark Mode" applies teal theme (check CSS variables change)
- [ ] Selecting "Gradient Mode" applies purple theme
- [ ] Theme persists in localStorage (`open DevTools → Application → Storage → localStorage → ask-my-notes:theme`)
- [ ] No console errors
- [ ] Build succeeds (`npm run build`)

**If all pass:** Ready for Phase 2 (AI Dust Layer). If any fail, debug before continuing.

---

## 📋 NEXT PHASE: Phase 2 (AI Dust Animation - SEPARATE PLAN)

The AI Dust Layer is a self-contained feature. Due to complexity (Canvas API, idle detection, configuration), it should be implemented in a **separate, dedicated plan**:

**File:** `docs/superpowers/plans/2026-05-04-ai-dust-idle-animation-implementation.md`

**Why separate:**
- Independent of theme system (works with both themes)
- Isolates Canvas rendering logic
- Allows separate testing & performance profiling
- Clearer task boundaries

---

## 📊 SPEC COVERAGE CHECKLIST

- [x] Color systems (both gradient and dark modes) - Task 1
- [x] CSS variables for dynamic switching - Task 4
- [x] Theme context + persistence (localStorage + Supabase) - Task 2
- [x] Theme toggle dropdown in navbar - Task 6
- [x] 250ms theme transition animation - Task 5
- [x] TypeScript types - Task 1
- [x] useTheme hook for components - Task 3
- [ ] AI Dust Idle Animation - Phase 2 (separate plan)
- [ ] Integration into existing components - Phase 2 (separate plan)
- [ ] Testing & validation - Phase 3 (separate plan)

---

## 🎯 EXECUTION PATH

**Phase 1 completion time:** ~2-3 hours  
**Recommended approach:** Subagent-driven (one task per subagent for isolation)

---

**Plan Status:** ✅ COMPLETE & READY FOR EXECUTION  
**Date:** May 4, 2026  
**Version:** 1.0
