// src/lib/styles.js

// Obsidian & Aurum palette. LITERAL values (not var()) because these are
// consumed in <canvas> contexts (e.g. TimerRing ctx.strokeStyle) where CSS
// custom properties don't resolve. Mirrors src/styles/variables.css.
export const COLORS = {
  bg: {
    dark: '#08080A',          // --bg-base
    darkGradient: '#0E0E11',  // --bg-elevated
    card: 'rgba(255,255,255,0.025)',
    cardHover: 'rgba(255,255,255,0.04)',
    accentLight: 'rgba(212,175,110,0.1)',   // gold tint (was violet)
    accentHover: 'rgba(212,175,110,0.15)',
  },
  text: {
    primary: '#F5F5F4',    // --text-primary
    secondary: '#A1A1A6',  // --text-secondary
    disabled: '#46464B',   // --text-disabled
    accent: '#D4AF6E',     // --accent (was violet)
  },
  accent: {
    purple: '#D4AF6E',     // --accent (gold; key name kept for compatibility)
    purpleDark: '#9A7E44', // --accent-dim
    cyan: '#EACF96',       // --accent-bright (was cyan)
    green: '#34D399',      // --success
  },
  border: {
    light: 'rgba(255,255,255,0.06)',   // --border-hairline
    lighter: 'rgba(255,255,255,0.08)',
    accent: 'rgba(212,175,110,0.3)',   // gold border (was violet)
  },
};

export const TYPOGRAPHY = {
  fontFamily: "'Inter', sans-serif",
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  sizes: {
    heading: '18px',
    subheading: '14px',
    body: '13px',
    label: '12px',
    caption: '11px',
    small: '10px',
  },
};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '28px',
};

export const RADIUS = {
  sm: '10px',
  md: '14px',
  lg: '20px',
};

export const SHADOWS = {
  button: '0 4px 22px rgba(212,175,110,0.32)', // gold (was violet)
  card: '0 0 40px rgba(212,175,110,0.1)',      // gold (was violet)
  glow: '0 0 8px rgba(52,211,153,0.7)',        // --success green
};
