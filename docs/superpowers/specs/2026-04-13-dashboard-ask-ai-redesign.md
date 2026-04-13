# Dashboard + Ask AI Sidebar Design Spec

**Date:** 2026-04-13  
**Project:** Ask My Notes — Ambient Intelligence Redesign  
**Scope:** Dashboard (Study + Progress modes), Ask AI page sidebar, QuickChat drawer, component system  
**Status:** Locked for implementation

---

## 1. Architecture Overview

### Pages in Scope
- **Dashboard** — DashboardSidebar (collapsible) + 2-mode bento grid + QuickChat drawer
- **Ask AI page** — AskAISidebar (with New Chat + Recent Chats + Your PDFs) + chat interface

### Pages Out of Scope (next specs)
- My PDFs page
- Landing + Auth pages

### QuickChat Drawer Data Flow
1. User types in Dashboard hero card input → hits Enter
2. Drawer slides in from right (fixed, 40% viewport width, 250ms ease-out)
3. Message sent to same API endpoint as Ask AI page
4. Supabase conversation row created with `user_id` + `conversation_id` + `messages[]`
5. User can follow up inside drawer (multi-turn support)
6. Click "Open full chat →" → navigates to `/ask-ai?cid={id}`
7. Ask AI page loads full thread from Supabase using `cid` URL param
8. Conversation history syncs between drawer and Ask AI page (same backend row)

### Security
- **UUIDs for conversation IDs** — unguessable, not sequential
- **Row Level Security (RLS)** — Supabase enforces `user_id = auth.uid()`, blocks cross-user access
- **App-level handling** — if conversation not found or belongs to another user, show new chat state

### Shared State
| Layer | Key | Value | Scope |
|-------|-----|-------|-------|
| **Supabase** | `conversations` | id, user_id, title, messages[], created_at | Persistent |
| **Supabase** | `active_pdf_id` | per user | Persistent |
| **Supabase** | `dashboard_mode` | "study" \| "progress" | Persistent |
| **localStorage** | `sidebar_collapsed` | boolean | Session |
| **localStorage** | `dashboard_mode` | mirrors Supabase (fast read) | Session |
| **React context** | `drawerConversationId` | current drawer session | Runtime |
| **React context** | `activePdf` | name + id for drawer badge | Runtime |

---

## 2. Dashboard Layout Spec

### Overall Structure
- **Sidebar (left):** DashboardSidebar, collapsible to 56px icon rail
- **Main area:** Greeting row + 2-mode bento grid

### Greeting Row
- **Left:** Dynamic greeting based on user's local timezone hour (20px, 700, #f4f4f5) + mode-specific sub-text (10px, 400, #71717a)
  - 5am–12pm: "Good morning, [Name]"
  - 12pm–5pm: "Good afternoon, [Name]"
  - 5pm–9pm: "Good evening, [Name]"
  - 9pm–5am: "Good night, [Name]"
- **Sub-text by mode + time:**

| Mode | Morning / Afternoon / Evening | Night (9pm–5am) |
|------|-------------------------------|-----------------|
| Study | "Ready to study?" | "Studying late?" |
| Progress | "See your progress" | "See your progress" |

- **Logic:** `new Date().getHours()` in user's local timezone (browser time)
- **Right:** Mode toggle pill (Study | Progress)
  - Active tab: `linear-gradient(135deg, #8B5CF6, #6D28D9)`, white text
  - Inactive tab: transparent, #71717a text
  - Padding: 2px (inside pill), 8px per option
  - Transition: 200ms ease-in-out

### Study Mode Bento Grid
| Card | Size | Content | Notes |
|------|------|---------|-------|
| **Ask AI (hero)** | 2×2 (left) | Input + active PDF badge | Purple gradient + cyan left border 2px + inner glow |
| **Focus Mode** | 1×1 | Timer icon + "Pomodoro 25m" | Base card |
| **Quiz** | 1×1 | Checkmark icon + "12 cards ready" | Base card |
| **AI Coach** | 1×1 | Chat icon + "3 suggestions" | AI response card (cyan left border 3px) |
| **Voice Tutor** | 1×1 | Mic icon + "Speak to learn" | Base card |

**Layout:** 2 columns, 2 rows. Hero spans 2 rows on left. 4 cards (2×2) stacked on right.

### Progress Mode Bento Grid
| Card | Size | Content | Notes |
|------|------|---------|-------|
| **Your Brain (hero)** | 2×2 (left) | Mastery map grid (4×4) + progress bar | Purple gradient, warmer tint |
| **Analytics** | 1×1 | Bar chart icon + "6h studied this week" | Base card |
| **Study Plans** | 1×1 | Document icon + "Day 12 of 30" | Base card |
| **Exam Countdown** | 1×1 | Calendar icon + "48 days left" (amber text) | Base card |
| **Weekly Recap** | 1×1 | Trend icon + "+18% vs last week" | Base card |

**Layout:** Same as Study mode. Hero 2×2 left, 4 cards 2×2 right.

### Card Specs
```css
/* All cards */
border-radius: 10px;
padding: 10px;
background: #111111;
border: 1px solid rgba(255,255,255,0.06);
gap between cards: 6px;

/* Hero card (Study) — declare border-left AFTER border to avoid override */
background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.04));
border: 1px solid rgba(139,92,246,0.22);
border-left: 2px solid rgba(34,211,238,0.35); /* must come after border shorthand */
box-shadow: inset 0 0 30px rgba(34,211,238,0.04);

/* AI response card (AI Coach) */
border-left: 3px solid rgba(34,211,238,0.3);
box-shadow: 0 0 16px rgba(34,211,238,0.08);

/* Hover animation */
hover: translateY(-2px);
duration: 200ms;
easing: ease-out;
```

### Ask AI Hero Card Details
- **Active PDF badge:** Cyan text (#22D3EE), small label below title
- **Input:** `rgba(255,255,255,0.04)` background, `1px solid rgba(34,211,238,0.2)` border, 6px radius, 9px padding
- **Input glow:** `0 0 8px rgba(34,211,238,0.06)` box-shadow
- **Send button:** Small icon button (↑), purple gradient, 14×14px
- **Breathing animation (idle):** Cyan glow pulse, 3s infinite, ease-in-out

### Your Brain Hero Card Details
- **Mastery grid:** 4×4 cells, each 7×7px, 2px gap
  - Gray (#27272a): not studied
  - Amber tint: learning (`rgba(245,158,11,0.35-0.65)`)
  - Green (#22C55E): mastered
- **No tooltips on dashboard card** — ambient visualization only, not detailed data. Grid is felt, not read.
- **Click behaviour:** Clicking the Your Brain card navigates to a dedicated mastery page where all 16 topics are labeled and expandable.
- **Progress bar below grid:** 6 dots, filled from left as mastery increases
- **Spacing:** mastery grid 4px below title, progress bar 4px below grid

### Mode Transition Animation
- **Out:** Cards fade to opacity 0, 150ms, ease-in-out
- **In:** Cards fade to opacity 1, 200ms, ease-in-out, 30ms stagger per card
- **No slide:** Fade only, no translate

---

## 3. QuickChat Drawer Spec

### Drawer Dimensions & Animation
- **Width:** 40% of viewport (min 320px, max 600px)
- **Height:** Full viewport height
- **Position:** Fixed, right edge
- **Slide animation:** `translateX(100%) → 0`, 250ms ease-out
- **Dashboard overlay:** `rgba(0,0,0,0.4)`, no blur
- **Close trigger:** ✕ button or click overlay
- **Z-index:** 10 (above dashboard)

### Drawer Structure

**Header (8px padding, border-bottom 1px rgba(255,255,255,0.05))**
- Left: "◈ Quick Ask" title + active PDF badge (cyan badge style)
- Right: ✕ close button

**Message Thread**
- User message: `rgba(139,92,246,0.12)` bg, 6px radius, 5px 8px padding, `#c4b5fd` text, max-width 80%
- AI response: cyan left border 2px, 5px 8px padding, `#a1a1aa` text, `rgba(34,211,238,0.02)` bg, 0 6px 6px 0 radius
- Font size: 9px, line-height 1.5
- Streaming indicator: blinking cyan cursor at end of AI response

**Input Area (7px padding, border-top 1px rgba(255,255,255,0.05))**
- Input field: `rgba(255,255,255,0.04)` bg, `1px solid rgba(255,255,255,0.08)` border, 5px radius, 4px 8px padding, 9px font
- Send button: 20×20px, purple gradient, 9px font-size
- "Open full chat →" link: 8px font, cyan (#22D3EE), right-aligned inside input area or below

### Drawer Data Behavior
- **First message:** Create Supabase conversation row (`user_id`, `conversation_id`, `messages[]`)
- **PDF context:** Active PDF from Ask AI page state
  - **PDF active + answer found** (similarity score ≥ 0.75): RAG response with PDF citation
  - **PDF active + answer not found** (similarity score < 0.75): General AI response with note prepended: "Not found in [PDF name], here's general knowledge:"
  - **No PDF active:** Show "No PDF" badge in header, general AI response only (no RAG)
  - **Threshold:** `0.75` cosine similarity on pgvector search. Configurable via `RAG_CONFIDENCE_THRESHOLD` env var.
- **Multi-turn:** Drawer holds full thread in React local state during session
- **On close:** `conversationId` persisted in React context
- **Re-open drawer:** Resumes same conversation in local state
- **"Open full chat →":** Deep link to `/ask-ai?cid={conversationId}`, Ask AI page loads full thread

---

## 4. Sidebar Specs

### Dashboard Sidebar (All Pages)

#### Expanded State (220px)
```css
width: 220px;
background: #111111;
border-right: 1px solid rgba(255,255,255,0.05);
padding: 10px 0;

/* Collapse/expand animation */
transition: width 250ms ease-in-out;
labels fade out/in 150ms;
```

**Header (10px padding, border-bottom 1px rgba(255,255,255,0.05))**
- Logo + "AskMyNotes" text
- ‹ collapse button (right-aligned)

**Main Navigation**
- Dashboard (Grid icon)
- Ask AI (MessageSquare icon)
- My PDFs (FileText icon)
- Active state: `rgba(139,92,246,0.12)` bg, purple icon, purple label text

**User Section (bottom)**
- Avatar (20×20, initials, purple bg) + name
- Padding: 8px 10px, border-top 1px rgba(255,255,255,0.05)

#### Collapsed State (56px Icon Rail)
```css
width: 56px;
display: flex;
flex-direction: column;
align-items: center;
padding: 10px 0;
gap: 8px;
```

**Icon Rail Structure**
- Logo mark (22×22px, margin-bottom 4px)
- Divider (28px wide, 1px rgba(255,255,255,0.05))
- Dashboard icon (28×28px, dark)
- Ask AI icon (28×28px, active: purple bg)
- My PDFs icon (28×28px, dark)
- Purple indicator dot on Ask AI (current page)
- Cyan indicator dot on My PDFs (active PDF)
- Expand button (bottom, ›)

**Collapsed Tooltip**
- On hover: label shows in tooltip (e.g., "Ask AI")
- Tooltip: `#1F1F23` bg, `1px solid rgba(255,255,255,0.1)` border, 5px radius, 3px 8px padding
- Arrow pointer on left
- 200ms delay before show
- Font: 9px, #e4e4e7

**State Persistence**
- `localStorage.sidebar_collapsed` = true/false
- Reads on mount, syncs on toggle

---

### Ask AI Sidebar (Ask AI Page Only)

#### Expanded State (220px)
Inherits all Dashboard sidebar structure, with additions:

**Below Header + Nav (10px padding)**

**"+ New Chat" Button**
- Compact pill, right-aligned in the sidebar header row (inline with logo, not below nav)
- Style: `border: 1px solid rgba(255,255,255,0.1)`, `padding: 2px 8px`, `border-radius: 5px`
- Icon (+ svg, 10px) + "New Chat" text (9px font)
- Hover: `border-color: rgba(139,92,246,0.3)`
- Does NOT take full width — sits flush right of logo text in the header row

**Recent Chats Section (collapsible)**
- Header: "Recent ▾" (9px uppercase, #3f3f46)
- Up to 10 most recent chats
- Chat item: `padding: 4px 10px`, `border-radius: 4px`, `margin: 0 4px`, 9px font, #52525b
- **Active chat:** Purple left border 2px, `rgba(139,92,246,0.05)` bg, #a1a1aa text
- Chat title + timestamp (8px, #27272a)
- Click to load conversation

**Your PDFs Section (collapsible)**
- Header: "Your PDFs ▾" (9px uppercase, #3f3f46)
- PDF item: FileText icon + name + active badge
- **Active PDF:** `#22D3EE` text, `rgba(34,211,238,0.05)` bg, cyan badge `rgba(34,211,238,0.08)` with border
- **Inactive PDFs:** #52525b text, no bg
- Click to switch active PDF

#### Collapsed State (56px Icon Rail)
Same as Dashboard sidebar. "Recent Chats" and "Your PDFs" sections hidden entirely.
- Ask AI icon shows purple indicator dot (current page)
- My PDFs icon shows cyan indicator dot (active PDF)
- Tooltips on hover show icon names only ("Recent Chats" tooltip does not appear)

#### Mobile State (Full-height Overlay)
- Hamburger menu trigger (3-line icon, top-left of mobile top bar)
- On tap: sidebar slides in as full-height overlay from left (72% width, z-index 10)
- Dashboard fades behind with `rgba(0,0,0,0.5)` overlay
- Content same as expanded desktop
- Close: tap ✕ button (top-right inside sidebar) or swipe left
- No icon rail on mobile

**Mode toggle on mobile:**
- Removed from top bar (no space alongside hamburger + title + PDF badge)
- Moved inside the hamburger sidebar, below the main nav items
- Renders as same pill (Study | Progress) with full-width stretch inside sidebar
- Tap to switch mode, sidebar closes automatically after toggle

---

## 5. Component System

### Buttons (3 Variants)

#### Primary Button (Glassmorphism)
```css
background: linear-gradient(135deg, #8B5CF6, #6D28D9);
color: #fff;
position: relative;
overflow: hidden;

/* Glass overlay — no fallback needed, design is dark-only */
::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  pointer-events: none;
}

padding: 9px 18px;
border-radius: 8px;
font-size: 11px;
font-weight: 600;

/* Hover */
hover: translateY(-1px);
/* Press */
active: scale(0.97);
transition: all 200ms ease-out;
```

**Use:** Primary CTAs only (Ask AI CTA, submit buttons in modals, start study actions)  
**Note:** No light-background fallback needed — design system is exclusively dark surfaces.

#### Secondary Button (Ghost)
```css
background: transparent;
color: #a1a1aa;
border: 1px solid rgba(255,255,255,0.12);
padding: 8px 16px;
border-radius: 8px;
font-size: 11px;
font-weight: 600;

hover: {
  border-color: rgba(139,92,246,0.4);
  color: #c4b5fd;
  transform: translateY(-1px);
  transition: 200ms ease-out;
}
/* Press — opacity not scale (less visual mass than primary) */
active: opacity(0.7);
transition: 100ms ease-in;
```

**Use:** Secondary actions (View Analytics, Cancel, Back)

#### Compact Button (Inline)
```css
background: transparent;
color: #a1a1aa;
border: 1px solid rgba(255,255,255,0.10);
padding: 4px 10px;
border-radius: 6px;
font-size: 10px;
font-weight: 600;

hover: {
  border-color: rgba(255,255,255,0.2);
  color: #e4e4e7;
}
/* Press — opacity not scale (small button, scale looks janky) */
active: opacity(0.7);
transition: 100ms ease-in;
```

**Use:** Inline actions (+ New Chat pill, toolbar buttons)

---

### Cards (3 Variants)

#### Base Card
```css
background: #111111;
border: 1px solid rgba(255,255,255,0.06);
border-radius: 10-12px;
padding: 16-20px;

hover: {
  transform: translateY(-2px);
  transition: 200ms ease-out;
}
```

**Use:** All standard content cards (Quiz, Focus Mode, Analytics, Study Plans, Exam Countdown, Weekly Recap)

#### Hero Card
```css
background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.04));
border: 1px solid rgba(139,92,246,0.22);
border-left: 2px solid rgba(34,211,238,0.35);
border-radius: 12px;
padding: 16px;

/* Inset glow applied directly on card — no ::before needed */
box-shadow: inset 0 0 30px rgba(34,211,238,0.04);

/* Progress mode variant: warmer gradient, no cyan signal */
background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(20,10,40,0.4));
border: 1px solid rgba(139,92,246,0.18);
box-shadow: none;
```

**Use:** 2×2 hero slot only (Ask AI in Study mode, Your Brain in Progress mode)  
**Note:** Inset glow applies to Study mode hero only (cyan = AI signal). Progress mode hero has no cyan.

#### AI Response Card
```css
/* AI Coach card (standalone bento card — 3px border, only AI signal it has) */
background: #111111;
border: 1px solid rgba(255,255,255,0.06);
border-left: 3px solid rgba(34,211,238,0.3);
border-radius: 10px;
padding: 16px;
box-shadow: 0 0 16px rgba(34,211,238,0.08);

/* Drawer message bubble (inline — 2px border, tighter context) */
border-left: 2px solid rgba(34,211,238,0.35);
padding: 5px 8px;
border-radius: 0 6px 6px 0;
background: rgba(34,211,238,0.02);
box-shadow: none;
```

**Border hierarchy:**
- **3px** = AI Coach bento card. No gradient/glow background — border is its only AI signal, needs emphasis.
- **2px** = Drawer responses + Hero card. Already surrounded by gradient/glow context that amplifies the signal.

**Use:** AI Coach card, AI responses in drawer  
**Important:** Never use on user-generated content (user inputs, quiz answers, uploaded PDFs)

---

### Color System (3 Layers)

#### Layer 1: Purple = Brand Identity
```
Primary: #8B5CF6
Dark: #6D28D9
Gradient: linear-gradient(135deg, #8B5CF6, #6D28D9)

Use for:
- Primary CTAs
- Active nav state
- Sidebar active indicator
- User mastery badges
- Mode toggle active state
```

#### Layer 2: Cyan = Ambient AI Signal
```
Cyan: #22D3EE

Use ONLY when AI is active:
- Hero card left border (2-3px)
- AI response box-shadow glow
- Active PDF badge
- Input field focus glow
- Breathing animation on AI input

Never use for non-AI content
```

#### Layer 3: Progress Gradient = Motivation
```
Gradient: Gray → Amber → Green
- Gray: #27272a (not studied)
- Amber: #F59E0B (learning, opacity 0.35-0.7)
- Green: #22C55E (mastered)

Use for:
- Mastery map cells (Your Brain)
- Topic progress visualization
- Dashboard warmth as student studies
```

#### Foundation: Deep Black (Locked)
```
Page background: linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)
Surface: #111111, #18181B, #1F1F23
Glass: rgba(255,255,255,0.05) + backdrop-blur-xl

NOT CHANGING
```

---

### Typography Scale

| Element | Size | Weight | Color | Use |
|---------|------|--------|-------|-----|
| Greeting header | 20px | 700 | #f4f4f5 | "Good evening, [Name]" |
| Card title | 15px | 700 | #f4f4f5 | Hero card titles |
| Card heading | 12px | 600 | #e4e4e7 | Base card titles |
| Body text | 11px | 400 | #a1a1aa | Descriptions, subtitles |
| Timestamp | 9px | 400 | #71717a | Chat times, secondary info |
| Label | 9px | 700 | #52525b | Section headers (UPPERCASE) |

**Font family:** `-apple-system, 'Inter', sans-serif`

---

### Spacing System (8px Base)

```
4px = Icon gaps, tight spacing
8px = Base unit (card padding, gaps)
16px = Card padding standard
20px = Section gaps
24px = Page padding
32px = Large section gaps
```

**Card padding:** 16–20px  
**Bento gap:** 6px  
**Section gap:** 20–24px

---

### Micro-Interactions

#### Card Hover Lift
```css
transform: translateY(-2px);
duration: 200ms;
easing: ease-out;
applies to: all interactive cards
```

#### Button Press
```css
/* Primary button — scale down (has visual mass to absorb it) */
active: scale(0.97);
duration: 100ms;
easing: ease-in;

/* Ghost + Compact — opacity drop (less visual mass, scale looks janky) */
active: opacity(0.7);
duration: 100ms;
easing: ease-in;
```

#### Mode Switch (Study ↔ Progress)
```css
/* Cards out */
opacity: 0;
duration: 150ms;
easing: ease-in-out;

/* Cards in */
opacity: 1;
duration: 200ms;
stagger: 30ms per card;
easing: ease-in-out;

No slide/translate — fade only
```

#### AI Input Breathing (Idle)
```css
/* Cyan glow pulse on Ask AI hero input */
animation: glow 3s ease-in-out infinite;

@keyframes glow {
  0%, 100%: box-shadow: 0 0 8px rgba(34,211,238,0.06);
  50%: box-shadow: 0 0 16px rgba(34,211,238,0.12);
}
```

#### Drawer Slide
```css
transform: translateX(100%) → 0;
duration: 250ms;
easing: ease-out;
```

#### Sidebar Collapse/Expand
```css
width: 220px ↔ 56px;
duration: 250ms;
easing: ease-in-out;
labels fade 150ms;
```

---

## 6. Implementation Notes

### File Structure
```
src/
├── components/
│   ├── Dashboard/
│   │   ├── DashboardSidebar.tsx
│   │   ├── DashboardContainer.tsx
│   │   ├── DashboardModeToggle.tsx
│   │   ├── BentoGrid.tsx
│   │   ├── StudyModeCards.tsx
│   │   ├── ProgressModeCards.tsx
│   │   └── AskAIHeroCard.tsx
│   ├── QuickChat/
│   │   ├── QuickChatDrawer.tsx
│   │   ├── DrawerMessageThread.tsx
│   │   └── DrawerInput.tsx
│   ├── AskAI/
│   │   ├── AskAISidebar.tsx
│   │   ├── RecentChats.tsx
│   │   ├── YourPDFs.tsx
│   │   └── ChatInterface.tsx
│   └── Buttons/
│       ├── PrimaryButton.tsx (glassmorphism)
│       ├── SecondaryButton.tsx
│       └── CompactButton.tsx
├── contexts/
│   ├── DashboardContext.tsx (sidebar_collapsed, dashboard_mode, drawerConversationId)
│   ├── DrawerContext.tsx
│   └── AuthContext.tsx
├── hooks/
│   └── useActivePDF.ts
├── styles/
│   └── components.css (Tailwind + CSS custom properties)
└── lib/
    └── supabase.ts (RLS-enforced queries)
```

### Key APIs to Update/Create
- `GET /api/chat` — accepts `?cid={id}` to load existing conversation
- `POST /api/chat` — creates new conversation, returns `conversationId`
- `GET /api/conversations` — list recent chats (RLS enforced)
- `GET /api/user-pdfs` — list user's PDFs, return active one
- `PUT /api/user/active-pdf` — set active PDF

### Testing Checklist
- [ ] Dashboard mode toggle switches Study ↔ Progress, cards fade correctly
- [ ] Ask AI hero input sends message, drawer opens, message appears in drawer
- [ ] Drawer multi-turn conversation works (follow-ups)
- [ ] "Open full chat →" navigates to `/ask-ai?cid=xxx`, full thread loads
- [ ] Sidebar collapses to icon rail, tooltips appear on hover
- [ ] Ask AI sidebar shows Recent Chats, click opens conversation
- [ ] Active PDF badge shows in drawer
- [ ] RLS blocks cross-user conversation access (test with second user)
- [ ] Mobile: hamburger opens overlay sidebar, swipe/✕ closes
- [ ] Responsive: buttons, cards, drawer all work on mobile

---

## 7. Design System Consistency

This spec implements the **Ambient Intelligence** design system:

✅ **Minimalism** — content-first, no decorative clutter  
✅ **Bento Grid** — asymmetric Hero Left pattern  
✅ **Glassmorphism** — primary button + sidebar cards via backdrop-blur  
✅ **Fluent Design** — micro-interactions (200-300ms, lift + scale)  
✅ **Liquid Glass** — reserved for AI ambient signal (cyan borders, glows)  
✅ **Material Design** — clear hierarchy, touch targets (28×28px min), consistent spacing

**Emotional story:** "I'm getting smarter every day."  
**AI feeling:** Present but never loud — ambient, like good lighting.

---

## Appendix A: Color Reference

| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| Brand Purple | #8B5CF6 | rgb(139, 92, 246) | Primary CTAs, active nav |
| Brand Dark | #6D28D9 | rgb(109, 40, 217) | Gradient pair |
| Ambient Cyan | #22D3EE | rgb(34, 211, 238) | AI signals only |
| Mastery Amber | #F59E0B | rgb(245, 158, 11) | Learning state |
| Mastery Green | #22C55E | rgb(34, 197, 94) | Mastered state |
| Surface | #111111 | rgb(17, 17, 17) | Card backgrounds |
| Text Primary | #f4f4f5 | rgb(244, 244, 245) | Headers, titles |
| Text Secondary | #a1a1aa | rgb(161, 161, 170) | Body text |
| Text Muted | #52525b | rgb(82, 82, 91) | Labels, timestamps |

---

**End of spec. Ready for implementation planning.**
