"use client";

/**
 * PremiumMark — the unique mark for Pro / premium surfaces. A brilliant-cut
 * gemstone in champagne-gold (Obsidian & Aurum), replacing the generic 👑 emoji.
 * Inline SVG, tokens-only. Pass `glow` for a soft halo on hero placements.
 */
export default function PremiumMark({ size = 16, glow = false }) {
  return (
    <span style={{ display: "inline-flex", position: "relative", lineHeight: 0 }}>
      {glow && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-40%",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--accent-glow-soft) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ position: "relative" }}
      >
        {/* gem body */}
        <path
          d="M4 9 L8 4 H16 L20 9 L12 20 Z"
          fill="color-mix(in srgb, var(--accent) 18%, transparent)"
          stroke="var(--accent)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* facets */}
        <path
          d="M4 9 H20 M8 4 L8 9 M16 4 L16 9 M8 9 L12 20 M16 9 L12 20"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
    </span>
  );
}
