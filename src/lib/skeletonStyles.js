// src/lib/skeletonStyles.js

export const SKELETON_KEYFRAMES = `
  @keyframes skeletonShimmer {
    0%   { background-position: -1000px 0; }
    100% { background-position:  1000px 0; }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
  }
  @keyframes skeletonProgressBuild {
    0%   { width: 0%; }
    100% { width: 35%; }
  }
  @keyframes skeletonDotPulse {
    0%, 20%, 50%, 80%, 100% { opacity: 0.4; }
    40%, 60%                { opacity: 1; }
  }
  @keyframes skeletonRingShimmer {
    0%   { stroke-dashoffset:  200; }
    100% { stroke-dashoffset: -200; }
  }
  @media (max-width: 1024px) {
    .sk-quiz-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .sk-bento-grid { grid-template-columns: 1fr !important; }
    .sk-bento-hero { grid-row: auto !important; }
  }
`;

export function shimmerStyle(overrides = {}) {
  return {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)',
    backgroundSize: '1000px 100%',
    animation: 'skeletonShimmer 1.8s linear infinite',
    ...overrides,
  };
}

export function pulseStyle(delayMs = 0, overrides = {}) {
  return {
    animation: `skeletonPulse 1.5s ease-in-out ${delayMs}ms infinite`,
    ...overrides,
  };
}
