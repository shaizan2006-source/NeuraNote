'use client';

const KEYFRAMES = `
  @keyframes ambiencePulse {
    from { opacity: 0.55; }
    to   { opacity: 1.0; }
  }
  @keyframes ambienceFloat {
    from { opacity: 0.35; transform: translateY(0px); }
    to   { opacity: 0.65; transform: translateY(-18px); }
  }
`;

/**
 * Deep Void ambient background for focus session screens.
 *
 * Drop this as the FIRST CHILD of any position:relative container
 * that already has a dark background. It renders three subtle purple
 * glow layers via CSS-only animations — no JS timers, no canvas,
 * no layout impact.
 *
 * The parent container must have:  position: 'relative', overflow: 'hidden'
 */
export default function FocusAmbience() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Layer 1 — Base horizon glow (static) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 90% 55% at 50% 110%, color-mix(in srgb, var(--accent) 28%, transparent) 0%, transparent 70%)',
      }} />

      {/* Layer 2 — Breathing pulse (6 s cycle) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 40% at 50% 115%, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 65%)',
        animation: 'ambiencePulse 6s ease-in-out infinite alternate',
      }} />

      {/* Layer 3 — Floating accent top-right (14 s cycle) */}
      <div style={{
        position: 'absolute',
        width: '30%',
        height: '30%',
        top: '3%',
        right: '8%',
        background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'ambienceFloat 14s ease-in-out infinite alternate',
      }} />
    </div>
  );
}
