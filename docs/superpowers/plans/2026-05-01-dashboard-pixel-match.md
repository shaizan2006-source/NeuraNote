# Dashboard Pixel-Match Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance four existing dashboard cards to pixel-match the target screenshot — FocusModeCard gets a 36-dot animated ring, QuizCard gets a 3D flashcard stack, CallTutorCard gets a larger pulsing orb, and hover states are unified across all cards.

**Architecture:** All changes are isolated to two `.jsx` files. No logic, APIs, context, or routing changes. Each card is a self-contained function inside `StudyModeCards.jsx`; tasks modify one card at a time and commit independently.

**Tech Stack:** Next.js 16 App Router, React 19, Framer Motion 12, inline styles, JavaScript (.jsx)

---

## File Map

| File | Change |
|------|--------|
| `src/components/dashboard/StudyModeCards.jsx` | Remove `RADIUS`/`CIRCUMFERENCE` constants; rewrite `FocusModeCard`, `QuizCard`, `CallTutorCard`; add `whileTap` to `ExamsCard` |
| `src/components/dashboard/AskAIHeroCard.jsx` | Update `whileHover` / add `whileTap` |

---

## Task 1: FocusModeCard — 36-Dot Animated Ring

**Files:**
- Modify: `src/components/dashboard/StudyModeCards.jsx` (lines 7-8 constants removed, lines 33-99 FocusModeCard replaced)

- [ ] **Step 1: Remove unused constants**

In `StudyModeCards.jsx`, delete lines 7-8:
```js
// DELETE these two lines — no longer needed after dot ring replaces stroke ring
const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
```

- [ ] **Step 2: Replace the entire `FocusModeCard` function**

Replace everything from `// ── Focus Mode Card` through the closing `}` of `FocusModeCard` with:

```jsx
// ── Focus Mode Card ────────────────────────────────────────────────
function FocusModeCard() {
  const router = useRouter();
  const { timeLeft, isBreak } = useDashboard();

  const totalSecs = isBreak ? 5 * 60 : 25 * 60;
  const secs = timeLeft ?? 25 * 60;
  const mm = Math.floor(secs / 60).toString().padStart(2, "0");
  const ss = (secs % 60).toString().padStart(2, "0");
  // Proportional dot count: 36 at full time, 0 at 0:00
  const activeDotCount = Math.round((secs / totalSecs) * 36);

  return (
    <motion.div
      {...entry(0.08)}
      whileHover={{ scale: 1.04, y: -4, boxShadow: "0 0 40px rgba(34,211,238,0.25)" }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push("/focus")}
      style={CARD}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: "rgba(34,211,238,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>Focus Mode</p>
          <p style={{ margin: "1px 0 0", fontSize: 9, color: "#6d6d80" }}>Pomodoro 25m</p>
        </div>
      </div>

      {/* Dot ring */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 110, height: 110 }}>

          {/* Ambient glow blob */}
          <motion.div
            animate={{ opacity: [0.3, 0.65, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Outer pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -14, borderRadius: "50%",
              border: "1.5px solid rgba(34,211,238,0.15)", pointerEvents: "none",
            }}
          />

          {/* Inner pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.05, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
            style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              border: "1.5px solid rgba(34,211,238,0.22)", pointerEvents: "none",
            }}
          />

          {/* Track dots (always dim, show ring shape) */}
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ position: "absolute", inset: 0 }}>
            {Array.from({ length: 36 }, (_, i) => {
              const angle = (i * 10 - 90) * (Math.PI / 180);
              return (
                <circle
                  key={i}
                  cx={55 + 42 * Math.cos(angle)}
                  cy={55 + 42 * Math.sin(angle)}
                  r={3}
                  fill="rgba(255,255,255,0.08)"
                />
              );
            })}
          </svg>

          {/* Active dots with cyan glow */}
          <svg
            width="110" height="110" viewBox="0 0 110 110"
            style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 3px #22d3ee)" }}
          >
            {Array.from({ length: 36 }, (_, i) => {
              if (i >= activeDotCount) return null;
              const angle = (i * 10 - 90) * (Math.PI / 180);
              // Fade from 1.0 (first active dot) → 0.3 (last active dot)
              const opacity = Math.max(0.3, 1 - (i / Math.max(activeDotCount - 1, 1)) * 0.7);
              return (
                <circle
                  key={i}
                  cx={55 + 42 * Math.cos(angle)}
                  cy={55 + 42 * Math.sin(angle)}
                  r={3}
                  fill="#22d3ee"
                  opacity={opacity}
                />
              );
            })}
          </svg>

          {/* Timer display */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#f4f4f5", letterSpacing: "-0.5px" }}>
              {mm}:{ss}
            </span>
            <span style={{ fontSize: 8, color: "#22d3ee", marginTop: 1, fontWeight: 600 }}>
              Start focus
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Start dev server and verify visually**

```bash
cd c:/Users/Shafi/ask-my-notes && npm run dev
```

Open http://localhost:3000/dashboard. Verify:
- FocusModeCard shows 36 cyan dots arranged in a circle
- Two pulsing rings breathe around the dot ring
- Ambient glow pulses behind the ring
- Timer shows "25:00" in white, "Start focus" label in cyan
- Hovering scales the card up with cyan glow
- Clicking navigates to `/focus`

- [ ] **Step 4: Run existing unit tests to confirm no regressions**

```bash
cd c:/Users/Shafi/ask-my-notes && npm test
```

Expected: all tests pass (these tests cover utility functions, not visual components, so all should pass unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/StudyModeCards.jsx
git commit -m "feat(dashboard): replace FocusModeCard ring with animated 36-dot design"
```

---

## Task 2: QuizCard — 3D Stacked Flashcards

**Files:**
- Modify: `src/components/dashboard/StudyModeCards.jsx` (QuizCard function, lines ~103-151)

- [ ] **Step 1: Replace the entire `QuizCard` function**

Replace everything from `// ── Quiz Card` through the closing `}` of `QuizCard` with:

```jsx
// ── Quiz Card ──────────────────────────────────────────────────────
function QuizCard() {
  const router = useRouter();
  const { progressQuestions } = useDashboard();
  const count = progressQuestions ?? 0;

  return (
    <motion.div
      {...entry(0.16)}
      whileHover={{ scale: 1.04, y: -4, boxShadow: "0 0 40px rgba(99,102,241,0.25)" }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push("/quiz")}
      style={CARD}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>Quiz</p>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <line x1="12" y1="12" x2="12" y2="16" />
            <line x1="10" y1="14" x2="14" y2="14" />
          </svg>
        </div>
      </div>

      {/* 3D stacked flashcards — top-right aligned */}
      <motion.div
        initial={{ opacity: 0, y: 8, rotate: 5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          paddingTop: 6,
        }}
      >
        <div style={{ position: "relative", width: 70, height: 72 }}>
          {/* Back card */}
          <div style={{
            position: "absolute", right: 6, top: 6,
            width: 52, height: 66, borderRadius: 8,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            transform: "rotate(8deg)", opacity: 0.6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "rgba(255,255,255,0.4)",
          }}>?</div>
          {/* Mid card */}
          <div style={{
            position: "absolute", right: 2, top: 2,
            width: 52, height: 66, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            transform: "rotate(3deg)", opacity: 0.75,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "rgba(255,255,255,0.5)",
          }}>?</div>
          {/* Front card */}
          <div style={{
            position: "absolute", right: 0, top: 0,
            width: 52, height: 66, borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, color: "rgba(255,255,255,0.85)", fontWeight: 700,
          }}>?</div>
        </div>
      </motion.div>

      {/* Animated count — pinned at bottom */}
      <div style={{ paddingTop: 4 }}>
        <motion.p
          key={count}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#f4f4f5", lineHeight: 1 }}
        >
          {count}
        </motion.p>
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "#6d6d80" }}>cards ready</p>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify visually**

With dev server running, check http://localhost:3000/dashboard:
- QuizCard shows three overlapping purple/indigo cards (back rotated 8°, mid rotated 3°, front upright)
- Each card shows "?" in white
- Front card has a purple drop shadow
- Stack animates in on mount (slight rotate → 0)
- Count "0" sits below the stack
- Hover scales card with indigo glow

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/StudyModeCards.jsx
git commit -m "feat(dashboard): add 3D stacked flashcard visual to QuizCard"
```

---

## Task 3: CallTutorCard — Larger Mic Orb

**Files:**
- Modify: `src/components/dashboard/StudyModeCards.jsx` (CallTutorCard function, lines ~153-265)

- [ ] **Step 1: Replace the entire `CallTutorCard` function**

Replace everything from `// ── Call Tutor Card` through the closing `}` of `CallTutorCard` with:

```jsx
// ── Call Tutor Card ────────────────────────────────────────────────
function CallTutorCard() {
  const router = useRouter();

  return (
    <motion.div
      {...entry(0.24)}
      whileHover={{ scale: 1.04, y: -4, boxShadow: "0 0 40px rgba(34,197,94,0.2)" }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push("/call-tutor")}
      style={CARD}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: "rgba(34,197,94,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f4f4f5" }}>Call Tutor</p>
          <p style={{ margin: "1px 0 0", fontSize: 9, color: "#6d6d80" }}>Speak to learn</p>
        </div>
      </div>

      {/* Beta badge */}
      <div style={{
        display: "inline-block", padding: "2px 8px",
        background: "rgba(34,197,94,0.1)",
        border: "1px solid rgba(34,197,94,0.22)",
        borderRadius: 20, fontSize: 8, color: "#22c55e", fontWeight: 700,
        marginBottom: 6, alignSelf: "flex-start",
      }}>
        Beta
      </div>

      {/* Pulsing mic orb — 80px, centered */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative" }}>
          {/* Outer pulse */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -18, borderRadius: "50%",
              border: "2px solid rgba(34,197,94,0.3)", pointerEvents: "none",
            }}
          />
          {/* Inner pulse */}
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.05, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
            style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: "2px solid rgba(34,197,94,0.4)", pointerEvents: "none",
            }}
          />
          {/* Orb */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))",
            border: "2px solid rgba(34,197,94,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={e => { e.stopPropagation(); router.push("/call-tutor"); }}
        style={{
          width: "100%", padding: "7px", background: "transparent",
          border: "1px solid rgba(34,197,94,0.22)", borderRadius: 9,
          color: "#22c55e", fontSize: 11, fontWeight: 600, cursor: "pointer",
          marginTop: 6, transition: "all 200ms ease",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(34,197,94,0.08)";
          e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(34,197,94,0.22)";
        }}
      >
        Start a session →
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify visually**

Check http://localhost:3000/dashboard:
- CallTutorCard mic orb is now 80px (clearly larger than before)
- Two concentric pulse rings breathe outward continuously
- Orb has gradient green fill + border
- Mic SVG inside is 28px
- "Start a session →" button fills the card bottom
- Hover: scale 1.04, green glow

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/StudyModeCards.jsx
git commit -m "feat(dashboard): scale up CallTutorCard mic orb to 80px with larger pulse rings"
```

---

## Task 4: ExamsCard whileTap + AskAIHeroCard hover polish

**Files:**
- Modify: `src/components/dashboard/StudyModeCards.jsx` (ExamsCard motion.div)
- Modify: `src/components/dashboard/AskAIHeroCard.jsx` (root motion.div)

- [ ] **Step 1: Add `whileTap` to ExamsCard**

In `StudyModeCards.jsx`, find the `ExamsCard` `motion.div` opening tag. It currently reads:
```jsx
    <motion.div
      {...entry(0.32)}
      whileHover={{ scale: 1.015, y: -3 }}
      whileTap={{ scale: 0.98 }}
```

Update `whileHover` and confirm `whileTap` is present (it already has `scale: 0.98` — update to match the design system's `0.97`):
```jsx
    <motion.div
      {...entry(0.32)}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
```

Note: ExamsCard's hover box-shadow is already handled conditionally by `isFinalSprint` further down in the style prop — leave that intact.

- [ ] **Step 2: Update AskAIHeroCard hover**

In `src/components/dashboard/AskAIHeroCard.jsx`, find the root `motion.div` (line ~26). It currently reads:
```jsx
      whileHover={{ scale: 1.01, y: -2 }}
```

Replace with:
```jsx
      whileHover={{ scale: 1.02, y: -3, boxShadow: "0 0 50px rgba(139,92,246,0.3)" }}
      whileTap={{ scale: 0.98 }}
```

- [ ] **Step 3: Verify visually**

Check http://localhost:3000/dashboard:
- Hovering AskAIHeroCard lifts more noticeably + purple glow around it
- Clicking AskAIHeroCard shows a slight press-down scale
- ExamsCard hover/tap feels consistent with the other small cards

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/StudyModeCards.jsx src/components/dashboard/AskAIHeroCard.jsx
git commit -m "feat(dashboard): unify hover/tap states across all dashboard cards"
```

---

## Task 5: Final Visual QA

**Files:** Read-only verification, no code changes.

- [ ] **Step 1: Side-by-side comparison**

With dev server running at http://localhost:3000/dashboard, open the target screenshot alongside the browser and verify each card:

| Card | Check |
|------|-------|
| AskAI hero | Purple gradient bg, sparkle decoration, input + send button, stronger hover glow |
| FocusModeCard | 36 cyan dots, two pulsing outer rings, ambient glow blob, "25:00" white + "Start focus" cyan |
| QuizCard | 3-layer purple card stack top-right, count bottom-left, indigo glow on hover |
| CallTutorCard | 80px green orb, two pulse rings, "Start a session →" button, green glow on hover |
| ExamsCard | Unchanged content; hover/tap consistent with other cards |
| Sidebar | Unchanged — already matches |
| GreetingRow | Unchanged — already matches |

- [ ] **Step 2: Responsive check**

Resize browser to tablet width (768px). Verify grid collapses to single column without layout breaks.

- [ ] **Step 3: Animation performance**

Open DevTools → Performance tab, record 3 seconds on dashboard. Confirm no layout thrash — all animations use `transform` and `opacity` only (GPU-composited, no layout triggers).

- [ ] **Step 4: Final test run**

```bash
npm test
```

Expected: all pass.
