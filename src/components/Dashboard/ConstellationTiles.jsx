"use client";

/**
 * Constellation Grid tiles (redesign Stage 6, founder-approved Option C).
 * New dashboard entry points: PYQ Bank → /pyqs, Brain Map → /brain-map.
 * Token-driven only; keyboard-reachable with gold focus ring.
 */

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const tileBase = {
  height: "100%",
  minHeight: 0,
  boxSizing: "border-box",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-hairline)",
  borderRadius: 16,
  padding: 18,
  position: "relative",
  overflow: "hidden",
  boxShadow: "var(--shadow-card)",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  textAlign: "left",
  width: "100%",
  fontFamily: "inherit",
};

const microStyle = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  position: "absolute",
  top: 12,
  left: 16,
};

function NodeTile({ onActivate, micro, children, ariaLabel }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onActivate}
      aria-label={ariaLabel}
      style={{ ...tileBase }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-hairline)"; }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card), 0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent)"; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
    >
      {micro && <span style={microStyle}>{micro}</span>}
      <span style={{ position: "absolute", right: 14, top: 12, color: "var(--text-tertiary)", fontSize: 13 }}>→</span>
      {children}
    </motion.button>
  );
}

export function PYQBankTile() {
  const router = useRouter();
  return (
    <NodeTile onActivate={() => router.push("/pyqs")} micro="· node" ariaLabel="Open PYQ Bank">
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
        PYQ Bank
      </h3>
      <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "var(--text-tertiary)" }}>
        1000+ official questions
      </p>
    </NodeTile>
  );
}

export function BrainMapTile({ conceptCount = null }) {
  const router = useRouter();
  return (
    <NodeTile onActivate={() => router.push("/brain-map")} micro="constellation" ariaLabel="Open Brain Map">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
            Brain Map
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "var(--text-tertiary)" }}>
            {conceptCount ? `${conceptCount} concepts linked` : "See your concepts connect"}
          </p>
        </div>
        <svg width="120" height="52" viewBox="0 0 150 64" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <line x1="18" y1="44" x2="58" y2="18" stroke="var(--accent)" strokeOpacity="0.5" />
          <line x1="58" y1="18" x2="102" y2="38" stroke="var(--accent)" strokeOpacity="0.5" />
          <line x1="102" y1="38" x2="136" y2="14" stroke="var(--accent)" strokeOpacity="0.5" />
          <circle cx="18" cy="44" r="3" fill="var(--accent-bright)" />
          <circle cx="58" cy="18" r="3" fill="var(--accent-bright)" />
          <circle cx="102" cy="38" r="3" fill="var(--accent-bright)" />
          <circle cx="136" cy="14" r="3" fill="var(--accent-bright)" />
        </svg>
      </div>
    </NodeTile>
  );
}

/**
 * The constellation underlay: gold hairlines + star nodes behind the grid.
 * Static SVG (percent coordinates, stretches with the grid), fades in once.
 * Hidden on mobile by the parent. Decorative only.
 */
export function ConstellationUnderlay() {
  // Node anchor points in grid-percent space (match BentoGrid areas)
  const nodes = {
    sage: [50, 9], focus: [12.5, 34], exams: [87.5, 34],
    brain: [50, 50], quiz: [12.5, 82], tutor: [50, 82], pyq: [87.5, 82],
  };
  // Medium intensity (founder-approved): links read clearly as a constellation
  // while staying calm. Sage's own links are strongest (it is "the spark").
  const links = [
    ["focus", "sage", 0.52], ["sage", "exams", 0.52], ["sage", "brain", 0.5],
    ["brain", "quiz", 0.42], ["brain", "pyq", 0.42], ["brain", "tutor", 0.44],
  ];
  const ambient = [[6, 12], [94, 10], [30, 64], [70, 64], [4, 94], [96, 94]];
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute", inset: -8, width: "calc(100% + 16px)", height: "calc(100% + 16px)",
        pointerEvents: "none", zIndex: 0, opacity: 0,
        animation: "amn-underlay-in 900ms ease-out 200ms forwards",
      }}
    >
      <style>{`
        @keyframes amn-underlay-in { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          svg[aria-hidden] { animation-duration: 0ms !important; }
        }
      `}</style>
      {links.map(([a, b, op], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="var(--accent)" strokeOpacity={op} strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {Object.values(nodes).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 0.45 : 0.32} fill="var(--accent-bright)" />
      ))}
      {ambient.map(([x, y], i) => (
        <circle key={`a${i}`} cx={x} cy={y} r="0.18" fill="var(--text-primary)" opacity="0.3" />
      ))}
    </svg>
  );
}
