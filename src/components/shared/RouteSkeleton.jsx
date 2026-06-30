"use client";
import { SKELETON_KEYFRAMES, shimmerStyle, pulseStyle } from "@/lib/skeletonStyles";

function SkLine({ w = "100%", h = 14, d = 0, mb = 10 }) {
  return (
    <div style={{
      ...shimmerStyle({ animationDelay: `${d}ms` }),
      width: w, height: h, borderRadius: 8, marginBottom: mb, flexShrink: 0,
    }} />
  );
}

/**
 * RouteSkeleton — generic page-load skeleton for authed routes. `sidebar` matches pages that
 * have a left nav rail; otherwise the content centers like the standalone pages. Tokens only.
 */
export default function RouteSkeleton({ sidebar = true }) {
  return (
    <>
      <style>{SKELETON_KEYFRAMES}</style>
      <div aria-hidden="true" style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-base)" }}>
        {sidebar && (
          <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--border-hairline)", background: "var(--bg-surface)", ...pulseStyle(0) }} />
        )}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px",
          minWidth: 0, gap: 20,
          maxWidth: sidebar ? "none" : 820, margin: sidebar ? 0 : "0 auto", width: "100%",
        }}>
          <div style={{ ...pulseStyle(60) }}>
            <SkLine w="240px" h={26} mb={10} />
            <SkLine w="160px" h={13} mb={0} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{
                height: 116, borderRadius: 16, border: "1px solid var(--border-hairline)",
                background: "var(--bg-surface)", padding: 16, ...pulseStyle(120 + i * 40),
              }}>
                <SkLine w="55%" h={12} mb={14} />
                <SkLine w="80%" h={20} mb={0} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
