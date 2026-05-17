# Dashboard Study Page Redesign — Design Spec

**Date:** 2026-04-30  
**Project:** ask-my-notes  
**Status:** Approved  
**Approach:** Approach 1 — Replace & Refactor  

---

## 1. Goal

Rebuild the dashboard Study view to pixel-match the provided target image. All existing backend connections, API routes, React Context state, and navigation flows are preserved. No new state management library is introduced. No new API endpoints are created.

---

## 2. Scope

**In scope:**
- `StudyModeCards.jsx` — full rebuild (bento grid layout)
- `DashboardSidebar.jsx` — trim to 2 nav items, redesign bottom section
- `GreetingRow.jsx` — verify Study/Progress toggle, minor style updates only
- `AskAIHeroCard.jsx` — pixel-match restyling + interaction updates
- `FocusModeSection.jsx` — pixel-match restyling + circular timer
- `QuizSection.jsx` — pixel-match restyling + count animation
- `VoiceCallSection.jsx` — pixel-match restyling + mic breathing animation
- `ExamsHeroCard.jsx` — pixel-match restyling + Final Sprint badge logic

**Out of scope:**
- Progress page (deferred)
- Any new API endpoints
- TypeScript migration (all files stay `.jsx`)
- New state management (no Zustand)

---

## 3. Architecture

### State Flow
```
DashboardContext (existing, untouched)
  ├── user (auth data: name, email, avatar_url)
  ├── exams array + computed daysLeft
  ├── quiz count
  ├── streak
  └── masteryTopics

FocusSessionContext (existing, untouched)
  └── timer state (isRunning, timeLeft)

↓ (consumed by each card via existing hooks)

StudyModeCards.jsx
  ├── AskAIHeroCard.jsx
  ├── FocusModeSection.jsx
  ├── QuizSection.jsx
  ├── VoiceCallSection.jsx
  └── ExamsHeroCard.jsx
```

### Key principle
Components are "dumb renderers" — they receive data from context and dispatch actions. No local state beyond UI-only state (e.g., input value, hover state).

---

## 4. File Changes

| File | Change Type | Notes |
|------|-------------|-------|
| `StudyModeCards.jsx` | Full rebuild | New bento grid layout |
| `DashboardSidebar.jsx` | Refactor | Trim to 2 nav items, dynamic user info |
| `GreetingRow.jsx` | Verify + minor style | Study/Progress toggle already working |
| `AskAIHeroCard.jsx` | Restyling + interactions | Keep existing API call |
| `FocusModeSection.jsx` | Restyling + circular timer | Keep FocusSessionContext |
| `QuizSection.jsx` | Restyling + count animation | Keep existing quiz count |
| `VoiceCallSection.jsx` | Restyling + mic animation | Keep existing voice API |
| `ExamsHeroCard.jsx` | Restyling + badge logic | Keep existing exam data |

---

## 5. Layout Structure

### Desktop (1024px+) — Bento Grid
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (240px fixed)  │  Main content area                  │
│                        │  ┌─────────────┐  ┌──────────────┐ │
│  Logo                  │  │             │  │  Focus Mode  │ │
│                        │  │   Ask AI    │  │  25:00 ●     │ │
│  • Dashboard ←active   │  │   (large)   │  │  Circular    │ │
│  • Ask AI              │  │             │  │  timer       │ │
│                        │  │   [input]   │  ├──────────────┤ │
│  (spacer)              │  │   [send]    │  │     Quiz     │ │
│                        │  │             │  │  0 cards     │ │
│  ┌──────────────────┐  │  ├─────────────┤  └──────────────┘ │
│  │  Upgrade to Pro  │  │  │ Call Tutor  │  ┌──────────────┐ │
│  │  (purple card)   │  │  │  🎙 Speak   │  │    Exams     │ │
│  └──────────────────┘  │  │  to learn   │  │  Final sprint│ │
│                        │  │  [Session]  │  │  68% / 2/3   │ │
│  Avatar | Name | Email │  └─────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Tablet (768–1023px)
- 2-column grid
- Ask AI full width at top
- Focus + Quiz side by side below
- Call Tutor + Exams side by side at bottom
- Sidebar collapses to hamburger menu

### Mobile (<768px)
- 1-column stacked
- All cards full width
- Sidebar hidden (accessible via hamburger drawer)

---

## 6. Bento Grid Implementation (StudyModeCards.jsx)

```
CSS Grid: grid-cols-3 gap-6 (desktop)

Ask AI:     col-start-1 col-end-3 row-start-1 row-end-3  (spans 2 cols, 2 rows)
Focus Mode: col-start-3 col-end-4 row-start-1 row-end-2  (1 col, 1 row)
Quiz:       col-start-3 col-end-4 row-start-2 row-end-3  (1 col, 1 row)
Call Tutor: col-start-1 col-end-2 row-start-3 row-end-4  (1 col, 1 row)
Exams:      col-start-2 col-end-4 row-start-3 row-end-4  (2 cols, 1 row)
```

---

## 7. Design System

### Card Base
```css
border-radius: 1rem (rounded-2xl)
background: linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))
backdrop-filter: blur(24px)
border: 1px solid rgba(255,255,255,0.1)
box-shadow: 0 8px 30px rgba(0,0,0,0.3)
transition: all 300ms ease
```

### Card Hover
```css
transform: scale(1.04) translateY(-4px)
border-color: rgba(255,255,255,0.2)
box-shadow: 0 0 40px rgba(99,102,241,0.25)
```

### Framer Motion Entry
```js
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4, delay: index * 0.08 }}
```

### Color Palette (from existing globals.css)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-brand` | `#7c3aed` | Active nav, Ask AI, primary actions |
| Green `#22c55e` | — | Call Tutor accent |
| Red `#ef4444` | — | Exams deadline, Final Sprint badge |
| Blue `#3b82f6` | — | Focus Mode accent |
| `--surface-card` | `#0f172a` | Card base |
| `--text-primary` | `#f1f5f9` | Headings |
| `--text-secondary` | `#94a3b8` | Subtitles, labels |

---

## 8. Component Specifications

### 8.1 Sidebar (DashboardSidebar.jsx)
- **Logo:** Text "AskMyNotes" with purple A icon (top-left)
- **Nav items:** Only "Dashboard" (house icon) and "Ask AI" (sparkle icon)
- **Active state:** Purple background pill + left border glow
- **Bottom:** "Upgrade to Pro" card → navigates to `/pricing`
- **User section:** Dynamic from `user` in `DashboardContext`
  - `user.user_metadata?.full_name` or `user.email` prefix as name
  - `user.email` as email
  - Initials-based avatar if no `avatar_url` (2-letter circle, purple bg)

### 8.2 Ask AI Card (AskAIHeroCard.jsx)
- **Header:** "Ask AI" + "Your AI study assistant" subtitle
- **Background:** Deep purple gradient with sparkle decorations
- **Center text:** "Ask anything. Get instant answers."
- **Input:** Controlled input at card bottom, clicking card focuses it
- **Send button:** Purple circle with up-arrow icon
- **On submit:** POST `/api/ask-ai` with `{ query, context }` from context
- **On enter:** Also submits
- **Focus glow:** Input border glows purple on focus

### 8.3 Focus Mode Card (FocusModeSection.jsx)
- **Header:** "Focus Mode" + "Pomodoro 25m" subtitle
- **Timer display:** `MM:SS` in large bold text centered in circle
- **Circular progress:** SVG ring, cyan/blue stroke, animates as timer counts down
- **Default:** 25:00
- **On click card:** Navigate to `/focus`
- **State:** Read from `FocusSessionContext` (isRunning, timeLeft)
- **Pulsing ring:** When timer is running, ring pulses gently

### 8.4 Quiz Card (QuizSection.jsx)
- **Header:** "Quiz" title + stack-of-cards icon (purple)
- **Count:** Large number + "cards ready" label
- **Count animation:** Animates from 0 → actual count on mount (countUp)
- **Data source:** `GET /api/quiz/count` or from `DashboardContext`
- **On click:** Navigate to `/quiz`

### 8.5 Call Tutor Card (VoiceCallSection.jsx)
- **Header:** "Call Tutor" + "Speak to learn" subtitle
- **Badge:** "Beta" pill (green)
- **Mic icon:** Large microphone, breathing animation (scale 1 → 1.05 → 1, loop)
- **CTA:** "Start a session →" button at bottom
- **On click button:** Navigate to `/call-tutor`
- **On click card:** Same as button click

### 8.6 Exams Card (ExamsHeroCard.jsx)
- **Header:** "Exams" + "Track upcoming exams..." subtitle
- **Badge:** "Final sprint! 🔥" shown if `daysLeft <= 2`
- **Exam row:** Exam subject name (left) + days left count (right, red if ≤ 2)
- **Stats row:** 3 columns — syllabus %, subjects done (e.g. 2/3), mock tests count
- **Background:** Dark red/dark gradient when Final Sprint mode
- **Data source:** `GET /api/exam` → compute `daysLeft = differenceInDays(examDate, today)`
- **On click:** Navigate to `/exams`

---

## 9. Interaction Details

| Interaction | Behavior |
|-------------|----------|
| Ask AI input click | `e.stopPropagation()`, focus input, show purple glow |
| Ask AI send | Submit query, clear input, optional loading spinner on button |
| Focus Mode click | `useRouter().push('/focus')` |
| Quiz click | `useRouter().push('/quiz')` |
| Call Tutor button click | `e.stopPropagation()`, `useRouter().push('/call-tutor')` |
| Exams click | `useRouter().push('/exams')` |
| Sidebar nav click | Route to respective page |
| Upgrade to Pro | `useRouter().push('/pricing')` |

---

## 10. Animations (Framer Motion)

| Element | Animation | Config |
|---------|-----------|--------|
| All cards mount | Fade + slide up | `initial={opacity:0, y:20}`, staggered by `index * 0.08s` |
| All cards hover | Scale + lift | `whileHover={{ scale: 1.04, y: -4 }}` |
| All cards tap | Slight shrink | `whileTap={{ scale: 0.97 }}` |
| Quiz count | Count up | Custom `useTweenedNumber` hook (already exists) |
| Mic icon | Breathing | `animate={{ scale: [1, 1.06, 1] }}`, `repeat: Infinity`, 2s duration |
| Focus ring | Pulse when running | `animate={{ opacity: [0.7, 1, 0.7] }}`, `repeat: Infinity` |
| Final Sprint badge | Shake on mount | `animate={{ x: [-2, 2, -2, 0] }}`, once on mount |
| Sidebar nav active | Smooth pill slide | CSS transition on background-color |

---

## 11. Responsiveness

```
Desktop  (≥1024px): grid-cols-3, sidebar fixed 240px
Tablet   (768-1023px): grid-cols-2, sidebar hamburger
Mobile   (<768px):  grid-cols-1, sidebar drawer
```

All existing responsive/hamburger logic in `DashboardSidebar.jsx` is preserved.

---

## 12. API Mapping (All Existing)

| Card | API | Method | Used For |
|------|-----|--------|----------|
| Ask AI | `/api/ask-ai` | POST | Submit query |
| Focus Mode | `/api/focus-progress` | GET | Load session state |
| Quiz | `/api/quiz/count` OR context | GET | Card count display |
| Call Tutor | `/api/voice/start` | POST | Start voice session |
| Exams | `/api/exam` | GET | Load exam data |

---

## 13. Definition of Done

- [ ] Dashboard Study view matches target image pixel-for-pixel on desktop
- [ ] Sidebar shows only 2 nav items + dynamic user info
- [ ] All 5 cards are interactive and navigate to correct routes
- [ ] Ask AI submits to existing API
- [ ] Exams shows real data + Final Sprint badge when daysLeft ≤ 2
- [ ] Focus timer reads from FocusSessionContext
- [ ] Quiz count animates on mount
- [ ] Call Tutor mic has breathing animation
- [ ] Framer Motion entry animations staggered
- [ ] Hover/tap states on all cards
- [ ] Responsive on tablet and mobile
- [ ] No broken existing flows
- [ ] No TypeScript introduced
- [ ] No new API routes created
