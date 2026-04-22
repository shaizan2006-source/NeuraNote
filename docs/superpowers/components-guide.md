# Shared Component Guide

## Design System — `src/lib/styles.js`
Import: `import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/styles';`

| Export | Keys |
|--------|------|
| COLORS | bg.dark, bg.card, bg.accentLight, text.primary, text.secondary, text.accent, accent.purple, accent.cyan, accent.green, border.light, border.accent |
| TYPOGRAPHY | fontFamily, weights.{regular,medium,semibold,bold}, sizes.{heading,subheading,body,label,caption,small} |
| SPACING | xs=4px sm=8px md=12px lg=16px xl=20px xxl=28px |
| RADIUS | sm=10px md=14px lg=20px |
| SHADOWS | button, card, glow |

## Button — `src/components/shared/Button.jsx`
```jsx
<Button
  label="Click me"
  variant="primary" // | "secondary" | "ghost"
  onClick={() => {}}
  disabled={false}
  fullWidth={false}
  style={{}} // override styles
/>
```
- primary: purple gradient + shadow
- secondary: transparent + accent border
- ghost: transparent, no border

## Card — `src/components/shared/Card.jsx`
```jsx
<Card
  icon="🧠"
  title="Title text"
  subtitle="Subtitle text"
  active={false}      // purple tint when true
  dashed={false}      // dashed border when true (free-choice card)
  onClick={() => {}}  // enables hover + press effects
  style={{}}
/>
// OR with children:
<Card icon="📄" onClick={...}>{custom content}</Card>
```

## ProgressBar — `src/components/shared/ProgressBar.jsx`
```jsx
<ProgressBar current={3} total={10} label="Progress" />
```
- Renders purple→cyan gradient fill
- label shown above bar (optional)

## Avatar — `src/components/shared/Avatar.jsx`
```jsx
<Avatar size="lg" icon="✦" />
// size: "sm"(40) | "md"(56) | "lg"(60) | "xl"(80)
```

## TopBar — `src/components/shared/TopBar.jsx`
```jsx
<TopBar
  title="Page Title"
  subtitle="Optional"
  showLiveStatus={true}   // green dot + "Aria · ready"
  onBack={() => {}}       // defaults to router.back()
/>
```

## TimerRing — `src/components/shared/TimerRing.jsx`
```jsx
<TimerRing
  timeLeft={900}      // seconds remaining
  duration={1500}     // total session seconds
  paused={false}
  size={220}          // canvas size in px
/>
```
HiDPI-aware canvas. Progress arc shown as percentage of (duration - timeLeft)/duration.

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/coach` | `src/app/coach/page.jsx` | AI Coach (3 states: Welcome → Topic Picker → Mode Selector) |
| `/quiz` | `src/app/quiz/page.jsx` | Exam-style quiz with AI evaluation. Query: `?topic=<id>` |
| `/focus` | `src/app/focus/page.jsx` | 25-min focus timer with task list |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ai/coach-status` | GET | Returns `{ strong, needsWork, recommendedMode }` |
| `/api/ai/search-topics` | GET | Returns `{ topics[] }`. Query: `?query=<text>` |
| `/api/ai/generate-questions` | POST | Body: `{ topicId, count, marks[] }` → `{ questions[] }` |
| `/api/ai/evaluate-answer` | POST | Body: `{ question, answer, hints, totalMarks }` → `{ marksEarned, feedback, keyMisses }` |
| `/api/ai/focus-tip` | GET | Returns `{ tip, nextIndex }`. Query: `?index=N` |
