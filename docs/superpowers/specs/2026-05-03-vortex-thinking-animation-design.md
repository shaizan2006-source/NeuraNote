# Vortex Thinking Animation — Design Spec

**Date:** 2026-05-03  
**Status:** Approved  
**Scope:** Replace `ThinkingAnimation.jsx` with a two-phase Vortex spinner + shimmer text animation.

---

## Problem

The current thinking state shows three bouncing purple dots + domain-aware cycling text from the moment the user submits a prompt. The goal is to replace this with the Vortex dot-matrix spinner, show it alone for the first 3 seconds, then reveal shimmer-animated cycling text.

---

## Component Boundary

**File:** `src/components/ThinkingAnimation.jsx`  
**Props (unchanged):** `{ domain, uploadPending }`  
**Call site (unchanged):** `AskAISection.jsx` line 137 — no changes needed there.

---

## Behaviour

### Phase 1: Spinner only (0 – 3 000 ms)

- Render only the Vortex SVG. No text.
- `showText` state starts `false`; a `setTimeout(3000)` sets it to `true`.
- The timeout ref is stored and cleared on unmount.

### Phase 2: Spinner + text (> 3 000 ms)

- Text fades in beside the spinner.
- Cycles through `DOMAIN_STEPS[domain]` (or `UPLOAD_STEPS`) every **1 300 ms**, same strings as today.
- On each text change a React `key` is incremented to remount the `<span>`, triggering the `fadeSlideIn` keyframe.
- The interval ref is stored and cleared on unmount.

---

## Visual Spec

### Vortex SVG

- `viewBox="0 0 56 56"`, rendered at `width={20} height={20}`.
- Background dots: `<circle r="2.4" fill="#ffffff" opacity="0.07"/>` at each of the 25 grid positions.
- Lit dots: `<circle r="3.1" fill="#ffffff"/>`, animated via CSS class `.vl` with `animation: vortexK 2400ms linear infinite both`.
- All 25 animation delays inlined as separate CSS classes (`d00`–`d44`) — exact values from the reference SVG.

### Text

- Font size: `15px`, weight: `600`.
- Animation: **Shimmer Sweep** — `background: linear-gradient(90deg, #4a4a5a 0%, #4a4a5a 20%, #c4b5fd 40%, #f0f0f5 55%, #c4b5fd 70%, #4a4a5a 80%)`, `background-size: 200% 100%`, `-webkit-background-clip: text`, `-webkit-text-fill-color: transparent`, keyframe `shimmerSweep` running `2s linear infinite`.
- Entry animation per text change: `fadeSlideIn 0.35s ease` — `opacity 0→1`, `translateY(3px)→(0)`.

### Layout

```
display: flex
align-items: center
gap: 10px
padding: 12px 0
```

Text fades in with a CSS `opacity: 0→1` transition over `0.35s` when `showText` becomes true — no layout shift, no framer-motion dependency.

---

## CSS Keyframes (scoped via `<style>` tag inside component)

```css
@keyframes vortexK {
  0%   { opacity: 0; }
  4%   { opacity: 1; }
  26%  { opacity: 0.08; }
  100% { opacity: 0; }
}

@keyframes shimmerSweep {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## State & Cleanup

```
showText        — boolean, starts false, set true after 3s
step            — integer, 0-based index into current steps array
textKey         — integer, incremented each step to remount <span> for entry animation
showTextTimerRef — useRef, stores setTimeout id — cleared on unmount
intervalRef     — useRef, stores setInterval id — cleared on unmount
```

Both timers reset when `steps` changes (domain detected mid-flight changes the array).

---

## Out of Scope

- No changes to `AskAISection.jsx`, `DashboardContext`, or any other file.
- No new dependencies — pure CSS + React hooks.
- No changes to the `DOMAIN_STEPS` / `UPLOAD_STEPS` string content.
