"use client";
import { SKELETON_KEYFRAMES, shimmerStyle, pulseStyle } from "@/lib/skeletonStyles";

// Brain-map skeleton mirrors the header + filter chips + graph canvas layout.
function SkLine({ w = "100%", h = 14, d = 0, mb = 0 }) {
  return <div style={{ ...shimmerStyle({ animationDelay: `${d}ms` }), width: w, height: h, borderRadius: 8, marginBottom: mb, flexShrink: 0 }} />;
}

export default function Loading() {
  return (
    <>
      <style>{SKELETON_KEYFRAMES}</style>
      <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-base)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-hairline)", display: "flex", alignItems: "center", gap: 16, ...pulseStyle(0) }}>
          <SkLine w={80} h={14} />
          <SkLine w={160} h={20} />
        </div>
        {/* Filter chips */}
        <div style={{ padding: "12px 20px", display: "flex", gap: 8, ...pulseStyle(60) }}>
          {[80, 90, 70, 85].map((w, i) => (
            <div key={i} style={{ width: w, height: 30, borderRadius: 16, background: "var(--bg-surface)", border: "1px solid var(--border-hairline)" }} />
          ))}
        </div>
        {/* Graph canvas */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", ...pulseStyle(120) }}>
          {/* Simulated concept nodes */}
          {[
            { x: "20%", y: "35%", w: 90, h: 32 }, { x: "50%", y: "20%", w: 110, h: 32 },
            { x: "72%", y: "42%", w: 80,  h: 32 }, { x: "38%", y: "60%", w: 100, h: 32 },
            { x: "62%", y: "68%", w: 85,  h: 32 }, { x: "15%", y: "68%", w: 95,  h: 32 },
          ].map((n, i) => (
            <div key={i} style={{
              position: "absolute", left: n.x, top: n.y, width: n.w, height: n.h,
              borderRadius: 10, border: "1px solid var(--border-hairline)",
              background: "var(--bg-surface)", ...pulseStyle(150 + i * 35),
            }} />
          ))}
        </div>
      </div>
    </>
  );
}
