"use client";
import { useRouter } from "next/navigation";
import { masteryColor, masteryColorAlpha, masteryLabel } from "@/lib/masteryColor";

export default function ConceptSidePanel({ concept, onClose }) {
  const router = useRouter();
  if (!concept) return null;

  const mastery = concept.mastery ?? 0;

  return (
    <div style={{
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 280,
      background: "var(--bg-elevated)",
      borderLeft: "1px solid var(--border-hairline)",
      padding: 20,
      overflowY: "auto",
      zIndex: 10,
    }}>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 18, float: "right" }}>✕</button>

      <h3 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 600, marginBottom: 8, marginTop: 4 }}>
        {concept.label}
      </h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {concept.subject && (
          <span style={{ background: "color-mix(in srgb, var(--info) 20%, transparent)", color: "var(--info)", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
            {concept.subject}
          </span>
        )}
        <span style={{ background: masteryColorAlpha(mastery, 0.13), color: masteryColor(mastery), fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
          {masteryLabel(mastery)}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Mastery</div>
        <div style={{ height: 6, background: "var(--bg-surface-2)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${mastery * 100}%`, background: masteryColor(mastery), borderRadius: 3 }} />
        </div>
      </div>

      <button
        onClick={() => router.push(`/focus?topic=${encodeURIComponent(concept.label)}`)}
        style={{
          width: "100%",
          background: "var(--accent-grad)",
          color: "var(--bg-base)",
          border: "none",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 8,
        }}
      >
        Review now →
      </button>
    </div>
  );
}
