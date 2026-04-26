/**
 * Design Tokens — single source of truth for spacing, color, type, motion.
 *
 * Rules:
 *   - Every new page/component imports from here. No magic numbers.
 *   - Existing inline-styled pages are NOT refactored pre-emptively — they
 *     migrate naturally as they're touched.
 *   - Adding a token? It belongs here only if it's used in ≥2 places.
 */

// ── Color ────────────────────────────────────────────────────────────────────
// Semantic names. Never reference raw hex in components.
export const color = {
  // Surfaces
  bg:           '#0A0A0A',
  bgGradientTo: '#111111',
  surface1:     'rgba(255,255,255,0.03)',   // barely-there lift (TaskCanvas)
  surface2:     'rgba(255,255,255,0.05)',   // dock, glass cards
  surface3:     'rgba(255,255,255,0.08)',   // hover, active
  surfaceInk:   '#111111',                  // solid raised surface

  // Hairlines
  border1:      'rgba(255,255,255,0.04)',   // ghost dividers
  border2:      'rgba(255,255,255,0.08)',   // component borders
  border3:      'rgba(255,255,255,0.12)',   // hover borders

  // Text
  textPrimary:   '#e4e4e7',
  textSecondary: '#94a3b8',
  textTertiary:  '#52525b',
  textInverse:   '#0A0A0A',

  // Brand (semantic — use sparingly)
  brand:         '#8B5CF6',                 // purple — user identity/actions
  brandSoft:     'rgba(139,92,246,0.12)',
  brandGlow:     'rgba(139,92,246,0.35)',

  ai:            '#22D3EE',                 // cyan — AI presence only
  aiSoft:        'rgba(34,211,238,0.10)',
  aiGlow:        'rgba(34,211,238,0.35)',

  // State (muted — never punitive)
  success:       '#22c55e',
  successSoft:   'rgba(34,197,94,0.10)',
  warn:          '#f59e0b',
  warnSoft:      'rgba(245,158,11,0.10)',
  danger:        '#ef4444',
  dangerSoft:    'rgba(239,68,68,0.10)',

  // Focus ring (cyan 2px outside offset — never remove)
  focusRing:     '#22D3EE',
};

// ── Spacing (8px baseline) ──────────────────────────────────────────────────
// Never write "padding: 14px" in a new component. Use space.3 (12) or space[3.5] (14).
export const space = {
  0:   0,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  3.5: 14,
  4:   16,
  5:   20,
  6:   24,
  7:   32,
  8:   40,
  9:   48,
  10:  64,
  11:  80,
  12:  96,
};

// ── Typography ──────────────────────────────────────────────────────────────
// Font stack: Inter throughout. No serif anywhere in the app.
export const fontFamily = {
  ui:   "'Inter', -apple-system, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

// Named type styles. Compose with fontFamily.ui.
// Format: { fontSize, lineHeight (unitless), fontWeight, letterSpacing? }
export const type = {
  display:       { fontSize: 22, lineHeight: 1.3,  fontWeight: 600 },
  title:         { fontSize: 18, lineHeight: 1.4,  fontWeight: 600 },
  prompt:        { fontSize: 18, lineHeight: 1.5,  fontWeight: 500 },
  body:          { fontSize: 16, lineHeight: 1.75, fontWeight: 400 },
  bodyEmphasis:  { fontSize: 16, lineHeight: 1.75, fontWeight: 500 },
  bodySmall:     { fontSize: 14, lineHeight: 1.6,  fontWeight: 400 },
  cta:           { fontSize: 14, lineHeight: 1,    fontWeight: 600 },
  meta:          { fontSize: 13, lineHeight: 1.4,  fontWeight: 400, color: color.textSecondary },
  micro:         { fontSize: 11, lineHeight: 1.4,  fontWeight: 500, color: color.textTertiary },
  eyebrow:       { fontSize: 11, lineHeight: 1.4,  fontWeight: 600, letterSpacing: '0.08em',
                   textTransform: 'uppercase',     color: color.textTertiary },
};

// ── Border radius ───────────────────────────────────────────────────────────
export const radius = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl':20,
  pill: 999,
};

// ── Shadows / glows ─────────────────────────────────────────────────────────
export const shadow = {
  none:  'none',
  sm:    '0 1px 2px rgba(0,0,0,0.2)',
  md:    '0 4px 12px rgba(0,0,0,0.25)',
  lg:    '0 8px 32px rgba(0,0,0,0.35)',
  brand: `0 0 0 3px ${color.brandSoft}, 0 2px 10px ${color.brandGlow}`,
  ai:    `0 0 0 3px ${color.aiSoft},    0 2px 10px ${color.aiGlow}`,
  focus: `0 0 0 2px ${color.focusRing}`,
};

// ── Motion ──────────────────────────────────────────────────────────────────
// Single easing for the whole app. No springs.
export const motion = {
  ease: {
    out:    'cubic-bezier(0.22, 1, 0.36, 1)',   // default (quartOut)
    inOut:  'cubic-bezier(0.65, 0, 0.35, 1)',
    linear: 'linear',
  },
  duration: {
    instant: 0,
    fast:    120,
    base:    200,
    med:     280,
    slow:    360,
    crossfade: 240,
    pageIn:    320,
    pulse:   1600,
  },
};

// ── Z-index scale ───────────────────────────────────────────────────────────
// Five layers. That's it. If you need a 6th, something is wrong.
export const z = {
  base:      0,
  raised:    10,
  sticky:    20,
  dock:      40,    // CoachDock, DeepWorkClock
  overlay:   60,    // CoachPanel, modals
  toast:     80,    // almost never used; we don't ship toasts
};

// ── Layout ──────────────────────────────────────────────────────────────────
export const layout = {
  readingColumn: 680,    // TaskCanvas, ReadTask body
  progressRail:  640,
  coachPanel:    380,
  headerHeight:  48,
  dockOffset:    28,     // peripheral widgets: distance from viewport edge
};

// ── Breakpoints ─────────────────────────────────────────────────────────────
export const bp = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1440,
};

export const media = {
  sm:   `@media (min-width: ${bp.sm}px)`,
  md:   `@media (min-width: ${bp.md}px)`,
  lg:   `@media (min-width: ${bp.lg}px)`,
  xl:   `@media (min-width: ${bp.xl}px)`,
  '2xl':`@media (min-width: ${bp['2xl']}px)`,
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
};
