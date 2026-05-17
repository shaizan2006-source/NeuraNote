# AI Dust Idle Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a canvas-based AI Dust idle animation that activates after 5s of inactivity, rendering subtle falling particles themed to the active color scheme.

**Architecture:**
- Canvas element rendered as a fixed overlay (not DOM nodes — single canvas for performance)
- `useIdleDetection` hook monitors global user events and exposes `isIdle` state
- `AIDustLayer` component reads the active theme and renders teal or cyan glow particles
- Config-driven constants make tuning trivial without touching component logic

**Tech Stack:** React 18, Next.js (App Router), TypeScript, Canvas API, `requestAnimationFrame`

---

## 📁 File Structure

**Files to Create:**
```
src/
├── components/
│   └── AIDust/
│       ├── AIDustLayer.tsx          [Canvas overlay + animation loop]
│       ├── useIdleDetection.ts      [Idle detection hook]
│       ├── ai-dust.config.ts        [All tunable constants]
│       └── ai-dust.css              [Canvas CSS + reduced-motion override]
```

**Files to Modify:**
```
src/
└── app/
    └── layout.js                    [Add <AIDustLayer /> inside <ThemeProvider>]
```

---

## ✅ TASK 1: Create `ai-dust.config.ts`

**Files:**
- Create: `src/components/AIDust/ai-dust.config.ts`

- [ ] **Step 1: Write config file**

```typescript
// src/components/AIDust/ai-dust.config.ts

export const AI_DUST_CONFIG = {
  // Idle detection
  IDLE_TIMEOUT: 5000,

  // Particle generation
  MAX_PARTICLES: 30,
  CREATION_RATE: 200,
  PARTICLE_SIZE: 2,

  // Particle physics
  DRIFT_VELOCITY_X: 0.5,
  DRIFT_VELOCITY_Y: { min: 0.3, max: 0.5 },
  PARTICLE_LIFETIME: 300,

  // Opacity
  MIN_OPACITY: 0.2,
  MAX_OPACITY: 0.5,

  // Teal/Cyan glow probability and colours
  GLOW_PARTICLE_RATIO: 0.15,

  TEAL_COLOR:  'rgba(45, 212, 191, 0.6)',   // #2DD4BF — dark mode
  TEAL_GLOW:   'rgba(45, 212, 191, 0.4)',
  CYAN_COLOR:  'rgba(34, 211, 238, 0.6)',   // #22D3EE — gradient mode
  CYAN_GLOW:   'rgba(34, 211, 238, 0.4)',
  GLOW_SHADOW_BLUR: 4,

  // Fade-in duration
  FADE_IN_DURATION: 300,

  // Scope selectors tried in order; falls back to document.body
  SCOPE_SELECTORS: [
    '.chat-area',
    '.ask-ai-container',
    '[data-dust-scope]',
  ],

  // Routes where dust is disabled (study / reading pages)
  DISABLED_ROUTES: ['/ask-ai', '/my-pdfs'],
} as const;
```

- [ ] **Step 2: Verify file created**

```powershell
ls "C:\Users\Shafi\ask-my-notes\src\components\AIDust\ai-dust.config.ts"
```

Expected: file present, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AIDust/ai-dust.config.ts
git commit -m "feat: add AI Dust animation config"
```

---

## ✅ TASK 2: Create `useIdleDetection.ts`

**Files:**
- Create: `src/components/AIDust/useIdleDetection.ts`

- [ ] **Step 1: Write hook**

```typescript
// src/components/AIDust/useIdleDetection.ts

'use client';

import { useEffect, useRef, useState } from 'react';

interface UseIdleDetectionOptions {
  timeout?: number;
  enabled?: boolean;
  onIdleStart?: () => void;
  onIdleEnd?: () => void;
}

export function useIdleDetection({
  timeout = 5000,
  enabled = true,
  onIdleStart,
  onIdleEnd,
}: UseIdleDetectionOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setIsIdle(false);
      isIdleRef.current = false;
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
        onIdleEnd?.();
      }

      timerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        setIsIdle(true);
        onIdleStart?.();
      }, timeout);
    };

    const events = [
      'mousemove',
      'keydown',
      'scroll',
      'click',
      'touchstart',
      'touchmove',
    ] as const;

    events.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    resetTimer(); // start the first timer

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [timeout, enabled, onIdleStart, onIdleEnd]);

  return isIdle;
}
```

- [ ] **Step 2: Verify file created**

```powershell
ls "C:\Users\Shafi\ask-my-notes\src\components\AIDust\useIdleDetection.ts"
```

Expected: file present.

- [ ] **Step 3: Commit**

```bash
git add src/components/AIDust/useIdleDetection.ts
git commit -m "feat: add useIdleDetection hook with touchstart/touchmove support"
```

---

## ✅ TASK 3: Create `ai-dust.css`

**Files:**
- Create: `src/components/AIDust/ai-dust.css`

- [ ] **Step 1: Write CSS**

```css
/* src/components/AIDust/ai-dust.css */

.ai-dust-canvas {
  position: fixed;
  pointer-events: none;
  z-index: 40;
  opacity: 0;
  transition: opacity 0.3s ease-in;
  will-change: opacity;
}

.ai-dust-canvas.visible {
  opacity: 1;
  transition: opacity 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .ai-dust-canvas {
    display: none;
  }
}
```

- [ ] **Step 2: Verify file created**

```powershell
ls "C:\Users\Shafi\ask-my-notes\src\components\AIDust\ai-dust.css"
```

Expected: file present, ~20 lines.

- [ ] **Step 3: Commit**

```bash
git add src/components/AIDust/ai-dust.css
git commit -m "style: add AI Dust canvas CSS with reduced-motion support"
```

---

## ✅ TASK 4: Create `AIDustLayer.tsx`

**Files:**
- Create: `src/components/AIDust/AIDustLayer.tsx`

- [ ] **Step 1: Write component**

```typescript
// src/components/AIDust/AIDustLayer.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIdleDetection } from './useIdleDetection';
import { AI_DUST_CONFIG } from './ai-dust.config';
import { useTheme } from '@/hooks/useTheme';
import './ai-dust.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  isGlow: boolean;
  age: number;
}

interface AIDustLayerProps {
  disabled?: boolean;
}

export default function AIDustLayer({ disabled = false }: AIDustLayerProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  // Glow colour depends on current theme
  const glowColor = theme === 'dark' ? AI_DUST_CONFIG.TEAL_COLOR : AI_DUST_CONFIG.CYAN_COLOR;
  const glowShadow = theme === 'dark' ? AI_DUST_CONFIG.TEAL_GLOW : AI_DUST_CONFIG.CYAN_GLOW;

  // Detect eligibility once on mount (client-only)
  useEffect(() => {
    const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowEnd = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
    setIsEnabled(!isMobile && !prefersReduced && !isLowEnd);
  }, []);

  const isRouteDisabled = AI_DUST_CONFIG.DISABLED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const shouldRun = isEnabled && !disabled && !isRouteDisabled;

  const isIdle = useIdleDetection({
    timeout: AI_DUST_CONFIG.IDLE_TIMEOUT,
    enabled: shouldRun,
  });

  // Main animation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isIdle || !shouldRun) {
      // Stop animation + clear
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      particlesRef.current = [];
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find scope element
    let scopeEl: Element | null = null;
    for (const sel of AI_DUST_CONFIG.SCOPE_SELECTORS) {
      scopeEl = document.querySelector(sel);
      if (scopeEl) break;
    }
    if (!scopeEl) scopeEl = document.body;

    const rect = scopeEl.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
    canvas.style.left = `${rect.left}px`;
    canvas.style.top  = `${rect.top}px`;

    let lastCreation = 0;

    const spawnParticle = () => {
      if (particlesRef.current.length >= AI_DUST_CONFIG.MAX_PARTICLES) return;
      particlesRef.current.push({
        x:       Math.random() * canvas.width,
        y:       -10,
        vx:      (Math.random() - 0.5) * AI_DUST_CONFIG.DRIFT_VELOCITY_X,
        vy:      AI_DUST_CONFIG.DRIFT_VELOCITY_Y.min +
                 Math.random() * (AI_DUST_CONFIG.DRIFT_VELOCITY_Y.max - AI_DUST_CONFIG.DRIFT_VELOCITY_Y.min),
        opacity: AI_DUST_CONFIG.MIN_OPACITY +
                 Math.random() * (AI_DUST_CONFIG.MAX_OPACITY - AI_DUST_CONFIG.MIN_OPACITY),
        isGlow:  Math.random() < AI_DUST_CONFIG.GLOW_PARTICLE_RATIO,
        age:     0,
      });
    };

    const animate = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (now - lastCreation > AI_DUST_CONFIG.CREATION_RATE) {
        spawnParticle();
        lastCreation = now;
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.age++;
        p.x += p.vx;
        p.y += p.vy;

        const fade = 1 - p.age / AI_DUST_CONFIG.PARTICLE_LIFETIME;
        const alpha = p.opacity * fade;

        ctx.beginPath();
        if (p.isGlow) {
          ctx.fillStyle   = glowColor;
          ctx.shadowColor = glowShadow;
          ctx.shadowBlur  = AI_DUST_CONFIG.GLOW_SHADOW_BLUR;
        } else {
          ctx.fillStyle   = `rgba(255,255,255,${alpha})`;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur  = 0;
        }
        ctx.arc(p.x, p.y, AI_DUST_CONFIG.PARTICLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        return p.age < AI_DUST_CONFIG.PARTICLE_LIFETIME;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      particlesRef.current = [];
    };
  }, [isIdle, shouldRun, glowColor, glowShadow]);

  if (!isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`ai-dust-canvas${isIdle && shouldRun ? ' visible' : ''}`}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Verify file created**

```powershell
ls "C:\Users\Shafi\ask-my-notes\src\components\AIDust\AIDustLayer.tsx"
```

Expected: file present, ~130 lines.

- [ ] **Step 3: Commit**

```bash
git add src/components/AIDust/AIDustLayer.tsx
git commit -m "feat: add canvas-based AIDustLayer with theme-aware glow particles"
```

---

## ✅ TASK 5: Integrate AIDustLayer into Root Layout

**Files:**
- Modify: `src/app/layout.js`

- [ ] **Step 1: Read current layout**

Read `src/app/layout.js` (already known: ThemeProvider wraps children).

- [ ] **Step 2: Add AIDustLayer import and usage**

Add this import at the top of layout.js:

```javascript
import AIDustLayer from "@/components/AIDust/AIDustLayer";
```

Update the body JSX to include AIDustLayer inside ThemeProvider:

```javascript
<ThemeProvider>
  <AIDustLayer />
  {children}
</ThemeProvider>
```

Full layout.js after changes:

```javascript
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import AIDustLayer from "@/components/AIDust/AIDustLayer";
import "@/styles/variables.css";
import "@/styles/theme-animation.css";

// ... font + metadata unchanged ...

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AIDustLayer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify integration**

```bash
grep -n "AIDustLayer" src/app/layout.js
```

Expected:
```
2: import AIDustLayer from "@/components/AIDust/AIDustLayer";
53: <AIDustLayer />
```

- [ ] **Step 4: Run build to confirm no errors**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully` or `✓ Generating static pages`

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.js
git commit -m "feat: integrate AIDustLayer into root layout"
```

---

## ✅ PHASE 2 CHECKPOINT

After all 5 tasks, verify:

- [ ] All 4 AIDust files exist in `src/components/AIDust/`
- [ ] AIDustLayer imported in `src/app/layout.js`
- [ ] Build compiles with no errors (`npm run build`)
- [ ] Open localhost:3000/dashboard — stop interacting for 5s — subtle particles appear
- [ ] Move mouse — particles stop immediately
- [ ] Switch theme — glow colour changes (cyan → teal or vice versa)
- [ ] Open DevTools → Performance → confirm 60 fps during animation
- [ ] Open DevTools → Console → no errors or fallback warnings
- [ ] On mobile (or DevTools device emulation) — no particles rendered

---

## 📊 SPEC COVERAGE

| Spec Requirement | Task |
|---|---|
| Canvas-based particles (not DOM nodes) | Task 4 |
| requestAnimationFrame (not setInterval) | Task 4 |
| Max 30 particles (memory cap) | Task 1 (config) + Task 4 |
| 5s idle trigger | Task 1 (config) + Task 2 |
| Stops immediately on interaction | Task 2 |
| Teal glow in dark mode | Task 4 |
| Cyan glow in gradient mode | Task 4 |
| Fallback selector chain | Task 4 |
| Disabled on /ask-ai, /my-pdfs | Task 1 (config) + Task 4 |
| Mobile disabled | Task 4 |
| prefers-reduced-motion | Task 3 (CSS) + Task 4 |
| Low-end device disabled (≤2 cores) | Task 4 |
| Fade-in 300ms on start | Task 3 (CSS) |
| Cleanup on unmount | Task 4 |

---

**Plan Status:** ✅ COMPLETE — Ready for execution  
**Date:** May 4, 2026
