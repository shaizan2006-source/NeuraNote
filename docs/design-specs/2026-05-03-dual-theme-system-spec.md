# Ask My Notes — Dual Theme System Design Specification

**Document Version:** 1.0  
**Date:** May 3, 2026  
**Status:** ✅ LOCKED — Ready for Implementation  
**Author:** Design & Product Team

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Color Systems](#color-systems)
3. [Component Mapping](#component-mapping)
4. [Theme Toggle Implementation](#theme-toggle-implementation)
5. [Animation Specifications](#animation-specifications)
6. [AI Dust Idle Animation](#ai-dust-idle-animation)
7. [File Structure](#file-structure)
8. [Integration Checklist](#integration-checklist)

---

## 📌 OVERVIEW

**Objective:** Implement a dual-theme system allowing users to toggle between:
- **Gradient Mode** (Current) — Purple brand + Cyan AI signals
- **Dark Mode (Teal)** (New) — Teal brand + Lighter Teal AI signals

**Key Features:**
- Toggle in navbar/header (sun/moon icon → dropdown)
- Smooth left-to-right slide animation (250ms)
- Cards change colors mid-slide
- Persists to user account (sync across devices)
- localStorage fallback for unauthenticated users

---

## 🎨 COLOR SYSTEMS

### **SYSTEM 1: Gradient Mode (Current — Default)**

```
Brand Color:           Purple #8B5CF6
Brand Dark:            Purple #6D28D9
AI Presence Signal:    Cyan #22D3EE
Progress/Mastery:      Gray → Amber → Green
  - Gray:              #27272a
  - Amber:             #F59E0B
  - Green:             #22C55E
Background (Base):     #0A0A0A → #1A1A2E (gradient)
Surface (Cards):       #111111, #18181B, #1F1F23
Glass Overlay:         rgba(255,255,255,0.05) + backdrop-blur-xl
Text Primary:          #FFFFFF
Text Secondary:        #E5E7EB
Border:                rgba(255,255,255,0.06)
```

**Use Cases:**
- Primary CTAs
- Sidebar active indicator
- Active chat borders
- Mode toggle switch (ON state)
- Mastery badges
- User-generated content accent

---

### **SYSTEM 2: Dark Mode (Teal — New)**

```
Brand Color:           Teal #14B8A6
Brand Light:           Lighter Teal #2DD4BF (AI signals)
Progress/Success:      Green #10B981
Warnings/Weak Areas:   Amber #FBBF24
Errors/Urgent:         Rose #F43F5E
Background (Base):     Pitch Black #050505 (flat, no gradient)
Surface (Cards):       #0F0F0F (slightly lighter for depth)
Glass Overlay:         rgba(255,255,255,0.05) + backdrop-blur-xl
Text Primary:          #FFFFFF
Text Secondary:        #E5E7EB
Border:                rgba(255,255,255,0.06)
Secondary Button:      Gray bg (rgba(255,255,255,0.05)) + Teal border (#14B8A6)
```

**Use Cases:**
- Primary CTAs
- Sidebar active indicator
- Active chat borders
- AI presence signals (breathing, borders)
- Progress visualization
- Semantic color system (green/amber/rose)

---

## 🧩 COMPONENT MAPPING

### **Buttons**

| Component Type | Gradient Mode | Dark Mode (Teal) | Behavior |
|---|---|---|---|
| **Primary CTA** | Purple gradient + glass | Teal gradient + glass | Click: scale(0.97), Hover: translateY(-2px) 200ms |
| **Secondary (Ghost)** | Transparent + gray outline | Gray bg + teal border (40% opacity) | Click: opacity(0.7), Hover: teal border 70% + bg tint |
| **Compact** | Small outline, 4px 10px | Gray + teal outline, 4px 10px | Click: opacity(0.7) |
| **Success State** | N/A | Green (#10B981) | Solid button |
| **Warning State** | N/A | Amber (#FBBF24) | Solid button |
| **Error State** | N/A | Rose (#F43F5E) | Solid button |

---

### **Cards**

| Card Type | Gradient Mode | Dark Mode (Teal) | Notes |
|---|---|---|---|
| **Hero (Study)** | Purple gradient + cyan left border (2px) | Teal gradient + lighter teal left border (2px) | Breathing animation on AI input |
| **Hero (Progress)** | Warm purple gradient | Teal gradient | No AI signal |
| **AI Response** | Cyan border-left (3px) | Lighter teal (#2DD4BF) border-left (3px) | AI Coach bento only |
| **Drawer Responses** | Cyan border-left (2px) | Lighter teal border-left (2px) | Gradient context amplifies |
| **Base Card** | #111111 bg, white border 0.06 | #0F0F0F bg, white border 0.06 | Hover: translateY(-2px) 200ms |

---

### **Interactive Elements**

| Element | Gradient Mode | Dark Mode (Teal) | Interaction |
|---|---|---|---|
| **Sidebar Active Indicator** | Purple dot | Teal dot | Visual indicator of current page |
| **Active Chat Border** | Purple left border | Teal left border | In recent chats list |
| **Toggle Switch (ON)** | Purple background | Teal background | Smooth transition |
| **Badge Accent** | Purple/Cyan | Teal/Lighter Teal | Contextual |
| **Focus Ring** | Purple outline | Teal outline | Keyboard navigation |
| **Placeholder Breathing** | Cyan pulse | Lighter Teal pulse | AI listening state |

---

### **Semantic Colors (Dark Mode Only)**

| Semantic Use | Color | Hex | Contexts |
|---|---|---|---|
| **Success/Completed** | Green | #10B981 | Completed chapters, successful answers, "Keep it up!" |
| **Warning/Weak** | Amber | #FBBF24 | Weak in Calculus, needs review, tip badge |
| **Error/Urgent** | Rose | #F43F5E | Review needed, 3 wrong answers, pending tests |
| **Info/Tip** | Light Blue | #3B82F6 | Tips, insights, helpful notes |

---

## 🔀 THEME TOGGLE IMPLEMENTATION

### **UI Component: Theme Toggle**

**Location:** Navbar/Header (top-right, next to user menu)

**Visual:**
- **Icon:** Sun/Moon SVG (animated rotation)
- **Trigger:** Click icon → opens dropdown menu
- **Dropdown Menu Position:** Left-aligned to icon
- **Auto-close:** Closes immediately after selection

**Dropdown Content:**
```
☀️/🌙 Icon
├─ 🌙 Dark Mode (Teal)        ✓ [if active]
├─ ☀️ Light Mode               [Coming soon - disabled/grayed out]
└─ 🎨 Gradient Mode            ✓ [if active]
```

---

### **Animation: Theme Switch**

**Trigger:** User selects theme from dropdown

**Animation Sequence:**
1. **Slide:** Content slides left-to-right (250ms)
2. **Color Change:** Cards change colors mid-slide
3. **Fade:** Simultaneous opacity shift
4. **Direction:** Left-to-right slide (entire viewport or content area)
5. **Easing:** ease-in-out

**CSS Pseudo-code:**
```css
.theme-transition {
  animation: slideTheme 250ms ease-in-out;
}

@keyframes slideTheme {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  50% {
    transform: translateX(-20px);
    opacity: 0.8;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

### **Persistence**

**For Authenticated Users:**
- Store `theme_preference` in `user_profiles` table (Supabase)
- Field: `theme_preference` (enum: 'gradient' | 'dark' | 'light')
- Syncs across all devices

**For Unauthenticated Users:**
- Store in `localStorage` key: `ask-my-notes:theme`
- Value: 'gradient' | 'dark' | 'light'
- Migrate to account on login

**Load Priority:**
1. Check user account (if authenticated)
2. Fall back to localStorage
3. Default to 'gradient' mode

---

## ⚡ ANIMATION SPECIFICATIONS

### **Theme Switch Animation (250ms)**

| Phase | Duration | Action | Easing |
|---|---|---|---|
| Slide Out | 125ms | Content slides left | ease-in |
| Color Change | 125ms (mid-slide) | Card colors transition | linear |
| Slide In | 125ms | Content returns | ease-out |

**Detailed Flow:**
```
0ms:    User clicks theme
50ms:   Slide starts (left)
125ms:  Color values update, cards change color
175ms:  Slide completes (returns to position)
250ms:  Animation ends, new theme active
```

---

### **Card Hover Animation (200ms)**

**Both themes:**
- **Default:** Standard position, no shadow
- **Hover:** `translateY(-2px)` + subtle shadow
- **Duration:** 200ms ease-out
- **Applies to:** All cards, CTAs

---

### **Button Press Animation**

**Primary Button (Purple/Teal):**
- **Press:** `scale(0.97)`
- **Duration:** 100ms ease-in
- **Release:** Returns to scale(1)

**Secondary Button:**
- **Hover:** `opacity(0.7)` + teal border 70% + bg tint
- **Duration:** 200ms ease-out

---

### **AI Breathing Animation (Pulse)**

**Gradient Mode:**
- Color: Cyan (#22D3EE)
- Animation: 3s infinite pulse
- Opacity: 0 → 1 → 0

**Dark Mode:**
- Color: Lighter Teal (#2DD4BF)
- Animation: 3s infinite pulse
- Opacity: 0 → 1 → 0

---

## 👾 AI DUST IDLE ANIMATION

### **Trigger Condition**
- Idle: No mouse movement, typing, scroll, or interaction for **5 seconds**
- Stops immediately on user interaction

### **Visual Specifications**

| Property | Value | Notes |
|---|---|---|
| **Particle Size** | 1-2px | Tiny, subtle |
| **Particle Density** | Max 30 particles | Capped, no memory leaks |
| **Creation Rate** | 1 particle every 200ms | Smooth density |
| **Opacity Range** | 0.2 - 0.5 | Very subtle |
| **Color (Primary)** | White (0.2-0.5 opacity) | 85% of particles |
| **Color (Accent)** | Teal/Cyan glow (15% of particles) | Theme-specific |
| **Drift Speed (Y)** | 0.3-0.5 px/frame | Slow downward drift |
| **Drift Speed (X)** | ±0.5 px/frame | Slight randomness |
| **Lifetime** | ~5 seconds (300 frames @ 60fps) | Natural fade-out |

### **Teal Mode Glow:**
```
Color: #2DD4BF (Lighter Teal)
Glow: rgba(45, 212, 191, 0.4)
Shadow Blur: 4px
```

### **Gradient Mode Glow:**
```
Color: #22D3EE (Cyan)
Glow: rgba(34, 211, 238, 0.4)
Shadow Blur: 4px
```

### **Scope**
- **Default Scope:** `.chat-area` (Ask AI chat container)
- **Fallback Selectors:** 
  - `.ask-ai-container`
  - `[data-dust-scope]`
  - `document.body` (last resort)
- **Disabled Routes:** `/ask-ai`, `/my-pdfs` (prevent distraction during study)

### **Device Targeting**
- **Enabled on:** Desktop browsers, tablets
- **Disabled on:** Mobile phones (battery/performance)
- **Accessibility:** Respects `prefers-reduced-motion: reduce`
- **Low-end Devices:** Disabled on devices with ≤2 CPU cores

---

## 📁 FILE STRUCTURE

```
src/
├── components/
│   ├── Theme/
│   │   ├── ThemeToggle.tsx          [Sun/Moon icon + dropdown]
│   │   ├── ThemeProvider.tsx        [Theme context + persistence]
│   │   └── useTheme.ts              [Hook for theme management]
│   ├── AIDust/
│   │   ├── AIDustLayer.tsx          [Canvas-based animation]
│   │   ├── useIdleDetection.ts      [Idle state hook]
│   │   └── ai-dust.config.ts        [Configuration]
│   └── ...
├── styles/
│   ├── theme.css                    [CSS variables for both themes]
│   ├── dust.css                     [AI dust animations]
│   └── animations.css               [Shared animations]
├── context/
│   └── ThemeContext.tsx             [React context for theme]
└── types/
    └── theme.ts                     [TypeScript types]
```

---

## 🎨 CSS VARIABLES STRATEGY

### **Root Variables (Both Themes)**

```css
:root {
  /* Gradient Mode (Default) */
  --color-brand: #8B5CF6;
  --color-brand-dark: #6D28D9;
  --color-ai-signal: #22D3EE;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  
  --bg-base: linear-gradient(to bottom, #0A0A0A, #1A1A2E);
  --bg-surface: #111111;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #E5E7EB;
  --color-border: rgba(255, 255, 255, 0.06);
}

/* Dark Mode (Teal) */
:root.theme-dark {
  --color-brand: #14B8A6;
  --color-brand-light: #2DD4BF;
  --color-ai-signal: #2DD4BF;
  --color-success: #10B981;
  --color-warning: #FBBF24;
  --color-error: #F43F5E;
  
  --bg-base: #050505;
  --bg-surface: #0F0F0F;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #E5E7EB;
  --color-border: rgba(255, 255, 255, 0.06);
}
```

### **Component Usage**

```css
.button-primary {
  background: var(--color-brand);
  /* Changes automatically with theme */
}

.card {
  background: var(--bg-surface);
  border-color: var(--color-border);
}

.ai-signal {
  color: var(--color-ai-signal);
}
```

---

## 🔌 INTEGRATION CHECKLIST

### **Phase 1: Setup (Before Implementation)**
- [ ] Create theme context provider
- [ ] Set up CSS variables
- [ ] Create ThemeToggle component
- [ ] Create AIDustLayer component
- [ ] Set up Supabase migration (add `theme_preference` to `user_profiles`)

### **Phase 2: Integration (Implementation)**
- [ ] Wrap app with ThemeProvider
- [ ] Add ThemeToggle to navbar
- [ ] Add AIDustLayer to root layout
- [ ] Replace hardcoded colors with CSS variables
- [ ] Test animation 250ms slide
- [ ] Test localStorage persistence
- [ ] Test user account persistence

### **Phase 3: Validation (Testing)**
- [ ] Test on mobile (dust disabled?)
- [ ] Test on low-end Android
- [ ] Test `prefers-reduced-motion`
- [ ] Test localStorage → account migration
- [ ] Test theme switching (all transitions smooth?)
- [ ] Check console for selector fallback warnings
- [ ] Performance profiling (60fps target)
- [ ] Memory leak check (DevTools heap)

### **Phase 4: Deployment**
- [ ] A/B test with 10% of users
- [ ] Monitor engagement metrics
- [ ] Monitor for performance regressions
- [ ] Collect user feedback
- [ ] Gradual rollout to 100%

---

## 📊 DESIGN DECISIONS LOCKED

| Decision | Status | Rationale |
|---|---|---|
| **Teal as primary brand (dark mode)** | ✅ LOCKED | Exam psychology: calming, focus-first, differentiates from competitors |
| **Lighter teal for AI signals** | ✅ LOCKED | Ambient intelligence: subtle glow, not aggressive |
| **Semantic colors (green/amber/rose)** | ✅ LOCKED | Clear visual feedback for study progress |
| **250ms slide animation** | ✅ LOCKED | Fast enough to feel snappy, slow enough to see transition |
| **Left-to-right slide** | ✅ LOCKED | Directional consistency |
| **Pitch black background** | ✅ LOCKED | AMOLED-like darkness, premium feel |
| **AI Dust idle at 5s** | ✅ LOCKED | Balance between ambient presence and non-distraction |
| **Dust disabled on /ask-ai** | ✅ LOCKED | Prevent distraction during study |
| **localStorage → account sync** | ✅ LOCKED | Seamless unauthenticated → authenticated flow |

---

## ✅ READY FOR IMPLEMENTATION

**All specifications are finalized and locked.**

**Next Step:** User signals "implement" → Begin Phase 1 setup

---

## 📞 QUESTIONS / CLARIFICATIONS

**Before implementation**, verify:
1. `.chat-area` class exists in Ask AI page template
2. Supabase migration path confirmed
3. React context/provider architecture approved
4. Animation performance acceptable on target devices

---

**Document Status:** ✅ COMPLETE & LOCKED  
**Date:** May 3, 2026  
**Ready to implement:** YES
