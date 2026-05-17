"use client";
import { useRouter } from "next/navigation";

export default function ConceptSidePanel({ concept, onClose }) {
  const router = useRouter();
  if (!concept) return null;

  const mastery = concept.mastery ?? 0;
  const masteryLabel = mastery >= 0.8 ? "Mastered" : mastery >= 0.6 ? "Strong" : mastery >= 0.3 ? "Shaky" : "Unknown";
  const masteryColor = mastery >= 0.8 ? "#10B981" : mastery >= 0.6 ? "#F59E0B" : mastery >= 0.3 ? "#8B5CF6" : "#6B7280";

  return (
    <div style={{
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 280,
      background: "#111111",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      padding: 20,
      overflowY: "auto",
      zIndex: 10,
    }}>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 18, float: "right" }}>✕</button>

      <h3 style={{ color: "#F9FAFB", fontSize: 16, fontWeight: 600, marginBottom: 8, marginTop: 4 }}>
        {concept.label}
      </h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {concept.subject && (
          <span style={{ background: "rgba(139,92,246,0.2)", color: "#A78BFA", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
            {concept.subject}
          </span>
        )}
        <span style={{ background: `${masteryColor}22`, color: masteryColor, fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
          {masteryLabel}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Mastery</div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${mastery * 100}%`, background: masteryColor, borderRadius: 3 }} />
        </div>
      </div>

      <button
        onClick={() => router.push(`/focus?topic=${encodeURIComponent(concept.label)}`)}
        style={{
          width: "100%",
          background: "#8B5CF6",
          color: "#fff",
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
