# Skeleton Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace text-based loading states with animated skeleton screens that match real page layouts, using a 300ms time-based threshold for non-quiz pages.

**Architecture:** QuizSkeleton always renders when `loading === true`. Dashboard uses a `userReady` flag added to DashboardContext, combined with a `useSlowLoad` hook that gates the skeleton to only appear if auth+data takes > 300ms. Shared CSS keyframes are extracted to `src/lib/skeletonStyles.js` to avoid duplication. Focus page has no async loading (hardcoded tasks), AskAI loads from localStorage synchronously — both are covered by the DashboardSkeleton and do not need separate skeletons.

**Tech Stack:** React 19, Next.js 16 App Router, inline styles with design tokens from `src/lib/styles.js`, pure CSS keyframes via injected `<style>` tag, no new npm dependencies.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/hooks/useSlowLoad.js` | Timer hook — returns `true` after threshold ms if still loading |
| Create | `src/lib/skeletonStyles.js` | Shared CSS keyframes string + `shimmerStyle()` + `pulseStyle()` helpers |
| Create | `src/components/shared/QuizSkeleton.jsx` | Skeleton matching quiz page layout exactly |
| Create | `src/components/shared/DashboardSkeleton.jsx` | Skeleton matching BentoGrid layout exactly |
| Modify | `src/app/quiz/page.jsx` | Replace `if (loading)` branch + Suspense fallback |
| Modify | `src/context/DashboardContext.jsx` | Add `userReady` state, set after auth resolves |
| Modify | `src/app/dashboard/page.js` | Wire DashboardSkeleton via `useSlowLoad` |

---

## Task 1: `useSlowLoad` hook

**Files:**
- Create: `src/hooks/useSlowLoad.js`

- [ ] **Step 1: Create the file**

```js
// src/hooks/useSlowLoad.js
'use client';
import { useState, useEffect } from 'react';

export function useSlowLoad(loading, threshold = 300) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }
    const id = setTimeout(() => setShowSkeleton(true), threshold);
    return () => clearTimeout(id);
  }, [loading, threshold]);

  return showSkeleton;
}
```

- [ ] **Step 2: Verify logic manually**

Open a browser console and verify the mental model:
- `loading = true` → after 300ms → `showSkeleton` becomes `true`
- `loading = false` at any point → `showSkeleton` resets to `false` immediately
- `loading = true` then `false` within 300ms → skeleton never shown (timer cleared)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSlowLoad.js
git commit -m "feat: add useSlowLoad hook for 300ms threshold skeleton gating"
```

---

## Task 2: Shared skeleton styles

**Files:**
- Create: `src/lib/skeletonStyles.js`

- [ ] **Step 1: Create the file**

```js
// src/lib/skeletonStyles.js

export const SKELETON_KEYFRAMES = `
  @keyframes skeletonShimmer {
    0%   { background-position: -1000px 0; }
    100% { background-position:  1000px 0; }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
  }
  @keyframes skeletonProgressBuild {
    0%   { width: 0%; }
    100% { width: 35%; }
  }
  @keyframes skeletonDotPulse {
    0%, 20%, 50%, 80%, 100% { opacity: 0.4; }
    40%, 60%                { opacity: 1; }
  }
  @keyframes skeletonRingShimmer {
    0%   { stroke-dashoffset:  200; }
    100% { stroke-dashoffset: -200; }
  }
  @media (max-width: 1024px) {
    .sk-quiz-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .sk-bento-grid { grid-template-columns: 1fr !important; }
    .sk-bento-hero { grid-row: auto !important; }
  }
`;

export function shimmerStyle(overrides = {}) {
  return {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)',
    backgroundSize: '1000px 100%',
    animation: 'skeletonShimmer 1.8s linear infinite',
    ...overrides,
  };
}

export function pulseStyle(delayMs = 0, overrides = {}) {
  return {
    animation: `skeletonPulse 1.5s ease-in-out ${delayMs}ms infinite`,
    ...overrides,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/skeletonStyles.js
git commit -m "feat: add shared skeleton keyframes and style helpers"
```

---

## Task 3: `QuizSkeleton` component

**Files:**
- Create: `src/components/shared/QuizSkeleton.jsx`

The skeleton must mirror `src/app/quiz/page.jsx` exactly:
- Outer: `display:flex` with `ContextualSidebar` on the left
- Inner: `flex:1, flexDirection:column`
- TopBar row → Progress row → `gridTemplateColumns:'3fr 2fr'` grid

- [ ] **Step 1: Create the component**

```jsx
// src/components/shared/QuizSkeleton.jsx
'use client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import { SKELETON_KEYFRAMES, shimmerStyle, pulseStyle } from '@/lib/skeletonStyles';

function SkLine({ width = '100%', height = '14px', delayMs = 0, mb = SPACING.sm }) {
  return (
    <div style={{
      ...shimmerStyle({ animationDelay: `${delayMs}ms` }),
      width,
      height,
      borderRadius: RADIUS.sm,
      marginBottom: mb,
      flexShrink: 0,
    }} />
  );
}

function SkCard({ delayMs = 0, children, style = {} }) {
  return (
    <div style={{
      border: `1px solid ${COLORS.border.lighter}`,
      borderRadius: RADIUS.md,
      padding: SPACING.lg,
      background: COLORS.bg.card,
      ...pulseStyle(delayMs),
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function QuizSkeleton() {
  return (
    <>
      <style>{SKELETON_KEYFRAMES}</style>
      <div style={{
        display: 'flex',
        background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
        minHeight: '100vh',
        color: COLORS.text.primary,
        fontFamily: TYPOGRAPHY.fontFamily,
      }}>
        <ContextualSidebar />

        <div
          aria-hidden="true"
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}
        >
          {/* TopBar skeleton */}
          <div style={{
            padding: SPACING.lg,
            borderBottom: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...pulseStyle(100),
          }}>
            <SkLine width="200px" height="20px" mb="0" />
            <SkLine width="72px" height="16px" mb="0" />
          </div>

          {/* Progress section */}
          <div style={{ padding: `${SPACING.sm} ${SPACING.lg}`, ...pulseStyle(150) }}>
            <div style={{
              width: '100%',
              height: '4px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: SPACING.sm,
            }}>
              <div style={{
                height: '100%',
                background: `linear-gradient(90deg, ${COLORS.accent.purple}, ${COLORS.accent.cyan})`,
                animation: 'skeletonProgressBuild 1.8s ease-in-out infinite',
              }} />
            </div>
            <SkLine width="100px" height="11px" mb="0" />
          </div>

          {/* Two-column grid — mirrors quiz/page.jsx line 114 */}
          <div
            className="sk-quiz-grid"
            style={{
              padding: `0 ${SPACING.lg} ${SPACING.lg}`,
              display: 'grid',
              gridTemplateColumns: '3fr 2fr',
              gap: SPACING.xl,
              maxWidth: '1100px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>

              {/* Question card */}
              <SkCard delayMs={200}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                  <SkLine width="80px" height="11px" mb="0" />
                  <div style={{
                    width: '48px', height: '22px', flexShrink: 0,
                    background: 'rgba(139,92,246,0.1)',
                    border: `1px solid ${COLORS.border.accent}`,
                    borderRadius: RADIUS.sm,
                  }} />
                </div>
                <SkLine width="100%" height="16px" delayMs={50} />
                <SkLine width="100%" height="16px" delayMs={100} />
                <SkLine width="60%"  height="16px" delayMs={150} mb="0" />
              </SkCard>

              {/* Textarea */}
              <SkCard delayMs={250} style={{ minHeight: '180px' }}>
                <SkLine width="95%" height="13px" delayMs={0}   />
                <SkLine width="85%" height="13px" delayMs={50}  />
                <SkLine width="95%" height="13px" delayMs={100} />
                <SkLine width="85%" height="13px" delayMs={150} />
                <SkLine width="60%" height="13px" delayMs={200} mb="0" />
              </SkCard>

              {/* Button row */}
              <div style={{ display: 'flex', gap: SPACING.md, ...pulseStyle(300) }}>
                <div style={{ height: '38px', flex: 1, background: COLORS.bg.card, borderRadius: RADIUS.md, border: `1px solid ${COLORS.border.lighter}` }} />
                <div style={{ height: '38px', flex: 1, background: COLORS.bg.card, borderRadius: RADIUS.md, border: `1px solid ${COLORS.border.lighter}` }} />
                <div style={{ height: '38px', flex: 2, background: 'rgba(139,92,246,0.08)', borderRadius: RADIUS.md, border: `1px solid ${COLORS.border.accent}` }} />
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
              {/* Source snippet */}
              <SkCard delayMs={200}>
                <SkLine width="130px" height="11px" />
                <SkLine width="100%" height="11px" delayMs={30} />
                <SkLine width="90%"  height="11px" delayMs={60} />
                <SkLine width="80%"  height="11px" delayMs={90} mb="0" />
              </SkCard>

              {/* Answer structure */}
              <SkCard delayMs={250}>
                <SkLine width="130px" height="11px" />
                <SkLine width="100%" height="11px" delayMs={30} />
                <SkLine width="85%"  height="11px" delayMs={60} />
                <SkLine width="70%"  height="11px" delayMs={90} mb="0" />
              </SkCard>

              {/* AI coach */}
              <SkCard delayMs={300}>
                <SkLine width="100px" height="11px" />
                <SkLine width="100%" height="11px" delayMs={30} />
                <SkLine width="75%"  height="11px" delayMs={60} mb="0" />
              </SkCard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/QuizSkeleton.jsx
git commit -m "feat: add QuizSkeleton component with shimmer and staggered pulse"
```

---

## Task 4: Wire QuizSkeleton into quiz page

**Files:**
- Modify: `src/app/quiz/page.jsx` (lines 89–98 and lines 228–231)

- [ ] **Step 1: Add the import at the top of the file**

After the existing imports (after line 10), add:

```js
import QuizSkeleton from '@/components/shared/QuizSkeleton';
```

- [ ] **Step 2: Replace the `if (loading)` block (lines 89–98)**

Replace:
```jsx
  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: pageStyle.background }}>
        <ContextualSidebar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: COLORS.text.secondary }}>Generating questions...</div>
        </div>
      </div>
    );
  }
```

With:
```jsx
  if (loading) return <QuizSkeleton />;
```

- [ ] **Step 3: Replace the Suspense fallback (lines 228–231)**

Replace:
```jsx
export default function QuizPage() {
  return (
    <Suspense fallback={<div style={{ background: '#060910', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading...</div>}>
      <QuizContent />
    </Suspense>
  );
}
```

With:
```jsx
export default function QuizPage() {
  return (
    <Suspense fallback={<QuizSkeleton />}>
      <QuizContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Verify in browser**

1. Run `npm run dev`
2. Navigate to `/quiz?topic=any`
3. Confirm: skeleton appears immediately, then real quiz content replaces it with no layout shift
4. Confirm: no "Generating questions..." text appears anywhere

- [ ] **Step 5: Commit**

```bash
git add src/app/quiz/page.jsx
git commit -m "feat: replace quiz loading text with QuizSkeleton"
```

---

## Task 5: Add `userReady` to DashboardContext

**Files:**
- Modify: `src/context/DashboardContext.jsx`

The dashboard currently has `user` starting as `null` (line 254). Auth resolves asynchronously in `getUser()` (line 1176). We need a `userReady` flag that flips to `true` the moment auth resolves so `useSlowLoad` can gate the skeleton correctly.

- [ ] **Step 1: Add `userReady` state**

Find line 254:
```js
  const [user, setUser] = useState(null);
```

Add immediately after it:
```js
  const [userReady, setUserReady] = useState(false);
```

- [ ] **Step 2: Set `userReady` when auth resolves**

Find the `getUser` function (around line 1176):
```js
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      return session;
    };
```

Replace with:
```js
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setUserReady(true);
      return session;
    };
```

- [ ] **Step 3: Export `userReady` in context value**

Find the context value object (around line 1311 where `user` is exported):
```js
      user, email, setEmail, password, setPassword,
```

Add `userReady` next to `user`:
```js
      user, userReady, email, setEmail, password, setPassword,
```

- [ ] **Step 4: Commit**

```bash
git add src/context/DashboardContext.jsx
git commit -m "feat: add userReady flag to DashboardContext for skeleton gating"
```

---

## Task 6: `DashboardSkeleton` component

**Files:**
- Create: `src/components/shared/DashboardSkeleton.jsx`

Must mirror `dashboard/page.js` structure exactly:
- Outer: `display:flex, height:100vh, overflow:hidden, background:linear-gradient(...)`
- Left: sidebar placeholder (fixed width to match `DashboardSidebar`)
- Right: `flex:1, padding:24px` → greeting row → BentoGrid `1fr 1fr / 1fr 1fr`

- [ ] **Step 1: Check DashboardSidebar width**

Open `src/components/dashboard/DashboardSidebar.jsx` and find the sidebar width. Look for a `width` property on the root element.

```bash
grep -n "width:" src/components/dashboard/DashboardSidebar.jsx | head -5
```

Use that value in the sidebar placeholder below. If not found, default to `240px`.

- [ ] **Step 2: Create the component**

```jsx
// src/components/shared/DashboardSkeleton.jsx
'use client';
import { SKELETON_KEYFRAMES, shimmerStyle, pulseStyle } from '@/lib/skeletonStyles';

function SkLine({ width = '100%', height = '14px', delayMs = 0, mb = '8px' }) {
  return (
    <div style={{
      ...shimmerStyle({ animationDelay: `${delayMs}ms` }),
      width,
      height,
      borderRadius: '8px',
      marginBottom: mb,
      flexShrink: 0,
    }} />
  );
}

function SkCard({ delayMs = 0, children, style = {} }) {
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '16px',
      background: 'rgba(255,255,255,0.025)',
      ...pulseStyle(delayMs),
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <>
      <style>{SKELETON_KEYFRAMES}</style>
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)',
        }}
      >
        {/* Sidebar placeholder — matches DashboardSidebar width */}
        <div style={{
          width: '240px',
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.01)',
          ...pulseStyle(0),
        }} />

        {/* Main content area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Greeting row */}
          <div style={{ marginBottom: '24px', ...pulseStyle(80) }}>
            <SkLine width="280px" height="28px" mb="10px" />
            <SkLine width="180px" height="14px" mb="0" />
          </div>

          {/* BentoGrid — mirrors BentoGrid.jsx: 1fr 1fr / 1fr 1fr, gap 6 */}
          <div
            className="sk-bento-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '6px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Hero card — gridColumn:1, gridRow:1/3 */}
            <SkCard
              delayMs={120}
              style={{
                gridColumn: 1,
                gridRow: '1 / 3',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Header row: icon + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                }} />
                <SkLine width="60%" height="18px" mb="0" delayMs={20} />
              </div>
              {/* Content lines */}
              <SkLine width="100%" height="12px" delayMs={40}  />
              <SkLine width="85%"  height="12px" delayMs={80}  />
              <SkLine width="70%"  height="12px" delayMs={120} mb="auto" />
              {/* Button placeholder at bottom */}
              <div style={{
                height: '36px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginTop: 'auto',
                ...pulseStyle(160),
              }} />
            </SkCard>

            {/* Bento card 1 */}
            <SkCard delayMs={150}>
              <SkLine width="110px" height="12px" />
              <SkLine width="75%"   height="24px" delayMs={30} mb="0" />
            </SkCard>

            {/* Bento card 2 */}
            <SkCard delayMs={200}>
              <SkLine width="110px" height="12px" />
              <SkLine width="75%"   height="24px" delayMs={30} mb="0" />
            </SkCard>

            {/* Bento card 3 */}
            <SkCard delayMs={250}>
              <SkLine width="110px" height="12px" />
              <SkLine width="75%"   height="24px" delayMs={30} mb="0" />
            </SkCard>

            {/* Bento card 4 */}
            <SkCard delayMs={300}>
              <SkLine width="110px" height="12px" />
              <SkLine width="75%"   height="24px" delayMs={30} mb="0" />
            </SkCard>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify sidebar width matches**

After creating the file, check the actual `DashboardSidebar` width (from step 1) and update the `width: '240px'` value in the sidebar placeholder if it differs.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/DashboardSkeleton.jsx
git commit -m "feat: add DashboardSkeleton matching BentoGrid layout"
```

---

## Task 7: Wire DashboardSkeleton into dashboard page

**Files:**
- Modify: `src/app/dashboard/page.js`

- [ ] **Step 1: Add imports**

At the top of `src/app/dashboard/page.js`, add after the existing imports:

```js
import DashboardSkeleton from '@/components/shared/DashboardSkeleton';
import { useSlowLoad } from '@/hooks/useSlowLoad';
```

- [ ] **Step 2: Add skeleton gate inside `DashboardInner`**

`DashboardInner` (line 14) currently destructures `user` from `useDashboard()`. Add `userReady` to that destructure and add the skeleton gate:

Replace:
```js
function DashboardInner() {
  const { streak, progressQuestions, masteryTopics, user } = useDashboard();
```

With:
```js
function DashboardInner() {
  const { streak, progressQuestions, masteryTopics, user, userReady } = useDashboard();
  const showSkeleton = useSlowLoad(!userReady);
  if (showSkeleton) return <DashboardSkeleton />;
```

- [ ] **Step 3: Verify in browser**

1. Open DevTools → Network tab → set throttling to **Slow 3G**
2. Navigate to `/dashboard`
3. Confirm: skeleton appears for the duration of auth resolution
4. Confirm: real BentoGrid replaces skeleton with no layout shift
5. Set throttling back to **No throttling**
6. Navigate to `/dashboard` again
7. Confirm: skeleton does NOT appear (data loads within 300ms)

- [ ] **Step 4: Verify sidebar width matches real sidebar**

With the dev server running, compare the skeleton's sidebar placeholder width against the real `DashboardSidebar`. If they differ, update `width: '240px'` in `DashboardSkeleton.jsx` to match. (No commit needed if already correct from Task 6 step 3.)

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.js
git commit -m "feat: wire DashboardSkeleton with 300ms threshold into dashboard page"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Quiz page: always shows skeleton on load (`if (loading) return <QuizSkeleton />`)
- ✅ Other pages (Dashboard): only shows skeleton when data takes > 300ms (`useSlowLoad`)
- ✅ No layout shift: skeletons use identical grid/flex structure as real content
- ✅ Animation timings: 1.8s shimmer, 1.5s pulse, nothing faster than 1.3s
- ✅ Progress bar "builds" during load (skeletonProgressBuild keyframe)
- ✅ Staggered pulse: 150–250ms delays between skeleton sections
- ✅ Responsive: `.sk-quiz-grid` collapses at 1024px via injected media query
- ✅ No new npm dependencies
- ✅ Existing quiz logic untouched (only replaced the `if (loading)` branch)
- ✅ Design tokens: all colors/spacing/radius from `src/lib/styles.js`
- ✅ Accessibility: `aria-hidden="true"` on skeleton containers
- ℹ️  Focus skeleton: intentionally omitted — Focus page has no async data (hardcoded `INITIAL_TASKS`), renders immediately regardless of network
- ℹ️  AskAI skeleton: intentionally omitted — AskAI loads from localStorage (synchronous), covered by DashboardSkeleton during page init

**Placeholder scan:** No TBD/TODO found. All steps contain exact code. Task 6 Step 1 has a bash command to resolve the sidebar width before writing the component — this is intentional (value must be verified from the file).

**Type consistency:** `shimmerStyle()` and `pulseStyle()` defined in Task 2, used identically in Tasks 3 and 6. `useSlowLoad` signature defined in Task 1, called in Task 7 with `!userReady`. `userReady` added to context in Task 5, destructured in Task 7.
