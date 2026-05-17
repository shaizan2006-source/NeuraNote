# QuickChat Vortex Spinner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace QuickChat's `ThinkingDots` component with a Vortex dot-matrix spinner that shows for 3 seconds, then fades in shimmer-sweep cycling text.

**Architecture:** Create a new `QuickChatVortex` component with the same Vortex SVG and animation logic as `ThinkingAnimation`, but sized at 14×14px for the compact drawer context and using simple 2-message cycles ("Thinking…", "Processing…") instead of domain-aware text. Replace the existing `ThinkingDots` import in `QuickChatDrawer.jsx`.

**Tech Stack:** React (hooks), Next.js 13+ App Router, inline SVG, CSS keyframes.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/components/QuickChat/QuickChatVortex.jsx` | Vortex spinner + shimmer text for QuickChat |
| Modify | `src/components/QuickChat/QuickChatDrawer.jsx` | Replace `ThinkingDots` with `QuickChatVortex` |

---

### Task 1: Create QuickChatVortex.jsx

**Files:**
- Create: `src/components/QuickChat/QuickChatVortex.jsx`

- [ ] **Step 1: Create the new component file with full implementation**

Create `src/components/QuickChat/QuickChatVortex.jsx` with:

```jsx
"use client";

import { useState, useEffect, useRef } from "react";

export default function QuickChatVortex() {
  const [showText, setShowText]   = useState(false);
  const [step,     setStep]       = useState(0);
  const [textKey,  setTextKey]    = useState(0);

  const messages = ["Thinking…", "Processing…"];

  const showTextTimerRef = useRef(null);
  const intervalRef      = useRef(null);

  useEffect(() => {
    setStep(0);
    setTextKey(k => k + 1);
    setShowText(false);

    clearTimeout(showTextTimerRef.current);
    clearInterval(intervalRef.current);

    showTextTimerRef.current = setTimeout(() => setShowText(true), 3000);

    intervalRef.current = setInterval(() => {
      setStep(prev => (prev + 1) % messages.length);
      setTextKey(k => k + 1);
    }, 1300);

    return () => {
      clearTimeout(showTextTimerRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 0 }}>

      {/* ── Vortex SVG (14×14px) ── */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 56 56"
        width={14}
        height={14}
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Background dots — 5×5 grid, dim */}
        <circle r="2.4" cx="6"  cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="6"  cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="6"  cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="6"  cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="6"  cy="50" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="50" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="50" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="50" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="50" fill="#fff" opacity="0.07"/>

        {/* Lit dots — animated vortex sweep */}
        <circle className="qcv-vl qcv-d00" r="3.1" cx="6"  cy="6" />
        <circle className="qcv-vl qcv-d01" r="3.1" cx="17" cy="6" />
        <circle className="qcv-vl qcv-d02" r="3.1" cx="28" cy="6" />
        <circle className="qcv-vl qcv-d03" r="3.1" cx="39" cy="6" />
        <circle className="qcv-vl qcv-d04" r="3.1" cx="50" cy="6" />
        <circle className="qcv-vl qcv-d10" r="3.1" cx="6"  cy="17"/>
        <circle className="qcv-vl qcv-d11" r="3.1" cx="17" cy="17"/>
        <circle className="qcv-vl qcv-d12" r="3.1" cx="28" cy="17"/>
        <circle className="qcv-vl qcv-d13" r="3.1" cx="39" cy="17"/>
        <circle className="qcv-vl qcv-d14" r="3.1" cx="50" cy="17"/>
        <circle className="qcv-vl qcv-d20" r="3.1" cx="6"  cy="28"/>
        <circle className="qcv-vl qcv-d21" r="3.1" cx="17" cy="28"/>
        <circle className="qcv-vl qcv-d22" r="3.1" cx="28" cy="28"/>
        <circle className="qcv-vl qcv-d23" r="3.1" cx="39" cy="28"/>
        <circle className="qcv-vl qcv-d24" r="3.1" cx="50" cy="28"/>
        <circle className="qcv-vl qcv-d30" r="3.1" cx="6"  cy="39"/>
        <circle className="qcv-vl qcv-d31" r="3.1" cx="17" cy="39"/>
        <circle className="qcv-vl qcv-d32" r="3.1" cx="28" cy="39"/>
        <circle className="qcv-vl qcv-d33" r="3.1" cx="39" cy="39"/>
        <circle className="qcv-vl qcv-d34" r="3.1" cx="50" cy="39"/>
        <circle className="qcv-vl qcv-d40" r="3.1" cx="6"  cy="50"/>
        <circle className="qcv-vl qcv-d41" r="3.1" cx="17" cy="50"/>
        <circle className="qcv-vl qcv-d42" r="3.1" cx="28" cy="50"/>
        <circle className="qcv-vl qcv-d43" r="3.1" cx="39" cy="50"/>
        <circle className="qcv-vl qcv-d44" r="3.1" cx="50" cy="50"/>
      </svg>

      {/* ── Shimmer text — fades in after 3s ── */}
      <span
        key={textKey}
        style={{
          fontSize:               14,
          fontWeight:             600,
          opacity:                showText ? 1 : 0,
          transition:             "opacity 0.35s ease",
          background:             "linear-gradient(90deg,#4a4a5a 0%,#4a4a5a 20%,#c4b5fd 40%,#f0f0f5 55%,#c4b5fd 70%,#4a4a5a 80%,#4a4a5a 100%)",
          backgroundSize:         "200% 100%",
          WebkitBackgroundClip:   "text",
          WebkitTextFillColor:    "transparent",
          backgroundClip:         "text",
          animation:              showText
            ? "qcvShimmer 2s linear infinite, qcvFadeSlide 0.35s ease"
            : "none",
          whiteSpace:             "nowrap",
        }}
      >
        {messages[step]}
      </span>

      <style>{`
        /* Vortex dot animation */
        .qcv-vl {
          fill: #ffffff;
          opacity: 0;
          animation: qcvVortex 2400ms linear infinite both;
        }

        /* Animation delay classes */
        .qcv-d00, .qcv-d11, .qcv-d22 { animation-delay:    0ms; }
        .qcv-d01                      { animation-delay:  150ms; }
        .qcv-d02, .qcv-d21            { animation-delay:  300ms; }
        .qcv-d03                      { animation-delay:  450ms; }
        .qcv-d04, .qcv-d31            { animation-delay:  600ms; }
        .qcv-d14                      { animation-delay:  750ms; }
        .qcv-d24, .qcv-d32            { animation-delay:  900ms; }
        .qcv-d34                      { animation-delay: 1050ms; }
        .qcv-d33, .qcv-d44            { animation-delay: 1200ms; }
        .qcv-d43                      { animation-delay: 1350ms; }
        .qcv-d23, .qcv-d42            { animation-delay: 1500ms; }
        .qcv-d41                      { animation-delay: 1650ms; }
        .qcv-d13, .qcv-d40            { animation-delay: 1800ms; }
        .qcv-d30                      { animation-delay: 1950ms; }
        .qcv-d12, .qcv-d20            { animation-delay: 2100ms; }
        .qcv-d10                      { animation-delay: 2250ms; }

        @keyframes qcvVortex {
          0%   { opacity: 0;    }
          4%   { opacity: 1;    }
          26%  { opacity: 0.08; }
          100% { opacity: 0;    }
        }
        @keyframes qcvShimmer {
          0%   { background-position: 200% center;  }
          100% { background-position: -200% center; }
        }
        @keyframes qcvFadeSlide {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit the new component**

```bash
git add src/components/QuickChat/QuickChatVortex.jsx
git commit -m "feat(quickchat): create Vortex spinner component"
```

---

### Task 2: Update QuickChatDrawer to use QuickChatVortex

**Files:**
- Modify: `src/components/QuickChat/QuickChatDrawer.jsx:31-44, 85`

- [ ] **Step 1: Remove the ThinkingDots component (lines 31–44)**

Delete the entire `ThinkingDots` function:

```jsx
function ThinkingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "#52525b",
          display: "inline-block",
          animation: `dotPulse 1.4s ease-in-out ${i * 0.22}s infinite`,
        }} />
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Add import for QuickChatVortex at the top of QuickChatDrawer.jsx**

After line 7 (after existing imports), add:

```jsx
import QuickChatVortex from "./QuickChatVortex";
```

- [ ] **Step 3: Update AIBubble to use QuickChatVortex instead of ThinkingDots**

In the `AIBubble` component (around line 85), replace:

```jsx
{!text && isStreaming
  ? <ThinkingDots />
  : <>{text}{isStreaming && <BlinkingCursor />}</>
}
```

With:

```jsx
{!text && isStreaming
  ? <QuickChatVortex />
  : <>{text}{isStreaming && <BlinkingCursor />}</>
}
```

- [ ] **Step 4: Remove the dotPulse keyframe from CURSOR_CSS**

In the `CURSOR_CSS` string at the top of the file (line 11), remove the entire `dotPulse` keyframe since it's no longer used:

```css
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40%           { opacity: 1;    transform: scale(1);    }
}
```

The final CURSOR_CSS should only contain the `blink` keyframe and code block styles.

- [ ] **Step 5: Verify the component still works**

No tests needed — visual verification only. Open the dashboard, trigger a quick chat question, and verify:
- Vortex spinner appears immediately (no text)
- At ~3 seconds, text fades in ("Thinking…")
- At ~4.3s, text cycles to "Processing…"
- On response, spinner + text disappear and answer streams in

- [ ] **Step 6: Commit the changes**

```bash
git add src/components/QuickChat/QuickChatDrawer.jsx
git commit -m "feat(quickchat): replace ThinkingDots with QuickChatVortex"
```

---

## Self-Review

**Spec coverage:**
- ✅ Component: `QuickChatVortex.jsx` created with Vortex SVG at 14×14px
- ✅ Messages: Simple 2-message cycle ("Thinking…", "Processing…")
- ✅ Phase 1 (0–3s): Spinner only
- ✅ Phase 2 (>3s): Spinner + shimmer text fades in
- ✅ Integration: Replaces `ThinkingDots` in `AIBubble`
- ✅ CSS: Scoped keyframes with `qcv-` prefix

**Placeholder scan:** No TBDs, no incomplete steps, all code is complete.

**Type consistency:** No cross-task dependencies; single component + single integration task.

**Scope check:** Tightly focused on one component and one call site. No extraneous changes.
