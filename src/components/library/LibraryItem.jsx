"use client";
import { useRouter } from "next/navigation";

const SUBJECT_ICONS = {
  physics: "⚛️", chemistry: "🧪", mathematics: "📐", math: "📐",
  biology: "🧬", history: "📜", economics: "📊", default: "📄",
};

function masteryColor(pct) {
  if (pct >= 80) return "var(--success)";
  if (pct >= 60) return "var(--warning)";
  if (pct >= 30) return "var(--accent)";
  return "var(--text-tertiary)";
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
      background: "var(--bg-surface)",
      border: "1px solid var(--border-hairline)",
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
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.name}
          </div>
          {doc.subject && (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, textTransform: "capitalize" }}>{doc.subject}</div>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-tertiary)" }}>
        {doc.page_count > 0 && <span>{doc.page_count}p</span>}
        {doc.concept_count > 0 && <span>{doc.concept_count} concepts</span>}
        {lastAsked && <span>Asked {lastAsked}</span>}
      </div>

      {/* Mastery bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Mastery</span>
          <span style={{ fontSize: 11, color: masteryColor(mastery), fontWeight: 600 }}>{mastery}%</span>
        </div>
        <div style={{ height: 4, background: "var(--border-hairline)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${mastery}%`, background: masteryColor(mastery), borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => router.push(`/sage?doc=${doc.id}`)} style={{
          flex: 1, background: "var(--accent)", color: "var(--bg-base)", border: "none",
          borderRadius: 6, padding: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Ask about this</button>
        <button onClick={() => router.push(`/quiz?doc=${doc.id}`)} style={{
          flex: 1, background: "var(--bg-surface-2)", color: "var(--text-primary)", border: "none",
          borderRadius: 6, padding: "7px", fontSize: 12, cursor: "pointer",
        }}>Quiz me</button>
      </div>
    </div>
  );
}
