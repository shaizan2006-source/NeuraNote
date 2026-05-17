"use client";
import BriefingPlayer from "@/components/briefings/BriefingPlayer";

export default function MorningMode({ userName, examName, daysLeft, children }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 16,
      }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#C4B5FD" }}>
          Good morning, {userName}.
        </p>
        {examName && daysLeft != null && (
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#9CA3AF" }}>
            {examName} — <span style={{ color: "#A78BFA", fontWeight: 600 }}>{daysLeft} days</span> to go.
          </p>
        )}
      </div>
      <BriefingPlayer />
      {children}
    </div>
  );
}
