"use client";
import { useState } from "react";
import { normalizeOptions, normalizeCorrectKey } from "@/lib/pyqs/normalizeQuestion";

export default function TryYourselfClient({ options, correctAnswer, solution }) {
  const opts = normalizeOptions(options);
  const correctKey = normalizeCorrectKey(correctAnswer, opts);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Choose an answer</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {opts.map((opt) => {
          const isCorrect = revealed && opt.key === correctKey;
          const isWrong = revealed && selected === opt.key && !isCorrect;
          const isSelected = selected === opt.key;
          return (
            <button key={opt.key} onClick={() => !revealed && setSelected(opt.key)} style={{
              background: isCorrect ? "color-mix(in srgb, var(--success) 12%, transparent)" : isWrong ? "color-mix(in srgb, var(--error) 12%, transparent)" : isSelected ? "var(--bg-surface-2)" : "var(--bg-surface)",
              border: `1px solid ${isCorrect ? "color-mix(in srgb, var(--success) 40%, transparent)" : isWrong ? "color-mix(in srgb, var(--error) 40%, transparent)" : isSelected ? "var(--border-strong)" : "var(--border-hairline)"}`,
              borderRadius: 8, padding: "10px 14px", textAlign: "left", color: "var(--text-secondary)", fontSize: 14,
              cursor: revealed ? "default" : "pointer", width: "100%",
            }}>
              <span style={{ fontWeight: 700, marginRight: 8 }}>{opt.key}.</span>{opt.text}
            </button>
          );
        })}
      </div>
      {!revealed && selected && (
        <button onClick={() => setRevealed(true)} style={{
          background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8,
          padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 13,
        }}>
          Check Answer
        </button>
      )}
      {revealed && solution && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 10, padding: "16px 20px", marginTop: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Solution</div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{solution}</p>
        </div>
      )}
    </div>
  );
}