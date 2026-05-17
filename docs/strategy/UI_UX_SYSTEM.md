# UI / UX System
*Screen-by-screen visual and interaction spec for Ask-My-Notes*
*Consolidates: UI/UX reinvention + Elite Dashboard Design*
*For: Solo founder execution — 90-day window*
*Date: May 2026*

---

## 0. How to use this document

This is the visual + interaction spec. Open before designing or modifying any screen. The structure of each section:

- **Purpose** — what the screen exists to do
- **Information architecture** — what it shows, in what order
- **States** — empty, loading, populated, error, edge cases
- **Visual treatment** — typography, color, density, motion
- **Mode A / Mode B variations** — when the same screen serves different identity states
- **Implementation notes** — components, libraries, Tailwind patterns where useful

The premise: **the product is technically good, but its visual identity is generic.** This document fixes that without requiring a designer hire.

---

## 1. The visual design system

### Design principles (these survive every screen)

**1. Calm over loud.** No more than 1 attention-grabbing element per screen. Most pages should feel quiet. Big celebration is reserved for genuine milestones.

**2. Specificity over abstraction.** Show real numbers, real names, real concept titles. Never "great job!" — always "Mastered Newton's 2nd Law."

**3. Density when the user wants it, breath when they need it.** Brain Map = high density. Empty dashboard = high breath. Don't choose one paradigm globally.

**4. The Indian student aesthetic.** Not Silicon Valley minimal. Not Doubtnut cluttered. Somewhere between: clean, with vocabulary and visual references that signal "made for you specifically."

**5. Motion as feedback, not decoration.** Animation exists to acknowledge state change. Never to fill silence. Never to celebrate a thing that doesn't merit celebration.

### Color system

Replace generic purple/indigo with a more identity-laden palette:

```
Primary — Deep Indigo: #1E1B4B  (base brand)
Accent — Saffron: #F59E0B       (cultural anchor, used sparingly)
Strong — Emerald: #10B981       (mastery, success)
Soft — Sky: #BAE6FD             (calm surfaces, night mode)
Warning — Amber: #F59E0B
Error — Crimson: #DC2626
Background — Off-white: #FAFAF7  (warmer than pure white)
Background-dark — Deep Slate: #0F172A
Text-primary — Charcoal: #1F2937
Text-secondary — Slate: #64748B
Text-muted — Cool Gray: #9CA3AF
```

Mode A (Serious Aspirant) surfaces lean toward Indigo + Emerald + cool tones.
Mode B (Exhausted Comfort) surfaces lean toward Off-white + Sky + warmer treatments.

### Typography

```
Display (headlines): Inter, font-display, 600-700 weight, tight tracking
Body: Inter, 400-500 weight, comfortable line height (1.6)
Numerals: Inter Tabular Numbers for metrics (for alignment)
Code/data: JetBrains Mono (for any code-adjacent surface)
```

Size scale:
- Hero: 48px / 60px line-height
- Section: 32px / 40px
- Heading: 24px / 32px
- Subheading: 18px / 28px
- Body: 16px / 24px
- Small: 14px / 20px
- Caption: 12px / 16px

Avoid font weights below 400 for body text. Indian-language fluency in future requires fonts that render Devanagari well — Inter falls back to system Devanagari fonts gracefully.

### Spacing system

Tailwind defaults work. Stick to: 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64 (in 4px increments).

The key rule: **more breathing room than feels comfortable initially.** Resist the urge to fill space. White space is part of the calm.

### Component library

Use shadcn/ui as foundation. Customize tokens to match palette above.

Required components (most already exist):
- Button (primary, secondary, ghost, destructive)
- Card (default, elevated, interactive)
- Input, Textarea, Select, Combobox
- Dialog, Drawer, Sheet
- Toast, Banner
- Avatar, Badge
- Skeleton (loading states)
- Tooltip, Popover
- Progress (linear, circular)
- Tabs

New components to build:
- BrainMapNode (specialized canvas node)
- ConceptChip (subject-colored concept tag)
- MasteryRing (circular mastery indicator)
- CohortPresence (live count widget)
- AudioPlayer (for briefings)
- StreakBadge (Consistent Learner display)
- ExamCountdown (cycle-aware countdown)

### Motion guidelines

- Page transitions: 200ms ease-out
- Component reveals: 300ms ease-out
- Brain Map node pulse: 600ms ease-in-out, 1 cycle
- Loading skeleton: 1500ms ease-in-out infinite
- Toast slide-in: 250ms ease-out
- Modal: 200ms scale + opacity

**Never** use bouncy or playful easing for productive surfaces. Reserved for celebrations.

---

## 2. The landing page

### Purpose
Convert JEE/NEET aspirants visiting from organic, paid, or referral. Anchor: "this is for me, this is different."

### Current state assessment
Generic — describes itself as an AI study tool for "Indian competitive exam students." Doesn't immediately signal JEE/NEET focus. Doesn't carry the personality of the product.

### New IA

Above the fold:
1. **Headline:** "Your AI study companion for JEE and NEET."
   (Vertical commitment in 7 words. Not "students" — "your.")
2. **Subhead:** "A tutor that remembers your prep. Knows your syllabus. Stays with you to exam day."
3. **Primary CTA:** "Start with free trial" (7-day Pro trial, no card required)
4. **Visual:** A real Brain Map screenshot (anonymized) showing the depth of the product

Below the fold:
1. **The three pillars in 3 cards:**
   - Memory: "Remembers what you struggled with last month"
   - Specificity: "Knows JEE Main 2027 syllabus. Speaks your exam's language."
   - Care: "Notices when you're tired. Won't ping you at midnight."
2. **The cohort section:**
   - Live cohort counts: "Join 8,234 JEE 2027 aspirants" (real number if available)
   - Anonymous cohort handles shown
3. **The PYQ section (Sprint 3 launch):**
   - "Practice JEE Main PYQs from 2015-2024, tagged by chapter"
   - Search bar that previews PYQ database
4. **What makes it different:**
   - 4 specific differentiators with screenshots:
     - Brain Map of your concepts
     - Daily Audio Briefing
     - Photo Doubt Cam
     - Smart Mock Test Simulator
5. **Honest pricing:**
   - Three columns, no upsell tricks
   - Annual selected by default with clear "save ₹X" labels
   - "7-day Pro trial included on every signup"
6. **Testimonials (Sprint 4+):**
   - Real student quotes from actual users (anonymized handles)
   - Avoid generic praise — include specifics ("Got AIR 4,233 in JEE Main 2026")
7. **Founder note section:**
   - A real photo of the founder
   - A short note: "Why I'm building this"
   - Honesty about being early
8. **FAQ:**
   - "Is this free?" — explanation of Free Explorer + trial
   - "How is this different from ChatGPT?" — honest answer about workflow
   - "Does this work for [exam]?" — JEE Main, JEE Advanced, NEET UG: yes. Other: not yet.
   - "What about my data?" — honest privacy answer

### Visual treatment
- Hero is a single visual + headline
- Cohort section uses ambient motion (active count pulses every 4 seconds)
- Pricing uses tabular numbers for alignment
- Founder note is warm + personal (off-white background, larger photo)

### Anti-patterns to avoid
- Hero video that auto-plays (eats data, students on mobile networks)
- "Trusted by 100,000 students" with stock photos (Indian students see through this immediately)
- Exit-intent popups
- "Limited time offer" pricing language
- Generic "AI-powered" copy (the entire category claims this)

### Implementation note
This page is the highest-leverage marketing surface. Plan ~6 hours in Sprint 1 to rebuild it. Use the existing landing page route. Replace section by section.

---

## 3. The onboarding flow

### Purpose
Get a new user from signup to first Q&A answer in under 3 minutes, with the product feeling personalized from question 1.

### Current state assessment
Multi-screen, captures necessary data, but feels generic. Doesn't signal vertical commitment.

### New IA

5 screens, mobile-first, one question per screen. See `ELITE_FEATURE_ARCHITECTURE.md` F1.5 for full spec.

**Screen 1 — Exam selection**
- "Which exam are you preparing for?"
- Big card options: JEE Main 2027, JEE Main 2026, JEE Advanced 2027, NEET UG 2027, NEET UG 2026, Other

**Screen 2 — Class/year**
- "What year are you in?"
- Options: Class 11, Class 12, Drop year, Other

**Screen 3 — Exam date**
- "When is your exam?"
- Pre-filled from exam selection, editable
- Calendar widget

**Screen 4 — Study window**
- "When do you usually study best?"
- Options: Morning (5-9am), Afternoon (10-2pm), Evening (5-9pm), Late Night (9pm-1am)
- Used for notification scheduling

**Screen 5 — City/region**
- "Where are you?"
- City + region selector
- Used for cohort assignment

After Screen 5:
- Cohort assignment animation (3 seconds)
- "You're in JEE 2027 Bangalore cohort. 8,234 members."
- Transition to empty dashboard

### Visual treatment
- Single-question screens, no scrolling needed
- Large tappable cards (especially on mobile)
- Progress dots at top (1/5, 2/5...)
- "Skip" small text at bottom (except Screen 1, which is required)
- Subtle background gradient — varies subtly per screen for sense of progress

### States
- Resume state: if user abandons mid-flow, return to last completed screen
- Already-onboarded user: skip to dashboard
- "Other" exam selection: collect text input, set expectations honestly

### Motion
- Card selection: 200ms scale-and-color transition
- Screen transition: slide-left 250ms
- Cohort reveal: 3-second animated population (subtle, not flashy)

---

## 4. The empty state dashboard (new user, 0 PDFs)

### Purpose
Convert a brand-new user's blank slate into their first action within 90 seconds.

### Current state assessment
The single worst surface in the product. Empty dashboard with no guidance.

### New IA

```
┌──────────────────────────────────────────────────────┐
│  Welcome, Priya. Let's start.                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ 1.  📄  Upload your first PDF                  │ │
│  │     Your notes, textbook chapters, DPPs        │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ 2.  🧠  Watch your Brain Map appear            │ │
│  │     A live map of every concept you study      │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ 3.  💬  Ask your first question                │ │
│  │     Anything from your PDF, answered           │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Upload PDF — primary CTA]                          │
│  [Try with sample — secondary]                       │
│                                                      │
│  Or — just look around for a minute.                 │
└──────────────────────────────────────────────────────┘
```

### Visual treatment
- Three numbered cards with subtle iconography
- Primary CTA is prominent but not aggressive
- Sample option uses ghost button styling
- Tertiary "look around" text is small, low-emphasis

### States

**During upload:**
- Card 1 transforms to show upload progress
- Cards 2 and 3 stay dim until Card 1 completes

**During processing:**
- Card 1: "Processing your PDF..." with stage indicator
  - Stage: Parsing → Embedding → Extracting concepts (each ~10-20 sec)
  - Tooltip explains each stage in friendly language

**After processing:**
- Card 1: ✓ Done
- Card 2: animates to populated state, Brain Map silhouette appears
- Card 3: chat input becomes interactive

**Empty state if user navigates away and returns:**
- Same screen until they've uploaded something AND asked at least one question

### Anti-patterns to avoid
- Auto-uploading sample PDF (forces choice)
- Modal-style onboarding that takes over the screen
- Animations that exceed 3 seconds per step
- Skippable but-with-friction skip buttons

---

## 5. The populated dashboard (regular daily use)

### Purpose
The home screen for active users. Shows what matters today, surfaces the right tools fast, and adapts to the time of day and the user's state.

### Current state assessment
Currently uses a "Bento Grid" with mood-adaptive layout via DashboardContext (1467 lines). Sophisticated underlying logic. UX feels fine but doesn't lean into what makes the product different.

### New IA

The dashboard rebuilds around 4 distinct modes, calibrated to time of day + activity state. Existing DashboardContext logic can be preserved; what changes is the visual treatment per mode.

#### Mode 1 — Morning Mode (5am-11am, low activity today)

```
┌────────────────────────────────────────────────────┐
│ Good morning, Priya. JEE 2027 — 287 days.          │
├────────────────────────────────────────────────────┤
│                                                    │
│  ▶ Your Briefing       1:23           [Listen]    │
│  "Yesterday you put in 47 min on Mechanics..."     │
│                                                    │
├────────────────────────────────────────────────────┤
│  Today's three                                     │
│  ┌───────────────┐ ┌───────────────┐ ┌──────────┐│
│  │ 1. Review     │ │ 2. Learn      │ │ 3. PYQ   ││
│  │ 12 cards      │ │ Thermo Pt 2   │ │ 1 set    ││
│  │ 8 min         │ │ 45 min        │ │ 15 min   ││
│  └───────────────┘ └───────────────┘ └──────────┘│
│                                                    │
│  You don't have to do all three.                  │
├────────────────────────────────────────────────────┤
│  Your cohort                                       │
│  312 members studying right now in JEE 2027 BLR   │
│  ▲ You're #47 this week                           │
└────────────────────────────────────────────────────┘
```

#### Mode 2 — Active Study Mode (during a session)

Minimal chrome. Just the current task. No distractions.

```
┌────────────────────────────────────────────────────┐
│ Mechanics                              23 min done │
├────────────────────────────────────────────────────┤
│                                                    │
│  [Current Q&A / Quiz / Flashcard interface]       │
│                                                    │
├────────────────────────────────────────────────────┤
│  Brain Map: +3 concepts this session ✓             │
└────────────────────────────────────────────────────┘
```

The trick: most of the screen is the active task. Dashboard recedes to <10% of viewport.

#### Mode 3 — Afternoon Slump Mode (2pm-5pm, inactive today)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Hi, Priya. Mid-afternoon.                         │
│                                                    │
│  Tired? Take 5 minutes. Or just look around —      │
│  no pressure today.                                │
│                                                    │
│  ┌────────────────────────────┐                   │
│  │ Just 5 cards. Nothing else.│                   │
│  │ 2 minutes.                 │                   │
│  └────────────────────────────┘                   │
│                                                    │
│  Or: Today's a rest day [log]                     │
│                                                    │
└────────────────────────────────────────────────────┘
```

Soft palette. No metric flashing. No comparison. The opposite of guilt-inducing.

#### Mode 4 — Night Mode (after 10pm)

```
┌────────────────────────────────────────────────────┐
│  Late night, Priya.                                │
│                                                    │
│  Try to wrap up — sleep is study too.              │
│                                                    │
│  Today: 47 min. 3 concepts strengthened.           │
│                                                    │
│  [Reflect — 30 sec audio close]                    │
│  [Close app and sleep]                             │
│                                                    │
└────────────────────────────────────────────────────┘
```

Muted palette (deep slate background, sky-blue text). No bright surfaces. No countdown timers visible. No exam date prominent.

### Mode selection logic

```javascript
function determineDashboardMode(user, now) {
  const hour = now.getHours();
  const inSession = user.activeSession;
  const studiedToday = user.todaySessionCount > 0;
  const declaredWindow = user.studyWindow;

  if (inSession) return 'active';
  if (hour >= 22 || hour < 5) return 'night';
  if (hour >= 14 && hour < 17 && !studiedToday) return 'slump';
  if (hour >= 5 && hour < 11) return 'morning';
  return 'standard';
}
```

(The existing DashboardContext already has similar logic. Refactor to use these 4 modes.)

### Always-visible elements (regardless of mode)
- Subtle top bar with: app name, profile menu, settings icon
- Bottom nav (mobile) or side rail (desktop) with: Home, Brain Map, Library, Cohort, Profile
- Active push notification preview (if recent)

### Anti-patterns to avoid
- "Daily goal: 4 hours" type goals (let students set their own pace)
- Streak counter that flashes red when at risk
- Multiple competing CTAs
- Unread notification badges in bottom nav (encourages anxiety scrolling)

---

## 6. The Brain Map page

See `ELITE_FEATURE_ARCHITECTURE.md` F1.4 for full spec. UX summary here.

### Page structure

```
┌──────────────────────────────────────────────────────┐
│ Your Brain Map                  [Share] [Filter] [⋮] │
├──────────────────────────────────────────────────────┤
│ Subjects: [All] [Physics] [Chemistry] [Math]         │
│ Mastery: [Show all] [Strong+] [Shaky] [Unknown]      │
├──────────────────────────────────────────────────────┤
│                                                      │
│        ● ─── ●           ●                           │
│        │     │           │                           │
│        ●  ●──●──●     ●  ●                           │
│           │     │     │                              │
│           ●     ●─────●                              │
│                                                      │
├──────────────────────────────────────────────────────┤
│ 247 concepts. 89 strong. 124 shaky. 34 unknown.      │
└──────────────────────────────────────────────────────┘
```

### Node visual treatment
- Size: proportional to importance (PYQ frequency + mastery weight)
- Color: emerald (mastered), indigo (strong), amber (shaky), gray (unknown)
- Hover/tap: glow ring + node label expands
- Tap: side panel opens (see F1.4 spec)

### Interactions
- Pinch zoom on mobile, scroll zoom on desktop
- Drag to pan
- Double-tap node: zoom-to-fit
- Long-press node: quick-action menu (review, ask tutor, share)
- Pinch-to-fit: returns to full graph view

### Empty state
"Upload a PDF, ask a question, take a quiz — concepts will start appearing here. By next week, this place will look like *you*."

### Share/snapshot
1080×1920 vertical image suitable for Instagram Story. See F1.4 for composition.

### Performance
500+ nodes is slow with ReactFlow defaults. Implement viewport culling: render only nodes within viewport + 1-hop neighbors.

---

## 7. The Q&A / Tutor screen

### Purpose
The core interaction. User asks a question (text, voice, or photo); AI responds with context-aware answer streamed back.

### Current state assessment
Functional. Streams well. Doesn't fully showcase the differentiation (multi-PDF awareness, concept linking, conversation continuity).

### New IA

```
┌──────────────────────────────────────────────────────┐
│ ←  Conversation with your tutor                      │
│    📚 Sources: Allen DPP 3, NCERT Mech Ch 5          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  💬 You                                              │
│     What's the difference between elastic and       │
│     inelastic collision?                            │
│                                                      │
│  🧠 Tutor                                            │
│     [Streamed answer with concept chips highlighted] │
│                                                      │
│     This connects to:                               │
│       [Conservation of Momentum] [Newton's 3rd]     │
│                                                      │
│     Want to:                                        │
│       [Practice this — 5 questions]                 │
│       [Add to your review deck]                     │
│       [Ask follow-up]                               │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Type your question...                  [📷] [🎤] [→]│
└──────────────────────────────────────────────────────┘
```

### Key UX details

**Source chips at top:** show which PDFs the answer drew from. Tap → opens that PDF section. Builds trust.

**Concept chips in answer:** highlighted concept names are tappable → open Brain Map zoomed on that concept.

**Follow-up CTAs:** appear after each answer. Make taking action easier than typing the next message.

**Photo button:** opens camera (Sprint 2+). See F2.5 spec.

**Voice button:** opens voice tutor (existing feature).

### States

**Streaming:** answer appears word-by-word, cursor visible at end. No "thinking..." placeholder — start streaming as soon as first token arrives.

**Error:** "couldn't generate that just now. tap to try again, or rephrase."

**No PDFs uploaded:** Answer is provided from general knowledge, with a small banner: "I'm answering from general knowledge. Upload your PDFs for personalized answers."

**Subject classification visible:** Small icon shows detected subject (chemistry beaker, physics atom, etc.) — proves the AI knows what it's answering.

### Anti-patterns to avoid
- "Thinking..." placeholders that block interaction
- Generic answers without source attribution
- Aggressive upsells in the answer footer
- Re-asking for clarification when context is clear

---

## 8. The Focus Mode screen

### Purpose
A distraction-free study container. The user has chosen depth. The product should disappear.

### Current state assessment
Already exists. Has 4 ambient backgrounds. Audio-on/off control. Functional.

### Enhancements for 90-day window

**Minimal chrome:** Hide everything except: clock, current activity, exit button (small).

**Ambient backgrounds:** Keep the 4 existing. Add 1 more — a "library" feel (warm wood + light from window, low-fi).

**Audio:** Lo-fi ambient by default, no vocals. User can disable. No "study music" with overt beats.

**Session timer:** Visible, not aggressive. Counts up by default (not down). Pomodoro mode is opt-in.

**Idle detection:**
- 90 seconds of no activity → gentle "Still with us?" prompt (non-blocking)
- 5 minutes of no activity → auto-pause + gentle "Take a break?" option

**Session end:**
- "47 minutes. 23 cards reviewed. 2 concepts strengthened. Strong session."
- Single Brain Map preview snippet showing what grew
- "Continue" / "Close" / "Take 5"

### Anti-patterns to avoid
- Tickers / counters that distract during deep work
- Notifications during Focus Mode (already disabled — keep that way)
- Upsells during session
- Forced break suggestions before 90 minutes

---

## 9. The Library / PDF management screen

### Purpose
User's PDF library. Where they manage their study materials.

### Current state assessment
Functional. Lists PDFs. Allows upload. No prominent organization beyond file list.

### Enhancements

**Grouping options:**
- By subject (auto-detected from concepts)
- By chapter
- By upload date
- By "most asked from" (engagement-weighted)

**Library item card:**
```
┌────────────────────────────────────────────────────┐
│ 📕 Allen DPP Mechanics — Chapter 5                 │
│ 47 pages • 23 concepts • Last asked 2 days ago     │
│ Mastery from this PDF: 73%                         │
│ [Open] [Ask about this] [Quiz me]                  │
└────────────────────────────────────────────────────┘
```

**Empty state:**
"Your library is empty. Upload your first PDF to get started."
Tap Upload → opens file picker + sample option.

**Bulk actions:**
- Select multiple PDFs → "ask across these" / "quiz me on all" / "delete"

**Search bar:** Searches across PDF titles, content, concepts. Top of page.

### Sprint 3+ additions
- Tag system for custom organization
- Folder structure (for users with 20+ PDFs)
- Anki deck import (creates a virtual "deck" entry in library)

---

## 10. The Progress / Analytics page

### Purpose
Mode A surface for serious aspirants. The numbers and patterns of their preparation.

### Current state assessment
Exists. Has some metrics. Could be deeper. Peer percentile is computed but hidden.

### New IA

```
┌──────────────────────────────────────────────────────┐
│ Your Progress                                        │
├──────────────────────────────────────────────────────┤
│ This week                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │ Top 18%      │ │ 4h 23m       │ │ +6 concepts  ││
│ │ of cohort    │ │ studied      │ │ mastered     ││
│ └──────────────┘ └──────────────┘ └──────────────┘│
├──────────────────────────────────────────────────────┤
│ Mastery trajectory                                   │
│ [Line chart: mastery score over 12 weeks]            │
├──────────────────────────────────────────────────────┤
│ By subject                                           │
│ Physics    [████████░░] 73%   +5% this week         │
│ Chemistry  [██████░░░░] 58%   +2%                   │
│ Math       [█████████░] 84%   +1%                   │
├──────────────────────────────────────────────────────┤
│ Weak areas worth focusing on                        │
│ • Rotational Dynamics (Physics)                     │
│ • Coordination Compounds (Chemistry)                │
│ • Conic Sections (Math)                             │
│ [Build review plan]                                  │
├──────────────────────────────────────────────────────┤
│ Predicted JEE Main 2027                              │
│ Trajectory predicts 184-218 marks                   │
│ (with 95% confidence, based on 47 sessions)         │
│ Equivalent rank range: ~28,000-58,000               │
│ Updated daily                                        │
└──────────────────────────────────────────────────────┘
```

### Key design choices

**Tabular numbers** for all metrics — alignment matters.

**Sparklines** for trend at-a-glance.

**Subject-colored progress bars** — visual consistency with concept chips elsewhere.

**Predicted rank with confidence range** — honest, not falsely precise.

**No raw "engagement" metrics** — no "you opened the app X times." Only work-output metrics.

### States
- Cold start (< 5 sessions): "Your analytics will be ready after a few more sessions."
- Recent low activity: trend chart shows the dip honestly, no spin
- Top performer: "Top 1%" not "Top 1" (no awkward singularity)

### Time scopes
- This week (default)
- This month
- All time
- Since exam date set
- Custom range

---

## 11. The Cohort / Leaderboard page

### Purpose
Anonymous social proof. See cohort + own rank.

### IA

```
┌──────────────────────────────────────────────────────┐
│ JEE 2027 Bangalore                                   │
│ 8,234 members • 312 active right now                │
├──────────────────────────────────────────────────────┤
│ This week's leaders                  Updated Sunday  │
│                                                      │
│ #1  swift-tiger-247         Focus 94                │
│ #2  quiet-fox-883           Focus 91                │
│ #3  bright-eagle-431        Focus 89                │
│ ⋮                                                   │
│ #46 calm-otter-552          Focus 74                │
│ #47 brave-otter-512 (you)   Focus 73  ←  YOU       │
│ #48 sharp-deer-209          Focus 72                │
│ ⋮                                                   │
│ #100 nimble-fox-721         Focus 58                │
├──────────────────────────────────────────────────────┤
│ Anonymous. No identities shared.                    │
│ Focus = consistency + quality, not just hours.      │
└──────────────────────────────────────────────────────┘
```

### Key UX details

**Auto-scroll to user's position** on page load. They want to see themselves first.

**Tap a row** → show the public profile (cumulative day, subject focus, recent Brain Map sparkline). Still anonymous.

**Filter by:** This week / This month / All time.

**Empty state (cohort <30 members):**
"Cohort building (12 members so far). Leaderboard activates at 30 members."

### Anti-patterns to avoid
- Real names without explicit user consent
- Profile photos (privacy + comparison anxiety)
- Showing user "Last week you were #89, this week #47" with green arrow flash (over-celebrating)
- Showing user "You dropped from #47 to #89" with red arrow (active shaming)

The right approach: show the rank movement neutrally, without color.

---

## 12. The settings + profile screen

### Purpose
Where the user manages account, preferences, subscription, data.

### IA

```
┌──────────────────────────────────────────────────────┐
│ Your Profile                                         │
├──────────────────────────────────────────────────────┤
│ swift-tiger-247                                      │
│ JEE Main 2027 — Day 87                              │
│ 247 cumulative study days • 178 hours total         │
├──────────────────────────────────────────────────────┤
│ ⚙ Preferences                                       │
│   Notifications                                      │
│   Study window                                       │
│   Language (English/Hinglish — coming)               │
│   Theme                                              │
├──────────────────────────────────────────────────────┤
│ 💳 Subscription                                      │
│   Current plan: Student (₹199/mo)                   │
│   Renews May 28, 2026                               │
│   [Change plan] [Pause] [Cancel]                    │
├──────────────────────────────────────────────────────┤
│ 🔒 Data & privacy                                    │
│   [Export my data]                                   │
│   [Delete account]                                   │
├──────────────────────────────────────────────────────┤
│ ℹ About                                              │
│   Help center                                        │
│   Contact founder                                    │
│   Status page                                        │
│   Version 1.4.2                                      │
└──────────────────────────────────────────────────────┘
```

### Key design choices

**No upsells in settings.** Settings is where users come when they're frustrated. Don't compound.

**Cancel is one tap.** Not buried.

**"Contact founder" is a real link.** Direct line. Builds trust at low cost. Lives at `mailto:founder@ask-my-notes.com` with subject prefilled.

**Cumulative day is celebrated naturally.** Not a metric to grind for — just an observation of work done.

---

## 13. The pricing page

See `ELITE_FEATURE_ARCHITECTURE.md` F1.6 for spec.

### Visual treatment

Three columns, equal weight visually:
- Free Explorer (left)
- Student ₹199/mo (center, slightly elevated visually — this is the recommended)
- Pro ₹399/mo (right)

Below: Family ₹4,499/yr (single full-width card)

Below: Coaching Institute (single full-width with contact form CTA)

**Annual/monthly toggle:** Annual selected by default. Savings shown next to monthly equivalent.

**"7-day Pro trial included":** prominently displayed once, not 5 times.

### Anti-patterns to avoid
- "Most popular" tag on Pro (let students decide)
- "Only ₹X/day!" cute math (insulting)
- "Save 67%" without explaining what (yearly vs monthly)
- Hidden fees, last-minute charges, surprise additions
- Buttons sized differently per tier to push toward higher tier

---

## 14. The mobile-specific patterns

The product is web-first but most JEE/NEET aspirants will primarily use it on mobile. Mobile must feel native.

### Mobile bottom nav
4 items, fixed bottom:
- Home (dashboard)
- Brain (brain map)
- Library (PDFs)
- Cohort (leaderboard)

Settings → accessed via profile avatar in top-right.

### Mobile-specific patterns
- Pull-to-refresh on dashboard, library
- Swipe-to-delete on conversations, PDFs
- Long-press for context menus
- Bottom sheets (not modals) for actions
- Safe area handling (iOS notch, Android nav bar)

### Mobile-specific micro-interactions
- Haptic feedback on key actions (when permission given)
- Bottom sheet for filters (always reachable thumb-distance)
- Floating action button for new question on relevant screens

### Mobile PWA polish
- Add to home screen prompt at session 3+
- Proper PWA manifest (icons, splash screen, theme color)
- Service worker for offline read-only access to Brain Map, recent conversations

---

## 15. The "small things" library

Details that, collected, add up to product quality.

### Loading states
- Skeleton screens (not spinners) for data-heavy surfaces
- Spinner OK for actions <2 seconds
- Progress bars only when truly determinate

### Error states
See `STUDENT_PSYCHOLOGY_EXECUTION.md` Section 15. Lowercase, brief, with next action.

### Toast notifications
- Top of screen, slide in 250ms
- Auto-dismiss 4 seconds (unless action button present)
- One toast at a time (queue if multiple)
- Stack max 3 if necessary

### Confirmation patterns
- Destructive actions: confirm modal with clear copy
- Save actions: toast confirmation, not modal
- Cancel a session: no confirm, just save state silently

### Search behavior
- Debounce 200ms
- Show "no results" with suggestion, never empty
- Search by typo-tolerant matching where possible

### Form patterns
- Inline validation (after blur, not while typing)
- Disabled submit until valid (don't show error preemptively)
- Clear required-field indication
- Autofocus first field

### Sound design
- Silent by default everywhere
- User can enable: subtle "correct" chime for quiz (single tone, 300ms)
- Never auto-play audio anywhere

---

## 16. The accessibility baseline

The product must be usable by students with:
- Slow networks (rural India, Tier-3 cities)
- Older devices (Android 9+, iOS 14+)
- Visual impairment (screen reader compatible)
- Limited typing ability (voice input throughout)

### Specific commitments
- WCAG 2.1 AA contrast ratios
- Semantic HTML (proper headings, landmarks)
- Alt text on all functional images
- Keyboard navigation works everywhere
- Focus visible on all interactive elements
- Touch targets ≥44×44px on mobile
- Text resizable to 200% without breaking layouts
- No information conveyed by color alone

### Performance targets
- Time to Interactive ≤ 3.5s on Slow 3G
- Lighthouse score ≥ 90 for Performance
- First Contentful Paint ≤ 1.8s on average 4G

---

## 17. The implementation order for Sprint 1

What gets built first.

**Week 1:**
- Visual identity system (palette, type, components) updated to new tokens
- Empty state dashboard rebuilt (highest user-facing impact)
- Landing page rebuilt with JEE/NEET vertical commitment

**Week 2:**
- Brain Map promoted from `/dev/graph` to production
- Peer percentile surfaced (1-day task per F1.3)
- PDF processing feedback states added
- Onboarding flow rebuilt per Section 3 above

**Week 3:**
- Dashboard 4-mode system implemented (Morning/Active/Slump/Night)
- Q&A screen polish: source chips, concept chips, follow-up CTAs
- Focus Mode minimal-chrome update
- Library card redesign

**Week 4:**
- Pricing page rebuild
- Settings + profile redesign
- Mobile bottom nav implementation
- Polish pass + accessibility audit

---

## 18. The non-negotiable rules of the UI/UX system

1. **No dark patterns. Ever.** Hidden cancel, surprise charges, fake scarcity — all banned.
2. **No childish gamification.** No XP, no levels, no points, no streak guilt. Identity is built on real work, not pretend currency.
3. **Calm > exciting.** When in doubt, less motion, less color, less noise.
4. **Indian context, not Silicon Valley.** Vocabulary, examples, references — all native.
5. **Specifics > abstractions.** "Mastered Newton's 2nd Law" > "Great job!"
6. **Permission to skip everywhere.** No screen forces an action.
7. **Loading states explain, don't apologize.** "Processing your PDF — extracting concepts" not "Please wait..."
8. **Empty states promise, not blame.** "Your Brain Map will look like *you* by next week" not "Nothing here yet."
9. **Settings is a refuge, not a gauntlet.** Cancellation is one tap.
10. **The product disappears during deep work.** Focus Mode should make the product nearly invisible.

---

*Next: `MOBILE_AND_GAMIFICATION.md` for phone-shaped experience + identity systems that don't feel cheap.*
