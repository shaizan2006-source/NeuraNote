# QuickChat Vortex Spinner — Design Spec

**Date:** 2026-05-04  
**Status:** Approved  
**Scope:** Replace `ThinkingDots` in QuickChat's `AIBubble` with a Vortex dot-matrix spinner + shimmer cycling text.

---

## Problem

QuickChat currently displays a simple 3-dot bouncing animation (`ThinkingDots`) while waiting for a response. The goal is to replace this with the Vortex dot-matrix spinner to match the visual language of ask-ai, scaled appropriately for the compact drawer context.

---

## Component Boundary

**File:** `src/components/QuickChat/QuickChatVortex.jsx` (new file)  
**Call site:** `src/components/QuickChat/QuickChatDrawer.jsx` line 85 in `AIBubble` component  
**Props:** None (stateless, no dependencies on parent props)  
**Replaces:** `ThinkingDots` component (remove lines 31–44 from `QuickChatDrawer.jsx`)

---

## Behaviour

### Phase 1: Spinner only (0 – 3 000 ms)

- Render only the Vortex SVG, sized at 14×14px. No text.
- `showText` state starts `false`; a `setTimeout(3000)` sets it to `true`.
- Timer ref is stored and cleared on unmount.

### Phase 2: Spinner + text (> 3 000 ms)

- Text fades in beside the spinner.
- Cycles through a 2-message array: `["Thinking…", "Processing…"]` every **1 300 ms** (same interval as ask-ai).
- On each text change, a React `key` is incremented to remount the `<span>`, triggering the `fadeSlideIn` keyframe.
- The interval ref is stored and cleared on unmount.

---

## Visual Spec

### Vortex SVG

- `viewBox="0 0 56 56"`, rendered at `width={14} height={14}` (14px, not 20px).
- Background dots: `<circle r="2.4" fill="#fff" opacity="0.07"/>` at each of the 25 grid positions.
- Lit dots: `<circle r="3.1" fill="#fff"/>`, animated via CSS class `.qcv-vl` with `animation: vortexVortex 2400ms linear infinite both`.
- All 25 animation delays inlined as separate CSS classes (`qcv-d00`–`qcv-d44`) — exact same values as ask-ai but with `qcv-` prefix.

### Text

- Font size: 14px, weight 600.
- Animation: **Shimmer Sweep** — same gradient and keyframe as ask-ai: `background: linear-gradient(90deg, #4a4a5a 0%, #4a4a5a 20%, #c4b5fd 40%, #f0f0f5 55%, #c4b5fd 70%, #4a4a5a 80%)`, `background-size: 200% 100%`, `-webkit-background-clip: text`, `-webkit-text-fill-color: transparent`, keyframe `qcvShimmer` running `2s linear infinite`.
- Entry animation per text change: `qcvFadeSlide 0.35s ease` — `opacity 0→1`, `translateY(3px)→(0)`.

### Layout

```
display: flex
align-items: center
gap: 8px
padding: 0
```

Text fades in with CSS `opacity` transition — no layout shift.

---

## CSS Keyframes (scoped via `<style>` tag inside component)

```css
@keyframes qcvVortex {
  0%   { opacity: 0; }
  4%   { opacity: 1; }
  26%  { opacity: 0.08; }
  100% { opacity: 0; }
}

@keyframes qcvShimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}

@keyframes qcvFadeSlide {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## State & Cleanup

```
showText        — boolean, starts false, set true after 3s
step            — integer, 0-based index into messages array (0 or 1)
textKey         — integer, incremented each step to remount <span> for entry animation
showTextTimerRef — useRef, stores setTimeout id — cleared on unmount
intervalRef     — useRef, stores setInterval id — cleared on unmount
```

Both timers are cleared in the `useEffect` cleanup function.

---

## Messages

Fixed 2-message cycle (no domain awareness):
```js
["Thinking…", "Processing…"]
```

---

## Size

- SVG: 14×14px (vs 20px in ask-ai, fitted for compact drawer)
- Text: 14px font size (matching SVG scale)

---

## Out of Scope

- No changes to QuickChatDrawer logic or message handling.
- No new dependencies — pure CSS + React hooks.
- `ThinkingDots` component is removed entirely (no longer used).
- No changes to `prefers-reduced-motion` (not required for this component).
