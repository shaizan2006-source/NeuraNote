"use client";
import BriefingPlayer from "@/components/briefings/BriefingPlayer";

export default function MorningMode({ userName, examName, daysLeft, children }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, transparent) 0%, var(--bg-surface) 100%)",
        border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 16,
      }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
          Good morning, {userName}.
        </p>
        {examName && daysLeft != null && (
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            {examName} — <span style={{ color: "var(--accent)", fontWeight: 600 }}>{daysLeft} days</span> to go.
          </p>
        )}
      </div>
      <BriefingPlayer />
      {children}
    </div>
  );
}
