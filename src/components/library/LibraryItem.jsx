"use client";
import { useRouter } from "next/navigation";

const SUBJECT_ICONS = {
  physics: "⚛️", chemistry: "🧪", mathematics: "📐", math: "📐",
  biology: "🧬", history: "📜", economics: "📊", default: "📄",
};

function masteryColor(pct) {
  if (pct >= 80) return "#10B981";
  if (pct >= 60) return "#F59E0B";
  if (pct >= 30) return "#8B5CF6";
  return "#6B7280";
}

export default function LibraryItem({ doc, onAsk }) {
  const router = useRouter();
  const icon = SUBJECT_ICONS[(doc.subject ?? "").toLowerCase()] ?? SUBJECT_ICONS.default;
  const mastery = Math.round((doc.mastery_score ?? 0) * 100);
  const lastAsked = doc.last_asked_at
    ? new Date(doc.last_asked_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#F9FAFB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.name}
          </div>
          {doc.subject && (
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, textTransform: "capitalize" }}>{doc.subject}</div>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#6B7280" }}>
        {doc.page_count > 0 && <span>{doc.page_count}p</span>}
        {doc.concept_count > 0 && <span>{doc.concept_count} concepts</span>}
        {lastAsked && <span>Asked {lastAsked}</span>}
      </div>

      {/* Mastery bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#6B7280" }}>Mastery</span>
          <span style={{ fontSize: 11, color: masteryColor(mastery), fontWeight: 600 }}>{mastery}%</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${mastery}%`, background: masteryColor(mastery), borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => router.push(`/ask-ai?doc=${doc.id}`)} style={{
          flex: 1, background: "#8B5CF6", color: "#fff", border: "none",
          borderRadius: 6, padding: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Ask about this</button>
        <button onClick={() => router.push(`/quiz?doc=${doc.id}`)} style={{
          flex: 1, background: "rgba(255,255,255,0.06)", color: "#E5E7EB", border: "none",
          borderRadius: 6, padding: "7px", fontSize: 12, cursor: "pointer",
        }}>Quiz me</button>
      </div>
    </div>
  );
}
