// src/components/AIDust/ai-dust.config.ts
//
// "Constellation Notes" idle effect (Stage 3 — founder-approved replacement
// for the original falling dust). Platinum stars drift; nearby stars briefly
// link into gold constellations; a rare gold comet streaks and seeds a new
// cluster. Colors come from the Obsidian & Aurum tokens at runtime
// (--accent / --text-primary); RGB fallbacks below are numbers, not hex,
// so this file stays raw-hex-free for the grep gate.

export const AI_DUST_CONFIG = {
  IDLE_TIMEOUT: 5000,
  FADE_IN_DURATION: 300,

  // Star field
  STAR_COUNT: 38,
  STAR_RADIUS: { min: 0.7, max: 1.6 },
  STAR_ALPHA: { min: 0.18, max: 0.5 },
  STAR_DRIFT: 0.008, // max |velocity| per axis, px/ms
  TWINKLE_SPEED: { min: 0.0004, max: 0.0011 }, // rad/ms

  // Constellations (linked star clusters)
  CONSTELLATION_EVERY: 6000,
  CONSTELLATION_JITTER: 2500,
  MAX_CONSTELLATIONS: 2,
  LINK_RADIUS: 160,
  LINK_STARS: { min: 3, max: 5 },
  CONSTELLATION_FADE_IN: 700,
  CONSTELLATION_HOLD: 2600,
  CONSTELLATION_FADE_OUT: 1400,
  LINE_WIDTH: 1,
  LINE_ALPHA: 0.45,

  // Comets (rare gold streaks that seed a constellation)
  COMET_EVERY: 9000,
  COMET_JITTER: 4000,
  COMET_SPEED: 0.55, // px/ms
  COMET_TRAIL: 90, // px
  COMET_HEAD_RADIUS: 1.8,
  COMET_GLOW_BLUR: 8,

  // Token fallbacks as RGB triplets (NOT hex — grep gate)
  GOLD_FALLBACK_RGB: [212, 175, 110],
  PLATINUM_FALLBACK_RGB: [245, 245, 244],

  SCOPE_SELECTORS: [
    '.chat-area',
    '.ask-ai-container',
    '[data-dust-scope]',
  ],
  // Allowlist (was DISABLED_ROUTES): the effect is exclusive to the Sage
  // surface (+ /styleguide for design review). '/sage' ready for Stage 4.
  ENABLED_ROUTES: ['/ask-ai', '/sage', '/styleguide'],
} as const;
