// ─── Design System Tokens ────────────────────────────────────────────────────
// Single source of truth for all visual constants.
// Import these instead of hardcoding hex values in components.

export const colors = {
  brand: {
    DEFAULT:  '#7c3aed',
    dark:     '#6d28d9',
    light:    '#8b5cf6',
    xlight:   '#a78bfa',
    glow:     'rgba(124,58,237,0.15)',
    glowHard: 'rgba(124,58,237,0.30)',
  },
  surface: {
    base:     '#0a0a0a',
    card:     '#0f172a',
    elevated: '#111827',
    raised:   '#1e293b',
    overlay:  'rgba(10,10,10,0.80)',
  },
  border: {
    subtle:  '#1a1f2e',
    default: '#1e293b',
    strong:  '#2d3748',
    active:  '#7c3aed',
  },
  text: {
    primary:   '#f1f5f9',
    secondary: '#94a3b8',
    muted:     '#475569',
    faint:     '#334155',
    inverted:  '#0a0a0a',
  },
  accent: {
    green:  { DEFAULT: '#22c55e', dark: '#16a34a', glow: 'rgba(34,197,94,0.15)',  glowHard: 'rgba(34,197,94,0.25)'  },
    orange: { DEFAULT: '#f97316', dark: '#ea580c', glow: 'rgba(249,115,22,0.15)', glowHard: 'rgba(249,115,22,0.25)' },
    red:    { DEFAULT: '#ef4444', dark: '#dc2626', glow: 'rgba(239,68,68,0.15)',  glowHard: 'rgba(239,68,68,0.25)'  },
    blue:   { DEFAULT: '#3b82f6', dark: '#2563eb', glow: 'rgba(59,130,246,0.15)', glowHard: 'rgba(59,130,246,0.25)' },
    amber:  { DEFAULT: '#f59e0b', dark: '#d97706', glow: 'rgba(245,158,11,0.15)', glowHard: 'rgba(245,158,11,0.25)' },
  },
};

export const radius = {
  xs:   '6px',
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '20px',
  '2xl':'24px',
  full: '9999px',
};

export const space = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};

export const type = {
  xs:   { fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px' },
  sm:   { fontSize: '12px', fontWeight: 400 },
  base: { fontSize: '14px', fontWeight: 400 },
  md:   { fontSize: '15px', fontWeight: 500 },
  lg:   { fontSize: '17px', fontWeight: 600 },
  xl:   { fontSize: '20px', fontWeight: 700 },
  '2xl':{ fontSize: '24px', fontWeight: 700 },
  hero: { fontSize: '38px', fontWeight: 800, letterSpacing: '-0.5px' },
};

// ─── Motion Presets ───────────────────────────────────────────────────────────
export const motion = {
  // Framer Motion transition objects
  fast:    { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  default: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  slow:    { duration: 0.38, ease: [0.4, 0, 0.2, 1] },
  spring:  { type: 'spring', stiffness: 420, damping: 30 },
  springBounce: { type: 'spring', stiffness: 320, damping: 20 },

  // Common initial/animate pairs
  fadeUp: {
    initial:   { opacity: 0, y: 12 },
    animate:   { opacity: 1, y: 0  },
    exit:      { opacity: 0, y: -8 },
    transition:{ duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
  fadeIn: {
    initial:   { opacity: 0 },
    animate:   { opacity: 1 },
    exit:      { opacity: 0 },
    transition:{ duration: 0.18 },
  },

  // Stagger helper — pass child index
  stagger: (i = 0, base = 0.06) => ({ delay: i * base }),
};

// ─── Shadow / Glow helpers ────────────────────────────────────────────────────
export const shadow = {
  card:     '0 4px 24px rgba(0,0,0,0.45)',
  cardHigh: '0 8px 40px rgba(0,0,0,0.55)',
  brand:    `0 0 24px ${colors.brand.glow}`,
  green:    `0 0 20px ${colors.accent.green.glow}`,
  orange:   `0 0 20px ${colors.accent.orange.glow}`,
  red:      `0 0 20px ${colors.accent.red.glow}`,
  blue:     `0 0 20px ${colors.accent.blue.glow}`,
};

// ─── Gradient helpers ─────────────────────────────────────────────────────────
export const gradient = {
  brand:  `linear-gradient(135deg, ${colors.brand.DEFAULT}, ${colors.brand.dark})`,
  subtle: `linear-gradient(160deg, #0f172a 0%, #0a0a0a 100%)`,
  cardBg: `linear-gradient(160deg, #0d1117 0%, #0a0f1a 100%)`,
  green:  `linear-gradient(135deg, #064e3b, #065f46)`,
  orange: `linear-gradient(135deg, #431407, #1c0a02)`,
  hero:   `linear-gradient(135deg, ${colors.brand.DEFAULT} 0%, #4f46e5 100%)`,
};
