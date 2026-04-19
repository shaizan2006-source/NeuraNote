# Ask My Notes Phase 0.5+ Page Design Specification

**Date:** 2026-04-19  
**Phase:** 0.5+  
**Scope:** Three premium standalone study pages (Focus Mode, Quiz, AI Coach) for JEE/NEET students  
**Design Principle:** Minimal, non-overwhelming, top-notch UI/UX that builds repetitive user behavior

---

## 1. Design System Foundation

### Color Palette
- **Background:** Gradients from `#060910` to `#0c1024` (dark, cool-toned)
- **Primary Accent:** Purple (`#7c3aed`, `#6d28d9` for gradients)
- **Secondary Accent:** Cyan (`#22D3EE`)
- **Text Primary:** `#f1f5f9` (light slate, full contrast)
- **Text Secondary:** `#334155` (muted gray for hints/labels)
- **Text Disabled:** `#1e293b` (very dark for placeholders)
- **Live Status:** Green `#22c55e` with glow

### Typography
- **Font Family:** Inter (400/500/600/700/800 weights)
- **Headings:** 700 weight, size 18px for page titles
- **Labels:** 600 weight, size 11-12px
- **Body:** 400 weight, size 13-15px for content
- **Captions:** 500 weight, size 10-11px for hints

### Interactive Elements
- **Buttons:** Gradient purple-to-indigo, 12px border-radius, 4px shadow
- **Cards:** 1px border `rgba(255,255,255,0.06)`, rounded 14px, hover effect with border lightening
- **Active States:** Background `rgba(139,92,246,0.1)`, border `rgba(139,92,246,0.3)`
- **Dividers:** 1px `rgba(255,255,255,0.05)` with optional centered text label
- **Glow Effects:** Radial gradient centered on page, subtle cyan/purple radiance, very low opacity (0.07-0.12)

### Spacing & Layout
- **Page Padding:** 28px (mobile-first, responsive)
- **Gap Between Cards:** 8-12px
- **Gap Between Sections:** 18-22px
- **Border Radius Standard:** 14px (interactive), 20px (screen wrappers)

### Animations
- Framework: Framer Motion
- **Card Flip:** Spring physics, 0.4s duration for study cards
- **Transitions:** 0.15s for interactive states, 0.25s for modal-like transitions
- **Entrance:** Subtle fade + slight scale-up on component mount
- **Micro-interactions:** Button press = slight scale (0.98) + color shift

---

## 2. Focus Mode Page

### Purpose
Users time a focused work session on a specific task, with AI tips and progress tracking.

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ ← Dashboard     Focus Session     ⚫ Aria · ready        │  ← Top bar
├─────────────────────────────────────────────────────────┤
│                                                           │
│  LEFT SIDE (Timer Ring)        RIGHT SIDE (Task List)   │
│  ┌──────────────────┐          ┌──────────────────────┐ │
│  │   [Timer Ring]   │          │  Progress: 1/3 done  │ │
│  │     18:45 ⏸ ⏹   │          ├──────────────────────┤ │
│  ├──────────────────┤          │ CURRENT (Active)     │ │
│  │💡 AI Tip:       │          │ ☐ Review Carnot...  │ │
│  │"Focus on the    │          │   ✓ Mark Done       │ │
│  │ big picture     │          ├──────────────────────┤ │
│  │ first, details  │          │ DONE                 │ │
│  │ come later"     │          │ ✔ Read Ch.3 Thermo  │ │
│  │                 │          ├──────────────────────┤ │
│  │                 │          │ PENDING              │ │
│  │                 │          │ ☐ Problem Set 1      │ │
│  │                 │          │ ☐ Watch video       │ │
│  │                 │          │                      │ │
│  └──────────────────┘          └──────────────────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Components

#### Top Bar
- **Left:** Back arrow + "← Dashboard"
- **Center:** "Focus Session" or topic name
- **Right:** Live indicator dot + "Aria · ready"

#### Left Panel: Timer Ring
- **Ring Animation:** SVG or CSS-based circular progress (18:45 / 25:00)
- **Center:** Large time display (18:45)
- **Buttons:** 
  - ⏸ Pause (pauses session, shows resume state)
  - ⏹ Stop (ends session, shows confirm dialog)
- **AI Tip Section:**
  - Small card below ring
  - Icon + one-line insight from coach
  - Rotates every 2-3 minutes
  - Non-intrusive, glanceable

#### Right Panel: Task List
- **Header:** "Progress: X/3 done" with light progress bar
- **Section 1: CURRENT** (border highlight, background tint)
  - Task name with checkbox
  - "✓ Mark Done" button (styled, prominent)
- **Section 2: DONE** (grayed)
  - Strikethrough task names
  - Checkmark icons
- **Section 3: PENDING**
  - Task names
  - Unselectable but visible
  - Helps users stay oriented

### State Transitions
- **Session Start:** User navigates from dashboard or coach → Focus Mode loads with timer at 25:00
- **Task Toggle:** User clicks "Mark Done" → Section updates immediately (current → done, next task becomes current)
- **Pause:** Timer freezes, button toggles to "Resume"
- **Stop:** Dialog confirm "End session? You'll lose timer progress" → Return to dashboard or coach

### AI Integration
- **Session Context:** AI knows which task + duration → generates contextual tips
- **Tip Rotation:** Every 2-3 minutes, fetch next tip from coach via `/api/ai/focus-tip` endpoint
- **Tip Content:** Motivational, technique-based, or learning-path aligned
- **No Interruption:** Tips are sidebar only, never interrupt timer/task flow

### Data Flow
```
User starts session (task_id, duration=25m)
  ↓
Focus Mode loads (timer, tasks list, initial AI tip)
  ↓
Timer ticks (every 1s, update ring animation)
  ↓
User marks task done OR pauses/stops
  ↓
Log session_event (task_id, time_focused, status)
  ↓
Return to dashboard with session summary
```

---

## 3. Quiz Page

### Purpose
Students answer long-form exam-style questions (5M/10M/20M) with AI structure hints and answer evaluation.

### Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ ← Back   Question 3/12   ⏱ 12:34                        │  ← Top bar
├──────────────────────────────────────────────────────────┤
│ Progress: ████░░░░░░ 25% answered                        │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  LEFT SIDE (Q + Answer)     RIGHT SIDE (Hints + Source)  │
│  ┌───────────────────────┐  ┌──────────────────────────┐ │
│  │ ▲ Question (10M)      │  │ 📚 From your notes:      │ │
│  │ "Explain the Carnot   │  │ ┌────────────────────┐   │ │
│  │ Cycle and why no      │  │ │ "The Carnot Cycle  │   │ │
│  │ real engine can be    │  │ │ is the most eff... │   │ │
│  │ 100% efficient."      │  │ │ — Ch.3, p.42       │   │ │
│  │                       │  │ └────────────────────┘   │ │
│  │ [Text answer area]    │  │                          │ │
│  │ ┌──────────────────┐  │  │ 💡 Answer Structure:    │ │
│  │ │ Type answer...   │  │  │ • Define Carnot Cycle  │ │
│  │ │                  │  │  │   (3M)                 │ │
│  │ │                  │  │  │ • Explain why max eff  │ │
│  │ │                  │  │  │   (4M)                 │ │
│  │ │                  │  │  │ • Compare to real eng  │ │
│  │ └──────────────────┘  │  │   (3M)                 │ │
│  │                       │  │                          │ │
│  │ [Previous] [Skip] [Save] │ 🤖 AI Coach:           │ │
│  │                       │  │ "Take your time with   │ │
│  │                       │  │ the efficiency part—   │ │
│  │                       │  │ that's where most      │ │
│  │                       │  │ students miss marks."  │ │
│  │                       │  │                          │ │
│  └───────────────────────┘  └──────────────────────────┘ │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Components

#### Top Bar
- **Left:** Back arrow
- **Center:** "Question N/Total"
- **Right:** Timer (updates every 1s)

#### Progress Bar
- **Visual:** Filled portion = % of questions answered (marked as "saved")
- **Label:** "25% answered" (count below bar)

#### Left Panel: Question & Answer
- **Question Card:**
  - Upward arrow icon (indicates expandable/collapsed state for long questions)
  - Question text (bold, large type, clear)
  - Mark badge (5M/10M/20M in purple tag)
  - Question number/navigation hint: "Question 3/12"
  
- **Text Answer Area:**
  - Large textarea with placeholder "Type your answer..."
  - Min height 120px, grows as user types
  - Character count indicator (optional, subtle)
  - Light border, focus highlight
  
- **Button Row:**
  - "← Previous" (if not first question)
  - "Skip" (moves to next, doesn't save)
  - "Save" (primary button, saves draft and marks as "answered", moves to next)

#### Right Panel: Source + Hints + Coach Tip
- **Source Snippet Section:**
  - Icon + "📚 From your notes:"
  - Card with excerpt from student's uploaded document
  - Gray text, small font, source attribution (e.g., "Ch.3, p.42")
  - Max height 100px with scroll if needed
  
- **Answer Structure Hints Section:**
  - Icon + "💡 Answer Structure:"
  - Bulleted list showing mark breakdown
  - Format: "• [Key point] (XM)"
  - Generated dynamically based on question marks
  - Example for 10M: 3 points × 3-4M each
  
- **AI Coach Tip:**
  - Icon + "🤖 AI Coach:"
  - One-sentence tip (e.g., "Don't skip the efficiency calculation—that's 4 of 10 marks")
  - Non-judgmental, encouraging tone

### Question Generation & Structure Hints

**Generation Workflow:**
1. User enters quiz mode for a concept/topic
2. System calls `/api/ai/generate-questions` with (topic_id, mark_weights=[5,10,20], num_questions=12)
3. LLM generates questions with marks and structure hints in JSON
4. Questions cached in `study_sessions` table for session replay

**Structure Hints Algorithm:**
- **For 5M:** 1-2 key points (2-3M each)
- **For 10M:** 3 points (3-4M each, 1-2M for intro)
- **For 20M:** 5-6 points (3-4M each), structured hierarchically (intro, main concept, examples, applications, conclusion)
- Hints are NOT spoilers—they show *shape* not *content*

**Source Snippet Extraction:**
- Question generated from concept in knowledge graph
- Query `documents` table for notes related to concept
- Extract 100-150 char excerpt from highest-relevance section
- Include source reference (doc name, page/section)

### Answer Evaluation

**Workflow:**
1. User submits answer (clicks "Save")
2. UI shows: "AI reviewing..." for 2-3 seconds
3. Calls `/api/ai/evaluate-answer` with (question, student_answer, structure_hints)
4. LLM returns JSON: `{ marks_earned, marks_total, feedback, key_misses }`
5. Show result card: "7/10 marks" + feedback + next question auto-loads

**Evaluation Criteria (LLM Prompt):**
- Compare student answer against structure hints
- Award marks for each key point addressed
- Deduct for gaps, incomplete reasoning, or misunderstandings
- Provide constructive feedback (2-3 sentences max)

### Data Flow
```
User starts quiz session (topic_id, question_count=12)
  ↓
Questions generated & cached (via /api/ai/generate-questions)
  ↓
Load Question 1 + source snippet + structure hints + coach tip
  ↓
User types answer, clicks "Save"
  ↓
Answer evaluated (via /api/ai/evaluate-answer)
  ↓
Show marks + feedback, auto-advance to next question
  ↓
Repeat until all questions answered
  ↓
Show summary: "8/12 questions, 73/100 marks, areas to improve: ..."
```

---

## 4. AI Coach Page

### Purpose
Students receive proactive learning recommendations and can choose their own study path. Coach guides them through three session modes or lets them pick any topic.

### State Machine Overview

```
State 1: Welcome
  ├─ User clicks 🧠 Explain → Start session
  ├─ User clicks ⚡ Quiz → Start session
  ├─ User clicks 🎯 Exam Prep → Start session
  └─ User clicks ✏️ Study Something Else → State 2 (Topic Picker)

State 2: Topic Picker (only if dashed card clicked)
  ├─ User searches topic → Results appear
  ├─ User clicks topic card → State 3 (Mode Selector)
  └─ User clicks "Browse All" → Full topic list modal

State 3: Mode Selector (for chosen topic)
  ├─ User clicks 🧠 Explain → Start session
  ├─ User clicks ⚡ Quiz → Start session
  └─ User clicks 🎯 Exam Prep → Start session
```

### State 1: Welcome

#### Layout Structure
```
┌──────────────────────────────────────────────┐
│ ← Dashboard         ⚫ Aria · ready           │  ← Top bar
├──────────────────────────────────────────────┤
│                                               │
│        ✦ (Avatar)                           │
│                                               │
│    Good morning, Shafi ☀                     │
│    You're **close on Mechanics** —            │
│    but **Thermodynamics** needs work.        │
│                                               │
│    How do you want to study?                 │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │ 🧠 Explain it to me                    │  │
│  │ Coach walks you through step by step   │  │ ← Active state
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │ ⚡ Quiz me                              │  │
│  │ Socratic questions on your weak topics │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │ 🎯 Exam prep                           │  │
│  │ Practice exam-style questions          │  │
│  └────────────────────────────────────────┘  │
│                                               │
│    ─────────────── or study your own ──────  │
│                                               │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│  │ ✏️ I want to study something else      │  │
│  │ Pick a topic or document from notes    │  │ ← Dashed card
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │
│                                               │
│         [Start Session →]                     │
│                                               │
└──────────────────────────────────────────────┘
```

#### Components

**Top Bar:**
- Left: "← Dashboard"
- Right: Live dot + "Aria · ready"

**Avatar:**
- 60px circle, gradient purple-to-cyan
- Center icon: ✦
- Glow shadow

**Greeting Section:**
- Small label: "Good morning, Shafi ☀"
- Large message (18px, bold):
  - Dynamic content from coach context (e.g., mastery scores)
  - Key terms highlighted in purple/gold
  - One warm observation + one recommendation
  - Example: "You're **close on Mechanics** — but **Thermodynamics** needs work."

**Question Label:**
- "How do you want to study?" (small, gray, centered)

**Mode Cards (Solid):**
- Three cards: 🧠 Explain / ⚡ Quiz / 🎯 Exam Prep
- First card active by default
- Layout: Icon left (34px, sized), text right (h4 + p)
- Padding: 14px 16px
- On click: Set active state (visual feedback)

**Divider:**
- Text: "or study your own topic"
- Lines on left/right with text centered

**Free Choice Card (Dashed):**
- **Visually distinct:** 1px dashed border `rgba(255,255,255,0.1)`
- Background: `rgba(255,255,255,0.015)` (very subtle)
- Icon: ✏️
- Text: "I want to study something else" + "Pick a topic or document from notes"
- On click: → State 2 (Topic Picker)

**CTA Button:**
- "Start Session →"
- Primary gradient, full width
- Only enabled if a mode is selected OR dashed card is selected
- If dashed card selected, button text changes to "Pick a topic →"

### State 2: Topic Picker

#### Layout Structure
```
┌──────────────────────────────────────────────┐
│ ← Back              ⚫ Aria · ready           │
├──────────────────────────────────────────────┤
│                                               │
│        ✦ (Avatar)                           │
│                                               │
│    What's on your mind today?                │
│    Pick a topic from your documents,         │
│    or search for something specific.         │
│                                               │
│  ┌──────────────────────────────────────┐   │
│  │ 🔍 Search topics...                  │   │ ← Search bar
│  └──────────────────────────────────────┘   │
│                                               │
│  ┌────────────┬────────────┐                │
│  │   📄      │   📄      │                │
│  │ Mechanics │Thermodynam│                │
│  └────────────┴────────────┘                │
│                                               │
│  ┌────────────┬────────────┐                │
│  │   📄      │   📄      │                │
│  │  Optics   │  Waves    │                │
│  └────────────┴────────────┘                │
│                                               │
│  ┌────────────┬────────────┐                │
│  │   📄      │   ➕      │                │
│  │ Modern...  │ Browse All │                │
│  └────────────┴────────────┘                │
│                                               │
└──────────────────────────────────────────────┘
```

#### Components

**Top Bar:**
- Left: "← Back" (returns to State 1)
- Right: Live dot

**Greeting Section:**
- Label: "What's on your mind today?"
- Message: "Pick a topic from your documents, or search for something specific."

**Search Bar:**
- Icon: 🔍
- Placeholder: "Search topics..."
- On input: Filter topic grid in real-time

**Topic Grid:**
- 2-column layout (gap 6px)
- Each card: 📄 icon + topic name (centered)
- Padding: 12px 10px
- Border: 1px solid `rgba(255,255,255,0.06)`
- Hover: Border lightens, background tints purple
- Click: Navigate to State 3 with selected topic

**Browse All Card:**
- Icon: ➕
- Text: "Browse All"
- Click: Opens modal/page with full topic + document list

### State 3: Mode Selector

#### Layout Structure
```
┌──────────────────────────────────────────────┐
│ ← Back              ⚫ Aria · ready           │
├──────────────────────────────────────────────┤
│                                               │
│        ✦ (Avatar)                           │
│                                               │
│    Starting: Thermodynamics                  │
│    How would you like me to help you        │
│    with this?                                │
│                                               │
│    Pick a study style:                       │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │ 🧠 Explain it                          │  │
│  │ Coach walks you through               │  │ ← Active
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │ ⚡ Quiz me                              │  │
│  │ Test your understanding                │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │ 🎯 Exam prep                           │  │
│  │ Practice exam questions                │  │
│  └────────────────────────────────────────┘  │
│                                               │
│         [Start Session →]                     │
│                                               │
└──────────────────────────────────────────────┘
```

#### Components

**Top Bar:**
- Left: "← Back" (returns to State 2)
- Right: Live dot

**Greeting Section:**
- Label: "Starting: [Topic Name]"
- Message: "How would you like me to help you with this?"

**Question Label:**
- "Pick a study style:"

**Mode Cards (Solid):**
- Same three cards as State 1
- First card active by default
- Click to select mode

**CTA Button:**
- "Start Session →"
- Primary gradient, full width
- Navigates to appropriate session (coach/quiz/exam based on selection)

### AI Integration Points

**State 1 (Welcome) - Proactive Recommendation:**
- User loads coach page
- System queries `/api/ai/coach-status` with user_id
- LLM returns:
  - Strength areas (close to mastery)
  - Weak areas (need work)
  - Recommended session type (explain/quiz/exam)
- Coach greeting dynamically populated with these insights

**State 2 (Topic Picker) - Topic Discovery:**
- Search bar calls `/api/ai/search-topics` with query
- Returns matching documents + concepts
- Alternative: Browse All modal shows all uploaded docs + recently studied topics

**State 3 (Mode Selector) - Topic Context:**
- Greeting updates with selected topic name
- Could fetch topic difficulty/importance for secondary hints
- Mode selection prepared for downstream session type

**Session Start:**
- Depending on mode:
  - **Explain:** Load chat interface, LLM generates opening question (Socratic)
  - **Quiz:** Load Quiz page (see Section 3)
  - **Exam Prep:** Load Quiz page with past-paper styled questions

### Data Flow
```
User navigates to Coach
  ↓
Fetch coach status (recommendations, strengths, weaknesses)
  ↓
Render State 1 with personalized greeting
  ↓
User clicks mode card OR dashed "study something else" card
  ├─ If mode card: Start session with recommended topic
  └─ If dashed card: → State 2 (Topic Picker)
  ↓
State 2: User searches/picks topic
  ↓
→ State 3 (Mode Selector) with topic context
  ↓
User selects mode
  ↓
Start session (mode-specific UI loads)
```

---

## 5. Component Library (Shared)

### Card Component
```jsx
Props:
  - icon: ReactNode
  - title: string
  - subtitle: string
  - active: boolean
  - onClick: () => void
  - dashed: boolean (for free choice)

Styles:
  - Base: 14px border-radius, 1px border, flex row, gap 14px
  - Active: purple tint background + lighter border
  - Dashed: dashed border, very subtle background
```

### Button Component
```jsx
Props:
  - label: string
  - onClick: () => void
  - variant: 'primary' | 'secondary' | 'ghost'
  - disabled: boolean
  - full-width: boolean

Styles:
  - Primary: gradient purple-indigo, shadow, hover scale
  - Secondary: subtle border + text only
  - Ghost: transparent, hover underline
```

### Progress Bar Component
```jsx
Props:
  - current: number
  - total: number
  - label: string (optional)

Styles:
  - Background: rgba(255,255,255,0.04)
  - Fill: purple gradient
  - Height: 4px
  - Animated width transition
```

### Text Area Component
```jsx
Props:
  - placeholder: string
  - value: string
  - onChange: (value) => void
  - readonly: boolean

Styles:
  - Border: subtle, focus highlight purple
  - Background: very dark
  - Font: body size, line-height 1.7
  - Auto-expand height as content grows
```

---

## 6. Responsive Behavior

- **Mobile (< 768px):** Stack panels vertically, reduce padding, adjust font sizes
- **Tablet (768px - 1024px):** Two-column becomes one-column at top/bottom split
- **Desktop (> 1024px):** Full two-column layouts as designed
- **Dark Mode Only:** No light mode variant required for Phase 0.5

---

## 7. Animations & Transitions

- **Page Load:** Fade + subtle scale-up on components (100-150ms stagger)
- **Card Interaction:** Border color transition (150ms), background shift (200ms)
- **Button Press:** Scale 0.98 (50ms), return to 1 on release
- **Modal Transitions:** Slide from bottom + fade (250ms)
- **Timer Ring:** SVG animation (smooth stroke-dashoffset update every 100ms)
- **Text Area Expansion:** Height animated on focus/content change (200ms)
- **Progress Bar:** Width animated on update (300ms spring)

---

## 8. Success Criteria

✅ **Minimal & Non-Overwhelming:**
- Each page has ONE primary decision or action
- No competing UI elements (no sidebar, no stats, no charts)
- Coach speaks first, then user chooses

✅ **Premium Feel:**
- Consistent color palette and typography
- Smooth animations and micro-interactions
- Thoughtful spacing and breathing room
- High-contrast text for readability

✅ **Student Engagement:**
- Design encourages repetitive use
- Clear progress indicators (timer, marks, task list)
- Positive, warm voice in coach messages
- Student autonomy (free choice option)

✅ **AI Integration Points Identified:**
- Coach recommendations (proactive)
- Question generation + structure hints (quiz)
- Answer evaluation (quiz)
- Topic search + discovery (topic picker)
- Session-specific coaching tips (all modes)

---

## 9. File Organization

```
src/
  app/
    focus/
      page.jsx              ← Focus Mode page
    quiz/
      page.jsx              ← Quiz page
    coach/
      page.jsx              ← Coach page (handles all three states)
    api/
      ai/
        coach-status.js     ← GET /api/ai/coach-status
        search-topics.js    ← GET /api/ai/search-topics
        generate-questions.js ← POST /api/ai/generate-questions
        evaluate-answer.js  ← POST /api/ai/evaluate-answer
        focus-tip.js        ← GET /api/ai/focus-tip
  components/
    Card.jsx                ← Reusable card component
    Button.jsx              ← Reusable button component
    ProgressBar.jsx         ← Reusable progress bar
    TextArea.jsx            ← Reusable textarea
    Avatar.jsx              ← Coach avatar (shared)
```

---

## 10. Known Constraints & Future Work

- **Phase 0.5:** Focus Mode timer only tracks local state (no backend persistence yet)
- **Phase 0.5:** Quiz questions generated dynamically per session (not yet cached in DB)
- **Phase 0.5:** Answer evaluation via LLM (cost/latency TBD—consider caching for repeated attempts)
- **Future:** Add spaced repetition scheduling for quiz questions based on evaluation results
- **Future:** Implement actual chat session for "Explain" mode (currently mock interface)
- **Future:** Add real-time collaboration if multiple students study same topic

---

**Design Approval:** Pending user review.
