# Skeleton Screens Design — Ask My Notes
**Date:** 2026-04-21
**Status:** Approved

---

## Problem

The Quiz page shows "Generating questions..." text while the AI generates questions. All other pages flash blank or show no loading feedback. This creates perceived slowness and feels unpolished.

## Goal

Replace text-based loading states with responsive animated skeleton screens that match the exact layout of real content, reducing perceived wait time and making the app feel premium and fast.

---

## Loading Strategy

### Quiz Page (`/quiz`)
- **Always** show skeleton when `loading === true`
- Reason: the `/api/ai/generate-questions` API call always takes noticeable time regardless of network speed

### All Other Pages (`/dashboard`, `/focus`, Ask AI section)
- Show skeleton **only if data takes > 300ms to arrive** (Option B — time-based, works on all browsers including Safari)
- If data arrives within 300ms, skeleton is never rendered and user sees no loading state
- Reason: on fast connections these pages load near-instantly; skeleton would be a flash of noise

### Hook: `useSlowLoad(loading, threshold = 300)`

```js
// src/hooks/useSlowLoad.js
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

Usage in pages:
```js
const showSkeleton = useSlowLoad(loading); // 300ms default
if (showSkeleton) return <DashboardSkeleton />;
```

---

## Components

### File Locations

All skeletons live in `src/components/shared/` alongside existing `Button.jsx`, `ProgressBar.jsx`.

| File | Page/Component |
|---|---|
| `src/hooks/useSlowLoad.js` | Shared hook for Dashboard, Focus, AskAI |
| `src/components/shared/QuizSkeleton.jsx` | `src/app/quiz/page.jsx` |
| `src/components/shared/DashboardSkeleton.jsx` | `src/app/dashboard/page.js` |
| `src/components/shared/FocusSkeleton.jsx` | `src/app/focus/page.jsx` |
| `src/components/shared/AskAISkeleton.jsx` | `src/components/dashboard/AskAISection.jsx` |

---

## Skeleton Designs

### 1. QuizSkeleton (`/quiz`)

Mirrors the exact two-column layout of the real quiz page.

**Structure:**
```
TopBar skeleton (title + timer placeholders)
ProgressBar skeleton (animated 0→35% fill while loading)
  ↕ progress label placeholder

LEFT COLUMN (3fr):
  Question Card
    - Header row: label placeholder + marks badge placeholder
    - 3 text lines (shimmer, 100% / 100% / 60% width)
  Answer Textarea
    - 5 placeholder lines (shimmer, alternating 95%/85% width)
  Button Row
    - 3 button placeholders (← Previous, Skip, Save Answer)

RIGHT SIDEBAR (2fr):
  Source Snippet card
    - Label placeholder + 3 shimmer lines
  Answer Structure card
    - Label placeholder + 3 shimmer lines
  AI Coach card
    - Label placeholder + 2 shimmer lines
```

**Responsive:** Below 1024px, grid collapses to single column (sidebar moves below).

### 2. DashboardSkeleton (`/dashboard`)

Mirrors the BentoGrid layout exactly.

**Structure:**
```
Greeting row
  - Name placeholder (300px)
  - Subtitle placeholder (200px)

BentoGrid (grid-template-columns: 1fr 1fr, rows: 1fr 1fr):
  HERO CARD (grid-column: 1, grid-row: 1/3):
    - Icon + title header row
    - 3 content line placeholders
    - Button placeholder at bottom

  BENTO CARDS (2×2 right side):
    - Card 1: label + value shimmer
    - Card 2: label + value shimmer (150ms delay)
    - Card 3: label + value shimmer (200ms delay)
    - Card 4: label + value shimmer (250ms delay)
```

### 3. FocusSkeleton (`/focus`)

Mirrors the focus session layout with the timer ring as centrepiece.

**Structure:**
```
TopBar skeleton

Timer Ring (centred):
  - SVG circle with stroke-dasharray shimmer travelling around arc
  - Inner text: time placeholder + label placeholder

Task Cards (below ring):
  - 2 task card skeletons with staggered pulse

Button Row:
  - Resume + Stop button placeholders
```

### 4. AskAISkeleton

Mirrors the chat interface inside `AskAISection.jsx`.

**Structure:**
```
Chat Header placeholder

Messages area:
  - User message bubble (right-aligned, purple border)
    - 2 shimmer lines
  - AI response bubble (left-aligned)
    - 3 shimmer lines
  - Thinking indicator: 3 pulsing dots (cascading 200ms stagger)

Input area:
  - Text input placeholder
  - Send button placeholder
```

---

## Animation System

All animations are **pure CSS keyframes** — no framer-motion dependency, no JS re-renders during animation.

### Keyframes

```css
@keyframes shimmer {
  0%   { background-position: -1000px 0; }
  100% { background-position:  1000px 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1;   }
}

@keyframes progressBuild {
  0%   { width: 0%;   }
  100% { width: 35%;  }
}

@keyframes dotPulse {
  0%, 20%, 50%, 80%, 100% { opacity: 0.4; }
  40%, 60%                { opacity: 1;   }
}

@keyframes ringShimmer {
  0%   { stroke-dashoffset:  200; }
  100% { stroke-dashoffset: -200; }
}
```

### Shimmer Block Style

Applied to all content-line placeholders:

```js
const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)',
  backgroundSize: '1000px 100%',
  animation: 'shimmer 1.8s linear infinite',
  borderRadius: RADIUS.sm,
};
```

### Timing

| Animation | Duration | Notes |
|---|---|---|
| Shimmer wave | 1.8s | Applied to content lines |
| Pulse | 1.5s | Applied to card containers |
| Stagger offset | 150–250ms | Between sections, top-to-bottom |
| Progress build | 1.8s | Quiz progress bar |
| Ring shimmer | 1.8s | Focus timer arc |
| Thinking dots | 1.4s | 200ms stagger per dot |

Minimum animation duration: **1.3s** — nothing faster (avoids cheap/glitchy feel).

### CSS Injection

Each skeleton component injects a `<style>` tag at render time with its keyframes. Since only one skeleton renders per page at a time (skeletons are mutually exclusive with real content), there is no duplication concern.

---

## Layout Integrity (Zero Layout Shift)

**Rule:** Every skeleton uses identical CSS grid/flex structure, padding, border-radius, and gap values as the real component it replaces.

- Quiz skeleton uses `grid-template-columns: 3fr 2fr` — same as `quiz/page.jsx` line 114
- Dashboard skeleton uses `grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr` — same as `BentoGrid.jsx` line 32
- All border-radius values use `RADIUS.md` (14px) / `RADIUS.sm` (10px) from `src/lib/styles.js`
- All spacing uses `SPACING.*` tokens

When React swaps skeleton → real content, dimensions are identical and no reflow occurs.

---

## Design Tokens Used

All skeletons reference the existing design system in `src/lib/styles.js`:

```js
import { COLORS, SPACING, RADIUS } from '@/lib/styles';

// Skeleton base colors
const skeletonBase   = 'rgba(255,255,255,0.025)';  // COLORS.bg.card
const skeletonBorder = COLORS.border.lighter;        // rgba(255,255,255,0.08)
const skeletonLine   = 'rgba(255,255,255,0.06)';    // shimmer base
```

---

## Accessibility

- All skeleton containers have `aria-hidden="true"` — screen readers skip them
- Real content has normal accessible markup once loaded
- No `role="progressbar"` or status announcements on skeletons (they are visual only)

---

## What Is NOT Changed

- Quiz logic, answer evaluation, API calls — untouched
- Dashboard data fetching, context, routing — untouched
- Existing `SkeletonCard` in `QuizSection.jsx` (dashboard quiz widget) — untouched, already works
- Any component not listed in the file table above

---

## Acceptance Criteria

- [ ] Quiz page shows skeleton immediately on load, replaced instantly when questions arrive
- [ ] Dashboard, Focus, AskAI show skeleton only when data takes > 300ms
- [ ] No layout shift when skeleton → real content swap occurs
- [ ] All animations run at 1.8s shimmer, 1.5s pulse, nothing faster than 1.3s
- [ ] Skeletons are fully responsive (quiz collapses to 1-col at 1024px, all stack on mobile)
- [ ] No new npm dependencies introduced
- [ ] Existing quiz functionality unchanged
