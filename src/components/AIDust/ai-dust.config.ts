// src/components/AIDust/ai-dust.config.ts

export const AI_DUST_CONFIG = {
  IDLE_TIMEOUT: 5000,
  MAX_PARTICLES: 30,
  CREATION_RATE: 200,
  PARTICLE_SIZE: 2,
  DRIFT_VELOCITY_X: 0.5,
  DRIFT_VELOCITY_Y: { min: 0.3, max: 0.5 },
  PARTICLE_LIFETIME: 300,
  MIN_OPACITY: 0.2,
  MAX_OPACITY: 0.5,
  GLOW_PARTICLE_RATIO: 0.15,
  TEAL_COLOR:  'rgba(45, 212, 191, 0.6)',
  TEAL_GLOW:   'rgba(45, 212, 191, 0.4)',
  CYAN_COLOR:  'rgba(34, 211, 238, 0.6)',
  CYAN_GLOW:   'rgba(34, 211, 238, 0.4)',
  GLOW_SHADOW_BLUR: 4,
  FADE_IN_DURATION: 300,
  SCOPE_SELECTORS: [
    '.chat-area',
    '.ask-ai-container',
    '[data-dust-scope]',
  ],
  DISABLED_ROUTES: ['/ask-ai', '/my-pdfs'],
} as const;
