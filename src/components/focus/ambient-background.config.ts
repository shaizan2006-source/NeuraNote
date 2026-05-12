export const AMBIENT_CONFIG = {
  SCROLL_SELECTOR:      '.amn-focus-scroll',
  LERP:                 0.06,   // 0.03 = dreamlike · 0.12 = snappy
  FAR_PARALLAX:         0.03,   // 1000px scroll → 30px shift
  MID_PARALLAX:         0.07,   // 1000px scroll → 70px shift
  FAR_BREATHE_DURATION: '14s',
  MID_BREATHE_DURATION: '10s',
  MID_BREATHE_DELAY:    '3s',
} as const;
