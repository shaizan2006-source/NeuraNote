# Auto-Scroll-to-Bottom Button — Design Spec

**Date:** 2026-04-15  
**Feature:** Floating scroll-to-bottom button in Ask-AI chat UI  
**File scope:** `src/components/dashboard/AskAISection.jsx` only (no new files)

---

## Overview

Add a ChatGPT-style floating scroll-to-bottom button to the Ask-AI chat interface. It appears when the user scrolls up beyond a threshold, and disappears when they return to the bottom or click it. New messages auto-scroll only when the user is already at the bottom — otherwise the button appears instead.

---

## Architecture

No new files. All changes are confined to `AskAISection.jsx`, following the existing pattern of defining sub-components (`CopyBtn`, `UserMessage`, `AIMessage`) at the top of the same file.

### New sub-component: `AutoScrollButton`

```
AutoScrollButton({ onClick })
  └── AnimatePresence (from existing framer-motion import)
        └── motion.button
              ↓ icon (SVG chevron-down)
              absolute positioned, centered above input pill
```

### Positioning

The **outermost section div** (currently `id="section-ask"`) gets `position: "relative"` added. The button is `position: "absolute"`, `bottom: 76px` (clears the ~60px input pill + 16px gap), `left: "50%"`, `transform: "translateX(-50%)"`.

This keeps the button visually centred over the chat column regardless of sidebar width.

---

## State & Refs

| Name | Type | Purpose |
|---|---|---|
| `showScrollBtn` | `useState(false)` | Controls AnimatePresence render — updated only when value actually changes to avoid churn |
| `showScrollBtnRef` | `useRef(false)` | Tracks current value inside throttled scroll handler (avoids stale closure) |
| `lastMsgRef` | `useRef(null)` | Ref attached to the **last rendered message element** (replaces the existing `lastUserMsgRef` for scroll target) |

> `lastUserMsgRef` remains for its existing scroll-to-user-message-on-send behavior. `lastMsgRef` is a **new** ref attached to the last `<div>` in the messages list (AI or user) for the scroll-to-bottom button target.

---

## Scroll Logic

### `isNearBottom()`

```js
const isNearBottom = () => {
  const el = chatContainerRef.current;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 200;
};
```

Threshold: **200px**. Returns `true` (treat as near-bottom) when container is absent.

### Throttled scroll handler

```js
useEffect(() => {
  const el = chatContainerRef.current;
  if (!el) return;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const near = isNearBottom();
      if (near !== showScrollBtnRef.current) {
        // Only flip state when value actually changes
        showScrollBtnRef.current = !near;
        setShowScrollBtn(!near);
      }
      ticking = false;
    });
  };

  el.addEventListener("scroll", onScroll, { passive: true });
  return () => el.removeEventListener("scroll", onScroll);
}, []); // chatContainerRef is stable — no dependency needed
```

Uses `requestAnimationFrame` as the throttle mechanism (single rAF per scroll burst). `passive: true` keeps scroll performance optimal.

### New-message behavior

**Do NOT replace or modify the existing `useEffect` that handles `shouldScrollRef` / `lastUserMsgRef`.** That logic is preserved exactly as-is.

Add a **separate, additive** `useEffect` on `messages` that only manages button visibility — it never calls `scrollToBottom()` automatically:

```
onNewMessage (additive effect only):
  if (isNearBottom()) → hide button
  else → show button (user scrolled up — do NOT auto-scroll, preserve position)
```

Key rule: **if the user is scrolled up when a question is submitted or an AI reply arrives, the position is never changed programmatically.** The button appears as the only affordance. Auto-scroll on send is handled solely by the existing `shouldScrollRef` path (which already checks `isNearBottom` and bails if user is scrolled up).

### `scrollToBottom()`

```js
const scrollToBottom = () => {
  lastMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
};
```

Targets the last rendered message element directly, not the container's `scrollTop`. This matches the spec requirement to target the last message, not bottom padding.

---

## Button Style

```
shape:      circle, 36×36px
background: rgba(28,28,32,0.92) — dark, semi-transparent
border:     1px solid rgba(255,255,255,0.12)
box-shadow: 0 4px 16px rgba(0,0,0,0.45)
icon:       SVG chevron-down, 16×16, color #a1a1aa
hover:      border brightens to rgba(255,255,255,0.22), slight lift (translateY -1px)
cursor:     pointer
z-index:    20
```

### Framer Motion animation

```js
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 8 }}
transition={{ duration: 0.18, ease: "easeOut" }}
```

Duration 180ms. Uses `AnimatePresence` (already imported) for mount/unmount transitions.

---

## Constraints Respected

- No layout redesign — only `position: relative` added to existing section wrapper
- No new files
- Does not interfere with input pill (button sits at `bottom: 76px`, pill is ~60px tall)
- No state used inside scroll handler (ref-gated to prevent re-render churn)
- Works in both `fullPage` and embedded (dashboard widget) modes — button only shows when there are messages to scroll through

---

## Affected Code Locations

| Location | Change |
|---|---|
| `AskAISection.jsx` top — new sub-component | Add `AutoScrollButton` component |
| Line ~317 (refs block) | Add `showScrollBtnRef`, `lastMsgRef` |
| Line ~300 (state block) | Add `showScrollBtn` state |
| Line ~478 (scroll useEffect) | Add throttled scroll listener |
| Line ~477 (new-message useEffect) | Add NEW additive effect — button visibility only, existing effect untouched |
| Line ~554 (section wrapper div) | Add `position: "relative"` |
| Line ~613 (messages list) | Attach `lastMsgRef` to last message wrapper |
| Between messages list and input | Render `<AutoScrollButton>` |
