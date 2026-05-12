# Focus Ambient Background — Design Spec

**Date:** 2026-05-12  
**Scope:** Focus page only (`src/app/focus/page.jsx`)  
**Approach:** rAF + CSS Variables (Approach A)  
**Visual style:** Void — near-black with single vast subliminal bloom  

---

## Problem

The focus page background is a static `linear-gradient` applied to the outer `div` (`pageStyle.background` in `focus/page.jsx:165`). The inner scrollable container `.amn-focus-scroll` scrolls content directly over this frozen gradient, creating a "cheap overlay pasted on top" effect. The gradient never moves, which reads as flat and disconnected from the page.

---

## Goal

Replace the static gradient with a cinematic layered ambient background system that:
- Moves subtly at different speeds as the user scrolls (parallax depth)
- Breathes slowly while idle so it never feels dead
- Performs at 60 fps with zero layout/paint triggers
- Reads as premium and immersive without distracting from the focus session content

---

## Architecture

### New files

```
src/components/focus/
  FocusAmbientBackground.tsx       ← component + scroll controller
  ambient-background.css           ← layer styles + keyframes
  ambient-background.config.ts     ← all tunable constants
```

### Modified files

```
src/app/focus/page.jsx             ← remove inline background, mount component
```

---

## Layer Stack

Four `position: absolute` divs inside a single `position: fixed; inset: 0; z-index: 0; pointer-events: none` root. Stacked bottom → top:

| Layer | Class | Movement | Animation |
|---|---|---|---|
| Base | `.amb-layer-base` | none | none |
| Far bloom | `.amb-layer-far` | parallax 3% | breathe 14 s |
| Mid wash | `.amb-layer-mid` | parallax 7% | breathe 10 s (offset 3 s) |
| Vignette | `.amb-layer-vignette` | none | none |

### Layer details

**layer-base**  
Solid near-black gradient (`#04060e → #070920 → #050610`). Covers the whole viewport. Ensures no background flash on any device or theme.

**layer-far**  
`radial-gradient(ellipse 85% 65% at 50% 30%, rgba(79,22,162,0.18) 0%, rgba(49,10,119,0.07) 45%, transparent 70%)`. Sized at 140% of the viewport (oversized so translate never exposes an edge). `filter: blur(60px)`. Translates on the Y axis via `translate3d` driven by the rAF controller. Breathing keyframe: `scale(1) ↔ scale(1.038)` + `opacity 1 ↔ 0.72` over 14 s.

**layer-mid**  
Two-part: a `linear-gradient` top-edge violet wash + a `radial-gradient` indigo crown anchored above the viewport. Also oversized at 140%. `filter: blur(40px)`. Translates 7% of scroll progress — 2.3× faster than far, creating the parallax depth illusion. Breathing keyframe: same as far, 10 s duration, 3 s delay so the two layers are never in sync.

**layer-vignette**  
`radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.45) 100%)`. Static. Darkens all four edges, keeps the center feeling lit, ensures card text remains readable regardless of bloom intensity.

---

## Scroll Motion Controller

### How it works

1. On mount, query the scroll container via `AMBIENT_CONFIG.SCROLL_SELECTOR` (`.amn-focus-scroll`).
2. Attach a **passive** `scroll` event listener that records `scrollEl.scrollTop` as `targetY`.
3. On the first scroll event, start a `requestAnimationFrame` loop (`tick`).
4. Each tick: `currentY += (targetY - currentY) * LERP` — lerp smoothly toward target.
5. Write `translate3d(0, ${currentY * -FAR_PARALLAX}px, 0)` directly to `farLayerRef.current.style.transform` (and similarly for mid layer). Direct DOM writes, no React re-renders.
6. When `|targetY - currentY| < 0.1`, cancel rAF and set `isRunning = false`. The loop restarts only on the next scroll event — **zero CPU at rest**.

### Why direct style writes (not CSS variables + calc)

CSS `calc()` on a custom property adds a style recalculation step. Writing the computed pixel value directly to `element.style.transform` means the browser only composites — no layout, no paint. This is the same pattern used by Linear and Vercel's background systems.

### Refs

Two `useRef<HTMLDivElement>` handles (`farLayerRef`, `midLayerRef`) target the **outer** wrapper divs (see DOM structure below). No state, no re-renders after mount.

---

## Breathing Animation

Pure CSS `@keyframes ambBreathe`:

```css
@keyframes ambBreathe {
  0%, 100% { opacity: 1;    transform: scale(1);     }
  50%       { opacity: 0.72; transform: scale(1.038); }
}
```

### DOM structure — two-div pattern (critical)

The rAF controller writes `style.transform = translate3d(...)` as an inline style. CSS animations also use the `transform` property. Inline styles override CSS animations — if both were on the same element, the breathing would be silently killed at runtime.

Solution: each animated layer uses **two nested divs**:

```
<div ref={farLayerRef} class="amb-layer-far-wrap">   ← rAF writes translate3d here
  <div class="amb-layer-far-inner">                   ← CSS keyframe drives scale + opacity here
  </div>
</div>
```

The outer wrapper (`-wrap`) is what the rAF touches. The inner div (`-inner`) carries the breathing keyframe. Because they are separate elements, both transforms are applied independently with no conflict.

Applied: `layer-far-inner` gets 14 s ease-in-out infinite, `layer-mid-inner` gets 10 s ease-in-out 3 s delay.

`@media (prefers-reduced-motion: reduce)` removes both animations.

---

## Tunable Configuration

All in `ambient-background.config.ts`:

```ts
export const AMBIENT_CONFIG = {
  SCROLL_SELECTOR:       '.amn-focus-scroll',
  LERP:                  0.06,   // 0.03 = dreamlike  0.12 = snappy
  FAR_PARALLAX:          0.03,   // 1000px scroll → 30px shift
  MID_PARALLAX:          0.07,   // 1000px scroll → 70px shift
  FAR_BREATHE_DURATION:  '14s',
  MID_BREATHE_DURATION:  '10s',
  MID_BREATHE_DELAY:     '3s',
  FAR_OPACITY:           0.18,   // keep under 0.25 for Void feel
  MID_OPACITY:           0.10,
} as const;
```

---

## Integration: `focus/page.jsx` Changes

1. Remove the `background` key from `pageStyle` (line 165). The ambient component provides it.
2. Import and mount `<FocusAmbientBackground />` as the first child of the outer `div`.
3. Ensure the outer `div` has no background colour (transparent or unset).
4. The z-index stack is already correct: fixed background at 0, sidebar and content above it, modals at 200+.

---

## Performance

- `position: fixed` root → promoted to its own compositor layer immediately.
- `will-change: transform` on animated layers → GPU composited.
- `transform: translate3d()` only — no `top`, `left`, `background-position` changes.
- `filter: blur()` is applied once at paint time; subsequent translates are compositor-only.
- rAF loop self-cancels when idle — zero CPU overhead at rest.
- Passive scroll listener — never blocks the main thread.
- `@media (prefers-reduced-motion: reduce)` disables all animations.

---

## What This Fixes

The root bug: the gradient lived on a non-scrolling container (`height: 100vh; overflow: hidden`). Content scrolled over it, creating a frozen overlay effect. The new system is `position: fixed` intentionally, but the rAF controller moves it in response to scroll — so the background *tracks* the content's scroll state rather than ignoring it. The parallax multipliers (3%, 7%) ensure the movement is atmospheric rather than literal, so it feels like depth rather than parallax gimmickry.
