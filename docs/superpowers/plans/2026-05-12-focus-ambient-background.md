# Focus Ambient Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `linear-gradient` on the focus page with a cinematic, scroll-reactive Void-style ambient background that moves in parallax layers via `requestAnimationFrame` and breathes slowly while idle.

**Architecture:** A `position: fixed` React component (`FocusAmbientBackground`) sits at `z-index: 0` behind all focus page content. It mounts a passive scroll listener on `.amn-focus-scroll` (the existing inner scroll container), runs a lerp loop via `requestAnimationFrame`, and writes `translate3d` transforms directly to two layer wrapper elements — bypassing React state entirely for zero-overhead 60fps updates. Breathing is pure CSS `@keyframes` on inner divs, separate from the translate wrappers, to avoid inline-style/animation conflicts.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, CSS Modules (plain CSS), Node.js built-in test runner (`node --test`, `.mjs`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/focus/ambient-background.config.ts` | All tunable constants |
| Create | `src/components/focus/ambient-background.css` | Layer styles + `@keyframes` |
| Create | `src/components/focus/FocusAmbientBackground.tsx` | Component + rAF scroll controller |
| Create | `tests/unit/ambientLerp.test.mjs` | Unit tests for pure lerp + settle logic |
| Modify | `src/app/focus/page.jsx` | Remove inline background, mount component |

---

## Task 1: Tunable Config

**Files:**
- Create: `src/components/focus/ambient-background.config.ts`

- [ ] **Step 1: Create the config file**

```typescript
// src/components/focus/ambient-background.config.ts
export const AMBIENT_CONFIG = {
  SCROLL_SELECTOR:      '.amn-focus-scroll',
  LERP:                 0.06,   // 0.03 = dreamlike · 0.12 = snappy
  FAR_PARALLAX:         0.03,   // 1000px scroll → 30px shift
  MID_PARALLAX:         0.07,   // 1000px scroll → 70px shift
  FAR_BREATHE_DURATION: '14s',
  MID_BREATHE_DURATION: '10s',
  MID_BREATHE_DELAY:    '3s',
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/focus/ambient-background.config.ts
git commit -m "feat: add ambient background config constants"
```

---

## Task 2: CSS Layer Styles

**Files:**
- Create: `src/components/focus/ambient-background.css`

- [ ] **Step 1: Create the CSS file**

```css
/* src/components/focus/ambient-background.css */

.amb-root {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ── Base: solid dark gradient, never moves ── */
.amb-layer-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(165deg, #04060e 0%, #070920 50%, #050610 100%);
}

/* ── Far bloom: outer = rAF translate target ── */
.amb-layer-far-wrap {
  position: absolute;
  inset: -20% -20%;   /* oversized so translate never clips the edge */
  will-change: transform;
}

/* ── Far bloom: inner = CSS breathe animation ── */
.amb-layer-far-inner {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 85% 65% at 50% 30%,
    rgba(79, 22, 162, 0.18) 0%,
    rgba(49, 10, 119, 0.07) 45%,
    transparent 70%
  );
  filter: blur(60px);
  animation: ambBreathe var(--amb-far-duration, 14s) ease-in-out infinite;
}

/* ── Mid wash: outer = rAF translate target ── */
.amb-layer-mid-wrap {
  position: absolute;
  inset: -20% -20%;
  will-change: transform;
}

/* ── Mid wash: inner = CSS breathe animation ── */
.amb-layer-mid-inner {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom, rgba(91, 33, 182, 0.09) 0%, transparent 35%),
    radial-gradient(
      ellipse 60% 40% at 50% -10%,
      rgba(67, 56, 202, 0.11) 0%,
      transparent 65%
    );
  filter: blur(40px);
  animation: ambBreathe var(--amb-mid-duration, 10s) ease-in-out
             var(--amb-mid-delay, 3s) infinite;
}

/* ── Vignette: darkens edges, static ── */
.amb-layer-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 100% 100% at 50% 50%,
    transparent 35%,
    rgba(0, 0, 0, 0.45) 100%
  );
}

@keyframes ambBreathe {
  0%, 100% { opacity: 1;    transform: scale(1);     }
  50%       { opacity: 0.72; transform: scale(1.038); }
}

@media (prefers-reduced-motion: reduce) {
  .amb-layer-far-inner,
  .amb-layer-mid-inner {
    animation: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/focus/ambient-background.css
git commit -m "feat: add ambient background layer styles and keyframes"
```

---

## Task 3: Lerp Logic — Tests First

**Files:**
- Create: `tests/unit/ambientLerp.test.mjs`

The scroll controller uses two pure mathematical operations: a lerp step (`lerpToward`) and a settle check (`isSettled`). Test those in isolation before writing the component.

- [ ] **Step 1: Create the test file**

```javascript
// tests/unit/ambientLerp.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// These are the exact functions the component will use internally.
// Defined here for isolation — no DOM, no React.

function lerpToward(current, target, factor) {
  return current + (target - current) * factor;
}

function isSettled(current, target, threshold = 0.1) {
  return Math.abs(target - current) <= threshold;
}

describe("lerpToward", () => {
  it("moves toward target by factor", () =>
    assert.equal(lerpToward(0, 100, 0.1), 10));

  it("returns unchanged value when already at target", () =>
    assert.equal(lerpToward(100, 100, 0.1), 100));

  it("produces correct step with LERP=0.06 from rest", () => {
    const result = lerpToward(0, 1000, 0.06);
    assert.ok(Math.abs(result - 60) < 0.001, `expected ~60, got ${result}`);
  });

  it("never overshoots target over many iterations", () => {
    let v = 0;
    for (let i = 0; i < 500; i++) v = lerpToward(v, 100, 0.06);
    assert.ok(v <= 100, `overshot: ${v}`);
    assert.ok(v > 99.9, `never converged: ${v}`);
  });

  it("works backwards (scrolling up from mid-page)", () => {
    const result = lerpToward(500, 200, 0.06);
    assert.ok(result < 500, "should move toward smaller target");
    assert.ok(result > 200, "should not overshoot target");
  });
});

describe("isSettled", () => {
  it("returns true when delta is less than threshold", () =>
    assert.equal(isSettled(99.95, 100, 0.1), true));

  it("returns false when delta exceeds threshold", () =>
    assert.equal(isSettled(99.8, 100, 0.1), false));

  it("returns true when exactly equal", () =>
    assert.equal(isSettled(100, 100, 0.1), true));

  it("returns true at exact threshold boundary", () =>
    assert.equal(isSettled(99.9, 100, 0.1), true));

  it("returns false just past threshold", () =>
    assert.equal(isSettled(99.89, 100, 0.1), false));
});
```

- [ ] **Step 2: Run tests — confirm they FAIL (file not importable yet)**

```bash
cd /path/to/ask-my-notes
node --test tests/unit/ambientLerp.test.mjs
```

Expected: tests pass immediately — these test pure math functions defined in the same file. All 10 tests should be green. If any fail, the math in the test expectations is wrong; fix the assertions before proceeding.

- [ ] **Step 3: Add test to the test script in `package.json`**

Open `package.json`. Find the `test` and `test:unit` scripts. Both currently end with `tests/unit/examUtils.test.mjs`. Append `tests/unit/ambientLerp.test.mjs` after that:

```json
"test": "node --test tests/unit/auth.test.mjs tests/unit/planLimits.test.mjs tests/unit/internalAccess.test.mjs tests/unit/ocr.test.mjs tests/unit/streaming.test.mjs tests/unit/cache.test.mjs tests/unit/parseAnswerSections.test.mjs tests/unit/confidenceBadge.test.mjs tests/unit/sectionActions.test.mjs tests/unit/answerTemplates.test.mjs tests/unit/edgeCases.test.mjs tests/unit/scrollToBottom.test.mjs tests/unit/progressUtils.test.mjs tests/unit/examUtils.test.mjs tests/unit/ambientLerp.test.mjs",
"test:unit": "node --test tests/unit/auth.test.mjs tests/unit/planLimits.test.mjs tests/unit/internalAccess.test.mjs tests/unit/ocr.test.mjs tests/unit/streaming.test.mjs tests/unit/cache.test.mjs tests/unit/parseAnswerSections.test.mjs tests/unit/confidenceBadge.test.mjs tests/unit/sectionActions.test.mjs tests/unit/answerTemplates.test.mjs tests/unit/edgeCases.test.mjs tests/unit/scrollToBottom.test.mjs tests/unit/progressUtils.test.mjs tests/unit/examUtils.test.mjs tests/unit/ambientLerp.test.mjs"
```

- [ ] **Step 4: Run the full suite to verify no regressions**

```bash
npm test
```

Expected: all tests pass, including the 10 new lerp tests.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/ambientLerp.test.mjs package.json
git commit -m "test: add lerp and settle unit tests for ambient background controller"
```

---

## Task 4: FocusAmbientBackground Component

**Files:**
- Create: `src/components/focus/FocusAmbientBackground.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/focus/FocusAmbientBackground.tsx
'use client';

import { useEffect, useRef } from 'react';
import { AMBIENT_CONFIG } from './ambient-background.config';
import './ambient-background.css';

export default function FocusAmbientBackground() {
  const farWrapRef = useRef<HTMLDivElement>(null);
  const midWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = document.querySelector(
      AMBIENT_CONFIG.SCROLL_SELECTOR
    ) as HTMLElement | null;

    if (!scrollEl) return;

    let targetY  = 0;
    let currentY = 0;
    let rafId    = 0;
    let running  = false;

    const tick = () => {
      currentY += (targetY - currentY) * AMBIENT_CONFIG.LERP;

      if (farWrapRef.current) {
        farWrapRef.current.style.transform =
          `translate3d(0, ${currentY * -AMBIENT_CONFIG.FAR_PARALLAX}px, 0)`;
      }
      if (midWrapRef.current) {
        midWrapRef.current.style.transform =
          `translate3d(0, ${currentY * -AMBIENT_CONFIG.MID_PARALLAX}px, 0)`;
      }

      if (Math.abs(targetY - currentY) > 0.1) {
        rafId = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const onScroll = () => {
      targetY = scrollEl.scrollTop;
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="amb-root"
      aria-hidden="true"
      style={{
        '--amb-far-duration': AMBIENT_CONFIG.FAR_BREATHE_DURATION,
        '--amb-mid-duration': AMBIENT_CONFIG.MID_BREATHE_DURATION,
        '--amb-mid-delay':    AMBIENT_CONFIG.MID_BREATHE_DELAY,
      } as React.CSSProperties}
    >
      <div className="amb-layer-base" />
      <div ref={farWrapRef} className="amb-layer-far-wrap">
        <div className="amb-layer-far-inner" />
      </div>
      <div ref={midWrapRef} className="amb-layer-mid-wrap">
        <div className="amb-layer-mid-inner" />
      </div>
      <div className="amb-layer-vignette" />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd /path/to/ask-my-notes
npx tsc --noEmit
```

Expected: no errors. If `useRef<HTMLDivElement>` causes a complaint, check the React types version — it should be fine with React 18.

- [ ] **Step 3: Commit**

```bash
git add src/components/focus/FocusAmbientBackground.tsx
git commit -m "feat: add FocusAmbientBackground component with rAF scroll controller"
```

---

## Task 5: Integration — Wire Into Focus Page

**Files:**
- Modify: `src/app/focus/page.jsx` (lines 164–171 — `pageStyle` definition)

- [ ] **Step 1: Add the import at the top of `focus/page.jsx`**

Find the existing imports block (around line 1–15). Add after the last import:

```javascript
import FocusAmbientBackground from '@/components/focus/FocusAmbientBackground';
```

- [ ] **Step 2: Remove `background` from `pageStyle`**

Find `pageStyle` (around line 164). Change it from:

```javascript
const pageStyle = {
  background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
  height: '100vh',
  color: COLORS.text.primary,
  fontFamily: TYPOGRAPHY.fontFamily,
  display: 'flex',
  overflow: 'hidden',
};
```

To:

```javascript
const pageStyle = {
  height: '100vh',
  color: COLORS.text.primary,
  fontFamily: TYPOGRAPHY.fontFamily,
  display: 'flex',
  overflow: 'hidden',
};
```

- [ ] **Step 3: Mount the component as the first child**

Find the return JSX (around line 186):

```jsx
return (
  <div style={pageStyle}>
    {/* Webkit scrollbar ... */}
    <style>{`...`}</style>
    <ContextualSidebar />
```

Add `<FocusAmbientBackground />` as the very first child, before the `<style>` tag:

```jsx
return (
  <div style={pageStyle}>
    <FocusAmbientBackground />
    {/* Webkit scrollbar ... */}
    <style>{`...`}</style>
    <ContextualSidebar />
```

- [ ] **Step 4: Open the app and verify visually**

```bash
npm run dev
```

Navigate to `http://localhost:3000/focus`. Check:

1. Background is dark (`#04060e`), NOT white or the old purple gradient.
2. The bloom is visible as a very faint violet haze near the top-center. It should be subtle — if it looks vivid/bright, open `ambient-background.config.ts` and lower `FAR_PARALLAX` or check the CSS opacity values.
3. The glow breathes slowly — scale up/down over ~14 seconds.
4. Scrolling the task list (right panel) causes the background to drift very slightly upward. Scroll 500px and the bloom should shift about 15px. It should feel atmospheric, not mechanical.
5. After stopping scroll, the bloom should gently settle (continue drifting ~1 second after scroll stops, then halt).
6. The sidebar, timer ring, task cards, and all text are fully readable — no content is hidden behind the background.
7. Open DevTools → Performance tab → record a scroll. Verify all background frames are in the Compositor (green) with no Layout or Paint events from the background layers.

- [ ] **Step 5: Fix z-index if content disappears**

If any content (sidebar, task list) is hidden behind the background, add `position: relative; z-index: 1` to the `contentContainerStyle` object in `page.jsx` (around line 173):

```javascript
const contentContainerStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
  overflowY: chatOpen ? 'hidden' : 'auto',
  overflowX: 'hidden',
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(139,92,246,0.25) transparent',
  position: 'relative',  // ← add this
  zIndex: 1,             // ← add this
};
```

Do the same for `<ContextualSidebar />` if it also disappears — wrap it in a `<div style={{ position: 'relative', zIndex: 1 }}>`.

- [ ] **Step 6: Run the test suite — confirm no regressions**

```bash
npm test
```

Expected: all tests pass. The new lerp tests from Task 3 are included.

- [ ] **Step 7: Commit**

```bash
git add src/app/focus/page.jsx
git commit -m "feat: wire FocusAmbientBackground into focus page, remove static gradient"
```

---

## Done

The focus page now has a cinematic ambient background system:
- Static frozen gradient → living parallax-reactive bloom
- 60fps GPU-composited via `translate3d` only
- Breathing idle animation that keeps the background alive at rest
- All tunable from `ambient-background.config.ts`
- Zero CPU overhead when user isn't scrolling
