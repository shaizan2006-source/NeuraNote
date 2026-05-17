# Vortex Thinking Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `ThinkingAnimation.jsx` with a two-phase Vortex dot-matrix spinner — spinner-only for the first 3 seconds, then shimmer-sweep cycling text fades in beside it.

**Architecture:** Single-file replacement of `src/components/ThinkingAnimation.jsx`. Props interface (`domain`, `uploadPending`) is unchanged so no other file needs editing. All animation is pure CSS keyframes inside a scoped `<style>` tag; all state is local React hooks with timer refs for cleanup.

**Tech Stack:** React (hooks), Next.js 13+ App Router (client component), inline SVG, CSS keyframes.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/components/ThinkingAnimation.jsx` | Full replacement — Vortex SVG + two-phase timer logic + shimmer text |

No other files change.

---

### Task 1: Replace ThinkingAnimation.jsx

**Files:**
- Modify: `src/components/ThinkingAnimation.jsx`

- [ ] **Step 1: Open the file and delete all existing content, then write the new component**

Replace the entire contents of `src/components/ThinkingAnimation.jsx` with:

```jsx
"use client";

import { useState, useEffect, useRef } from "react";

const DOMAIN_STEPS = {
  cs:         ["Parsing algorithm…",        "Checking complexity…",   "Structuring answer…"],
  law:        ["Finding relevant sections…", "Checking case law…",     "Structuring answer…"],
  finance:    ["Preparing ledger format…",   "Calculating figures…",   "Structuring answer…"],
  physics:    ["Setting up equations…",      "Tracking units…",        "Structuring answer…"],
  chemistry:  ["Balancing equations…",       "Checking mechanisms…",   "Structuring answer…"],
  math:       ["Setting up proof…",          "Working through steps…", "Structuring answer…"],
  biology:    ["Mapping pathways…",          "Checking taxonomy…",     "Structuring answer…"],
  mechanical: ["Drawing FBD…",               "Checking units…",        "Structuring answer…"],
  electrical: ["Applying KVL/KCL…",          "Reducing circuit…",      "Structuring answer…"],
  general:    ["Thinking…",                  "Analysing question…",    "Structuring answer…"],
};

const UPLOAD_STEPS = ["Reading your PDF…", "Extracting content…", "Almost ready…"];

export default function ThinkingAnimation({ domain, uploadPending }) {
  const [showText, setShowText]   = useState(false);
  const [step,     setStep]       = useState(0);
  const [textKey,  setTextKey]    = useState(0);

  const steps = uploadPending ? UPLOAD_STEPS : (DOMAIN_STEPS[domain] || DOMAIN_STEPS.general);

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
      setStep(prev => (prev + 1) % steps.length);
      setTextKey(k => k + 1);
    }, 1300);

    return () => {
      clearTimeout(showTextTimerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [steps]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>

      {/* ── Vortex SVG ── */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 56 56"
        width={20}
        height={20}
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
        <circle className="amn-vl amn-d00" r="3.1" cx="6"  cy="6" />
        <circle className="amn-vl amn-d01" r="3.1" cx="17" cy="6" />
        <circle className="amn-vl amn-d02" r="3.1" cx="28" cy="6" />
        <circle className="amn-vl amn-d03" r="3.1" cx="39" cy="6" />
        <circle className="amn-vl amn-d04" r="3.1" cx="50" cy="6" />
        <circle className="amn-vl amn-d10" r="3.1" cx="6"  cy="17"/>
        <circle className="amn-vl amn-d11" r="3.1" cx="17" cy="17"/>
        <circle className="amn-vl amn-d12" r="3.1" cx="28" cy="17"/>
        <circle className="amn-vl amn-d13" r="3.1" cx="39" cy="17"/>
        <circle className="amn-vl amn-d14" r="3.1" cx="50" cy="17"/>
        <circle className="amn-vl amn-d20" r="3.1" cx="6"  cy="28"/>
        <circle className="amn-vl amn-d21" r="3.1" cx="17" cy="28"/>
        <circle className="amn-vl amn-d22" r="3.1" cx="28" cy="28"/>
        <circle className="amn-vl amn-d23" r="3.1" cx="39" cy="28"/>
        <circle className="amn-vl amn-d24" r="3.1" cx="50" cy="28"/>
        <circle className="amn-vl amn-d30" r="3.1" cx="6"  cy="39"/>
        <circle className="amn-vl amn-d31" r="3.1" cx="17" cy="39"/>
        <circle className="amn-vl amn-d32" r="3.1" cx="28" cy="39"/>
        <circle className="amn-vl amn-d33" r="3.1" cx="39" cy="39"/>
        <circle className="amn-vl amn-d34" r="3.1" cx="50" cy="39"/>
        <circle className="amn-vl amn-d40" r="3.1" cx="6"  cy="50"/>
        <circle className="amn-vl amn-d41" r="3.1" cx="17" cy="50"/>
        <circle className="amn-vl amn-d42" r="3.1" cx="28" cy="50"/>
        <circle className="amn-vl amn-d43" r="3.1" cx="39" cy="50"/>
        <circle className="amn-vl amn-d44" r="3.1" cx="50" cy="50"/>
      </svg>

      {/* ── Shimmer text — fades in after 3s ── */}
      <span
        key={textKey}
        style={{
          fontSize:               15,
          fontWeight:             600,
          opacity:                showText ? 1 : 0,
          transition:             "opacity 0.35s ease",
          background:             "linear-gradient(90deg,#4a4a5a 0%,#4a4a5a 20%,#c4b5fd 40%,#f0f0f5 55%,#c4b5fd 70%,#4a4a5a 80%,#4a4a5a 100%)",
          backgroundSize:         "200% 100%",
          WebkitBackgroundClip:   "text",
          WebkitTextFillColor:    "transparent",
          backgroundClip:         "text",
          animation:              showText
            ? "amnShimmer 2s linear infinite, amnFadeSlide 0.35s ease"
            : "none",
          whiteSpace:             "nowrap",
        }}
      >
        {steps[step]}
      </span>

      <style>{`
        /* Vortex dot animation */
        .amn-vl {
          fill: #ffffff;
          opacity: 0;
          animation: amnVortex 2400ms linear infinite both;
        }
        @media (prefers-reduced-motion: reduce) {
          .amn-vl { animation: none; opacity: 0.45; }
        }

        /* Animation delay classes */
        .amn-d00, .amn-d11, .amn-d22 { animation-delay:    0ms; }
        .amn-d01                      { animation-delay:  150ms; }
        .amn-d02, .amn-d21            { animation-delay:  300ms; }
        .amn-d03                      { animation-delay:  450ms; }
        .amn-d04, .amn-d31            { animation-delay:  600ms; }
        .amn-d14                      { animation-delay:  750ms; }
        .amn-d24, .amn-d32            { animation-delay:  900ms; }
        .amn-d34                      { animation-delay: 1050ms; }
        .amn-d33, .amn-d44            { animation-delay: 1200ms; }
        .amn-d43                      { animation-delay: 1350ms; }
        .amn-d23, .amn-d42            { animation-delay: 1500ms; }
        .amn-d41                      { animation-delay: 1650ms; }
        .amn-d13, .amn-d40            { animation-delay: 1800ms; }
        .amn-d30                      { animation-delay: 1950ms; }
        .amn-d12, .amn-d20            { animation-delay: 2100ms; }
        .amn-d10                      { animation-delay: 2250ms; }

        @keyframes amnVortex {
          0%   { opacity: 0;    }
          4%   { opacity: 1;    }
          26%  { opacity: 0.08; }
          100% { opacity: 0;    }
        }
        @keyframes amnShimmer {
          0%   { background-position: 200% center;  }
          100% { background-position: -200% center; }
        }
        @keyframes amnFadeSlide {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Start the dev server and open the ask-ai page**

```bash
cd C:/Users/Shafi/ask-my-notes
npm run dev
```

Open `http://localhost:3000/ask-ai` in the browser.

- [ ] **Step 3: Visual verification checklist**

Send any question in the chat. Observe:

| Check | Expected |
|-------|----------|
| Immediately on submit | Vortex 5×5 grid appears, dots sweep clockwise. No text visible. |
| At ~3 seconds | Status text fades in beside the spinner with a shimmer sweep |
| Text color | Gradient from dim grey → bright white/purple → dim grey, sweeping left-to-right |
| Text cycling | Changes every ~1.3s (e.g. "Thinking…" → "Analysing question…" → "Structuring answer…") |
| Entry per cycle | Each new text slides up slightly and fades in |
| Response arrives | Both spinner and text disappear, answer renders normally |
| PDF upload pending | Shows "Reading your PDF…" → "Extracting content…" → "Almost ready…" |
| Spinner size | Approximately 20×20px — small, tight beside the text |

- [ ] **Step 4: Commit**

```bash
git add src/components/ThinkingAnimation.jsx
git commit -m "feat: replace thinking animation with Vortex spinner + shimmer text"
```

---

## Self-Review

**Spec coverage:**
- ✅ Phase 1 (0–3s): spinner only — implemented via `showText` state + 3000ms timeout
- ✅ Phase 2 (>3s): spinner + shimmer text — `opacity` transition + `amnShimmer` keyframe
- ✅ Vortex SVG at 20×20px — `width={20} height={20}` with `viewBox="0 0 56 56"`
- ✅ All 25 background dots + all 25 lit dots with correct delays
- ✅ Domain-aware text strings unchanged
- ✅ Timer cleanup on unmount — `clearTimeout` + `clearInterval` in useEffect return
- ✅ Steps reset when domain changes mid-flight
- ✅ Font size 15px, weight 600
- ✅ `prefers-reduced-motion` respected
- ✅ CSS class prefix `amn-` to avoid global conflicts

**Placeholder scan:** No TBDs or incomplete steps.

**Type consistency:** Single task, no cross-task type references.
