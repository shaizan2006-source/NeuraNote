# Dashboard Pixel-Match Enhancement — Design Spec

**Date:** 2026-05-01  
**Approach:** Enhance existing `.jsx` files in-place (no TypeScript conversion, no Tailwind migration)  
**Target:** Match the provided dashboard screenshot pixel-accurately with smooth animations

---

## Scope

Enhance four files only:
- `src/components/dashboard/StudyModeCards.jsx` — primary target (3 cards changed)
- `src/components/dashboard/AskAIHeroCard.jsx` — minor hover tweak

No changes to: `BentoGrid.jsx`, `GreetingRow.jsx`, `DashboardSidebar.jsx`, `ExamSection.jsx`, `FocusModeSection.jsx`, `DashboardContext.jsx`, any API routes.

---

## 1. FocusModeCard — Dot Ring Design

**Replace** the current solid SVG stroke ring with a **36-dot segmented ring**.

### Visual structure
- 36 `<circle>` dots, each `r="3"`, arranged at 10° intervals on a radius-42 circle around centre (50,50)
- Active dot count = `Math.round((timeLeft / totalSecs) * 36)` — proportional to time remaining
- Active dots: cyan `#22d3ee`, opacity fades linearly from `1.0` (first dot) → `0.3` (last active dot)
- Inactive dots: `rgba(255,255,255,0.08)`
- At 25:00 (full): all 36 dots active. At 0:00: all 36 inactive.

### Animations (all Framer Motion)
1. **Ambient glow blob** — `position:absolute` radial-gradient `rgba(34,211,238,0.12)`, `animate={{ opacity: [0.3, 0.65, 0.3] }}`, `transition={{ duration: 3, repeat: Infinity }}`
2. **Outer pulsing ring** — `position:absolute inset:-14px`, `border: 1.5px solid rgba(34,211,238,0.15)`, `animate={{ scale: [1,1.2,1], opacity: [0.4,0,0.4] }}`, `transition={{ duration: 2.2, repeat: Infinity }}`
3. **Inner pulsing ring** — same as outer but `inset:-6px`, `rgba(34,211,238,0.22)`, delay `0.35s`
4. **Dot glow** — active dots get `filter: drop-shadow(0 0 3px #22d3ee)` on the SVG element

### Timer display (inside ring)
- Time: `fontSize: 20, fontWeight: 800, color: #f4f4f5, letterSpacing: -0.5px`
- Label: `fontSize: 8, color: #22d3ee, fontWeight: 600` (cyan, not grey)

### Hover / tap
```js
whileHover={{ scale: 1.04, y: -4, boxShadow: "0 0 40px rgba(34,211,238,0.25)" }}
whileTap={{ scale: 0.97 }}
```

---

## 2. QuizCard — 3D Stacked Flashcards Visual

**Add** a stacked card visual in the `flex:1` space between header and count.

### Three-layer card stack (positioned `right:0`)
| Layer | offset | rotation | opacity | color |
|-------|--------|----------|---------|-------|
| Back  | `right:6px top:6px` | `rotate(8deg)` | `0.6` | `linear-gradient(135deg,#4f46e5,#7c3aed)` |
| Mid   | `right:2px top:2px` | `rotate(3deg)` | `0.75` | `linear-gradient(135deg,#6366f1,#8b5cf6)` |
| Front | `right:0 top:0` | `0deg` | `1.0` | `linear-gradient(135deg,#7c3aed,#a855f7)` |

- Each card: `width:52px, height:66px, borderRadius:8px`
- Front card: `boxShadow: 0 4px 16px rgba(124,58,237,0.4)`
- All three show a `?` character: `fontSize:24px, color:rgba(255,255,255,0.85)`
- Container: `position:relative, width:70px, height:72px`
- Placed inside a `div` with `flex:1, display:flex, alignItems:flex-start, justifyContent:flex-end` so it sits top-right, count (`0 cards ready`) remains pinned at the bottom of the card

### Entry animation
```js
initial={{ opacity: 0, y: 8, rotate: 5 }}
animate={{ opacity: 1, y: 0, rotate: 0 }}
transition={{ duration: 0.5, ease: "easeOut" }}
```

### Hover / tap
```js
whileHover={{ scale: 1.04, y: -4, boxShadow: "0 0 40px rgba(99,102,241,0.25)" }}
whileTap={{ scale: 0.97 }}
```

---

## 3. CallTutorCard — Larger Mic Orb

**Scale up** the mic orb from `54px` → `80px` diameter and enlarge the pulsing rings proportionally.

### Orb
```js
width: 80, height: 80, borderRadius: "50%"
background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))"
border: "2px solid rgba(34,197,94,0.45)"
```

### Pulsing rings
- Outer ring: `inset: -18px`, `animate={{ scale:[1,1.35,1], opacity:[0.25,0,0.25] }}`, `duration:2.2`
- Inner ring: `inset: -8px`, `animate={{ scale:[1,1.18,1], opacity:[0.4,0.05,0.4] }}`, `delay:0.35`

### Mic SVG inside orb
- `width:28, height:28` (up from 22)

### Hover / tap
```js
whileHover={{ scale: 1.04, y: -4, boxShadow: "0 0 40px rgba(34,197,94,0.2)" }}
whileTap={{ scale: 0.97 }}
```

---

## 4. AskAIHeroCard — Hover Polish

Update `whileHover` from current `scale:1.01, y:-2` to:
```js
whileHover={{ scale: 1.02, y: -3, boxShadow: "0 0 50px rgba(139,92,246,0.3)" }}
whileTap={{ scale: 0.98 }}
```

---

## 5. ExamsCard — Hover (currently missing tap)

Add:
```js
whileTap={{ scale: 0.97 }}
```

Existing `whileHover` on ExamsCard is already correct.

---

## Unchanged Components

| Component | Status |
|-----------|--------|
| DashboardSidebar | ✅ matches image |
| GreetingRow | ✅ matches image |
| BentoGrid layout | ✅ matches image |
| AskAIHeroCard content | ✅ matches image (hover only changed) |
| FocusModeSection (full page) | ✅ untouched |
| ExamSection (full page) | ✅ untouched |

---

## Animation Design Language

All 4 small cards share these Framer Motion values for visual consistency:

| Property | Value |
|----------|-------|
| Entry | `initial={{ opacity:0, y:20 }}` `animate={{ opacity:1, y:0 }}` |
| Hover scale | `1.04` |
| Hover y | `-4px` |
| Tap scale | `0.97` |
| Hover glow | per-card accent colour at ~0.2–0.25 opacity |
| Transition | `duration:0.4, ease:"easeOut"` |

---

## Out of Scope

- No TypeScript conversion
- No Tailwind migration
- No new API routes
- No changes to DashboardContext, Supabase queries, or auth
- No changes to any page outside `/dashboard`
