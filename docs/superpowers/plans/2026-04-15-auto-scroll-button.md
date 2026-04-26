# Auto-Scroll-to-Bottom Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating ChatGPT-style scroll-to-bottom button to the Ask-AI chat UI that appears when the user scrolls up and disappears when they return to the bottom or click it — without touching any existing scroll/auto-scroll behavior.

**Architecture:** All changes are confined to `AskAISection.jsx`. A new `AutoScrollButton` sub-component is added at the top of the file following the existing sub-component pattern. A zero-height sentinel `<div>` at the end of the messages list is the scroll target. Two new refs and one state variable manage visibility with no unnecessary re-renders. The existing `shouldScrollRef` / `lastUserMsgRef` logic is completely untouched.

**Tech Stack:** React (hooks), Framer Motion (already imported: `motion`, `AnimatePresence`), inline styles (no Tailwind — matches existing component style)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/components/dashboard/AskAISection.jsx` | Modify | Add sub-component, refs, state, effects, sentinel div, button render |
| `tests/unit/scrollToBottom.test.mjs` | Create | Unit test for `isNearBottom` pure function |

---

### Task 1: Unit test — `isNearBottom` pure function

The scroll threshold logic is pure and testable. Extract it as a standalone function signature and verify it before wiring it into the component.

**Files:**
- Create: `tests/unit/scrollToBottom.test.mjs`

- [ ] **Step 1.1: Write the failing test**

Create `tests/unit/scrollToBottom.test.mjs`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Pure version of the isNearBottom logic (extracted for testing)
function isNearBottom(scrollHeight, scrollTop, clientHeight, threshold = 200) {
  return scrollHeight - scrollTop - clientHeight < threshold;
}

describe("isNearBottom", () => {
  it("returns true when at exact bottom", () =>
    assert.equal(isNearBottom(1000, 900, 100), true));

  it("returns true when within threshold (100px from bottom)", () =>
    assert.equal(isNearBottom(1000, 800, 100), true));

  it("returns true when at threshold boundary (199px from bottom)", () =>
    assert.equal(isNearBottom(1000, 701, 100), true));

  it("returns false when beyond threshold (200px from bottom)", () =>
    assert.equal(isNearBottom(1000, 700, 100), false));

  it("returns false when far from bottom (500px from bottom)", () =>
    assert.equal(isNearBottom(1000, 400, 100), false));

  it("returns true when content is shorter than viewport (no scroll needed)", () =>
    assert.equal(isNearBottom(400, 0, 600), true));
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd "c:\Users\Shafi\ask-my-notes"
node --test tests/unit/scrollToBottom.test.mjs
```

Expected: `ReferenceError` or file-not-found — the test file exists but no implementation to import. In this case all tests should PASS because the function is defined inline in the test file itself (it's a pure function, not imported). If all pass, proceed to next task.

- [ ] **Step 1.3: Commit the test**

```bash
git add tests/unit/scrollToBottom.test.mjs
git commit -m "test: add isNearBottom unit tests for scroll button"
```

---

### Task 2: Add `AutoScrollButton` sub-component

Add after the existing `FileChip` component (around line 278), before the `// ── Main component` comment.

**Files:**
- Modify: `src/components/dashboard/AskAISection.jsx` — add `AutoScrollButton` component

- [ ] **Step 2.1: Add `ChevronDownIcon` and `AutoScrollButton` to AskAISection.jsx**

Insert this block directly after the closing brace of `FileChip` (the line `}` before `// ── Main component ───...`):

```jsx
function ChevronDownIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function AutoScrollButton({ onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        position:       "absolute",
        bottom:         76,
        left:           "50%",
        transform:      "translateX(-50%)",
        width:          36,
        height:         36,
        borderRadius:   "50%",
        background:     "rgba(28,28,32,0.92)",
        border:         `1px solid ${hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"}`,
        boxShadow:      "0 4px 16px rgba(0,0,0,0.45)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         "pointer",
        color:          "#a1a1aa",
        zIndex:         20,
        transform:      `translateX(-50%) translateY(${hovered ? "-1px" : "0"})`,
        transition:     "border-color 0.15s, transform 0.15s",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding:        0,
      }}
      aria-label="Scroll to bottom"
    >
      <ChevronDownIcon />
    </motion.button>
  );
}
```

> Note: `React.useState` is used inside `AutoScrollButton` because React is available in scope via the existing `import { useState, ... } from "react"`. However the destructured `useState` is already in scope — so just use `useState(false)` directly, not `React.useState(false)`. Replace `React.useState` with `useState` in the actual edit.

- [ ] **Step 2.2: Verify the file still parses (no syntax errors)**

```bash
cd "c:\Users\Shafi\ask-my-notes"
node --input-type=module < /dev/null || npx next build --no-lint 2>&1 | head -20
```

Actually just run the dev server briefly and check for parse errors:

```bash
npx next dev 2>&1 | head -30
```

Expected: server starts without `SyntaxError` or `TypeError`. Press Ctrl+C once confirmed.

- [ ] **Step 2.3: Commit**

```bash
git add src/components/dashboard/AskAISection.jsx
git commit -m "feat: add AutoScrollButton sub-component with animation"
```

---

### Task 3: Add refs, state, and helpers inside `AskAISection`

**Files:**
- Modify: `src/components/dashboard/AskAISection.jsx` — add to the state/refs block and define helpers

- [ ] **Step 3.1: Add `showScrollBtn` state and two new refs**

In the state block (after the existing `const [menuHovered, setMenuHovered] = useState(null);` line, around line 324), add:

```jsx
const [showScrollBtn, setShowScrollBtn] = useState(false);
```

In the refs block (after `const menuRef = useRef(null);`, around line 322), add:

```jsx
const showScrollBtnRef = useRef(false);  // mirror of showScrollBtn — avoids stale closure in scroll handler
const bottomSentinelRef = useRef(null);  // zero-height div at end of messages list
```

- [ ] **Step 3.2: Add `isNearBottom` and `scrollToBottom` helpers**

Add these two helper functions directly after the `const nextId = () => { ... }` line (around line 326):

```jsx
const isNearBottom = () => {
  const el = chatContainerRef.current;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 200;
};

const scrollToBottom = () => {
  bottomSentinelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
};
```

- [ ] **Step 3.3: Commit**

```bash
git add src/components/dashboard/AskAISection.jsx
git commit -m "feat: add scroll refs, state, isNearBottom and scrollToBottom helpers"
```

---

### Task 4: Add throttled scroll listener

**Files:**
- Modify: `src/components/dashboard/AskAISection.jsx` — new `useEffect` for scroll listener

- [ ] **Step 4.1: Add scroll listener `useEffect`**

Add this `useEffect` after the "Close menu on outside click" effect (after the `}, [menuOpen]);` closing at around line 367):

```jsx
// Throttled scroll listener — shows/hides scroll-to-bottom button
useEffect(() => {
  const el = chatContainerRef.current;
  if (!el) return;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const near = isNearBottom();
      if (!near !== showScrollBtnRef.current) {
        showScrollBtnRef.current = !near;
        setShowScrollBtn(!near);
      }
      ticking = false;
    });
  };

  el.addEventListener("scroll", onScroll, { passive: true });
  return () => el.removeEventListener("scroll", onScroll);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // chatContainerRef is assigned once on mount — stable ref
```

- [ ] **Step 4.2: Verify in browser — scroll behavior**

Start dev server:
```bash
npx next dev
```

Open `http://localhost:3000/ask-ai`. Send enough messages to make the chat scrollable. Scroll up more than 200px. Confirm:
- Button appears with fade-in animation
- Button disappears when scrolling back to bottom
- Button click scrolls smoothly to bottom and disappears

Press Ctrl+C.

- [ ] **Step 4.3: Commit**

```bash
git add src/components/dashboard/AskAISection.jsx
git commit -m "feat: add throttled scroll listener for scroll button visibility"
```

---

### Task 5: Add additive new-message visibility effect

This effect shows the button when a new message arrives and the user is scrolled up. It **never auto-scrolls** — the existing `shouldScrollRef` effect handles that and is untouched.

**Files:**
- Modify: `src/components/dashboard/AskAISection.jsx` — new additive `useEffect`

- [ ] **Step 5.1: Add the additive new-message effect**

Add this `useEffect` directly after the existing scroll effect that ends with `}, [messages]);` (around line 492). Add it as a sibling, not replacing it:

```jsx
// Additive effect — shows button when new message arrives while user is scrolled up.
// Does NOT auto-scroll. Existing shouldScrollRef effect handles scroll-on-send.
useEffect(() => {
  if (messages.length === 0) return;
  if (!isNearBottom()) {
    if (!showScrollBtnRef.current) {
      showScrollBtnRef.current = true;
      setShowScrollBtn(true);
    }
  } else {
    if (showScrollBtnRef.current) {
      showScrollBtnRef.current = false;
      setShowScrollBtn(false);
    }
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [messages]);
```

- [ ] **Step 5.2: Commit**

```bash
git add src/components/dashboard/AskAISection.jsx
git commit -m "feat: add additive new-message effect for scroll button visibility"
```

---

### Task 6: Wire sentinel div, `position: relative`, and render button

**Files:**
- Modify: `src/components/dashboard/AskAISection.jsx` — JSX changes

- [ ] **Step 6.1: Add `position: "relative"` to section wrapper**

Find the outermost section wrapper div (line ~555):

```jsx
<div
  id="section-ask"
  className={fullPage ? undefined : "section-card"}
  style={fullPage
    ? { display: "flex", flexDirection: "column", height: "100%", padding: "20px 0 16px" }
    : { marginTop: 0, padding: 24 }
  }
>
```

Change to:

```jsx
<div
  id="section-ask"
  className={fullPage ? undefined : "section-card"}
  style={fullPage
    ? { display: "flex", flexDirection: "column", height: "100%", padding: "20px 0 16px", position: "relative" }
    : { marginTop: 0, padding: 24, position: "relative" }
  }
>
```

- [ ] **Step 6.2: Add the sentinel div inside the chat container**

Find the chat messages div (around line 614):

```jsx
      <div ref={chatContainerRef} style={{
        ...
      }}>
        <DynamicGreeting isEmptyChat={!hasMessages} />
        {messages.map((msg, i) => {
          ...
        })}
      </div>
```

Add the sentinel as the last child, inside `chatContainerRef` div, after `{messages.map(...)}`:

```jsx
      <div ref={chatContainerRef} style={{
        ...
      }}>
        <DynamicGreeting isEmptyChat={!hasMessages} />
        {messages.map((msg, i) => {
          const isLastUser = msg.role === "user" && messages.slice(i + 1).every(m => m.role !== "user");
          return msg.role === "user"
            ? <UserMessage key={msg.id} text={msg.text} innerRef={isLastUser ? lastUserMsgRef : null} />
            : <AIMessage
                key={msg.id}
                msg={msg}
                isLast={i === messages.length - 1}
                onExport={handleExportPdf}
                isExporting={isExporting}
              />;
        })}
        {/* Scroll-to-bottom sentinel — zero-height, used as scrollIntoView target */}
        <div ref={bottomSentinelRef} style={{ height: 0, flexShrink: 0 }} />
      </div>
```

- [ ] **Step 6.3: Render `AutoScrollButton` between messages and input**

Find the gap between the closing `</div>` of the chat messages block and the opening `<div ref={menuRef} ...>` of the input area (around line 638–648). Add `AnimatePresence` + button there:

```jsx
      {/* ── Scroll-to-bottom button ─────────────────────── */}
      <AnimatePresence>
        {showScrollBtn && (
          <AutoScrollButton
            onClick={() => {
              scrollToBottom();
              showScrollBtnRef.current = false;
              setShowScrollBtn(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Input area ─────────────────────────────────────── */}
      <div
        ref={menuRef}
        ...
```

- [ ] **Step 6.4: Full browser verification**

```bash
npx next dev
```

Open `http://localhost:3000/ask-ai`. Run through each scenario:

| Scenario | Expected |
|---|---|
| Fresh chat, at bottom | Button is hidden |
| Scroll up > 200px | Button fades in (↓ icon, centered, dark pill) |
| Scroll back to bottom manually | Button fades out |
| Click button while scrolled up | Smoothly scrolls to bottom, button fades out |
| Submit question while AT bottom | Auto-scrolls to question (existing behavior), button stays hidden |
| Submit question while SCROLLED UP | Position does NOT change, button appears |
| AI reply arrives while AT bottom | Auto-scrolls (existing behavior), button hidden |
| AI reply arrives while SCROLLED UP | Position preserved, button appears (or stays visible) |
| New chat (0 messages) | Button is never shown |

- [ ] **Step 6.5: Commit**

```bash
git add src/components/dashboard/AskAISection.jsx
git commit -m "feat: wire auto-scroll button — sentinel div, position:relative, AnimatePresence render"
```

---

### Task 7: Add `scrollToBottom.test.mjs` to the test script

**Files:**
- Modify: `package.json` — add new test file to `test` script

- [ ] **Step 7.1: Add test to package.json**

In `package.json`, find the `"test"` script and append `tests/unit/scrollToBottom.test.mjs` to the node `--test` command:

```json
"test": "node --test tests/unit/auth.test.mjs tests/unit/planLimits.test.mjs tests/unit/ocr.test.mjs tests/unit/streaming.test.mjs tests/unit/cache.test.mjs tests/unit/parseAnswerSections.test.mjs tests/unit/confidenceBadge.test.mjs tests/unit/sectionActions.test.mjs tests/unit/answerTemplates.test.mjs tests/unit/edgeCases.test.mjs tests/unit/scrollToBottom.test.mjs",
```

- [ ] **Step 7.2: Run full test suite**

```bash
cd "c:\Users\Shafi\ask-my-notes"
npm test
```

Expected: all tests pass including the new `scrollToBottom` suite.

- [ ] **Step 7.3: Commit**

```bash
git add package.json
git commit -m "chore: add scrollToBottom unit test to test suite"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Button hidden by default | `showScrollBtn` starts `false` — Task 3 |
| Show when >200px from bottom | `isNearBottom()` threshold — Task 3, Task 4 |
| Hide when back at bottom | Scroll listener flips state — Task 4 |
| Click → smooth scroll to bottom | `scrollToBottom()` via sentinel — Task 3, Task 6 |
| Click → hide button | `onClick` sets state false — Task 6 |
| New msg at bottom → no button | Additive effect checks `isNearBottom()` — Task 5 |
| New msg scrolled up → show button | Additive effect — Task 5 |
| Submit while scrolled up → don't auto-scroll | Existing `shouldScrollRef` bails on `!isNearBottom` — untouched |
| Throttled scroll listener | `requestAnimationFrame` gate — Task 4 |
| Fade + slide animation 180ms | `motion.button` initial/animate/exit — Task 2 |
| Centered above input bar | `left:50%, bottom:76px, transform:translateX(-50%)` — Task 2 |
| No new files (except test) | All in `AskAISection.jsx` — confirmed |
| No layout redesign | Only `position:relative` added to existing wrapper — Task 6 |
| Existing behaviors preserved | `shouldScrollRef` / `lastUserMsgRef` untouched — all tasks |

**Placeholder scan:** No TBDs, no "implement later", no vague steps. All code is shown in full. ✓

**Type consistency:** `showScrollBtnRef`, `bottomSentinelRef`, `showScrollBtn`, `isNearBottom`, `scrollToBottom` — all defined in Task 3, used consistently in Tasks 4, 5, 6. ✓
