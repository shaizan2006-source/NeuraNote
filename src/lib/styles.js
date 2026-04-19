// src/lib/styles.js

export const COLORS = {
  bg: {
    dark: '#060910',
    darkGradient: '#0c1024',
    card: 'rgba(255,255,255,0.025)',
    cardHover: 'rgba(255,255,255,0.04)',
    accentLight: 'rgba(139,92,246,0.1)',
    accentHover: 'rgba(139,92,246,0.15)',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#334155',
    disabled: '#1e293b',
    accent: '#a78bfa',
  },
  accent: {
    purple: '#7c3aed',
    purpleDark: '#6d28d9',
    cyan: '#22D3EE',
    green: '#22c55e',
  },
  border: {
    light: 'rgba(255,255,255,0.06)',
    lighter: 'rgba(255,255,255,0.08)',
    accent: 'rgba(139,92,246,0.3)',
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
  button: '0 4px 22px rgba(124,58,237,0.32)',
  card: '0 0 40px rgba(139,92,246,0.1)',
  glow: '0 0 8px rgba(34,197,94,0.7)',
};
