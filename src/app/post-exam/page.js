"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_TARGETS = [
  { id: "jee_advanced", label: "JEE Advanced" },
  { id: "neet_ug", label: "NEET UG" },
  { id: "boards", label: "Board Exams" },
  { id: "gap_year", label: "Gap Year Prep" },
  { id: "break", label: "Take a break" },
];

export default function PostExamPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  async function handleConfirm() {
    if (!selected) return;
    if (selected === "break") { router.push("/dashboard"); return; }
    setSaving(true);
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next_exam: selected, reset_streak: false }),
    });
    setSaving(false);
    setStep(2);
  }

  if (step === 2) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 420, textAlign: "center", padding: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>New target set!</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: 28 }}>Your study plan has been refreshed. Let's go.</p>
          <button onClick={() => router.push("/dashboard")} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 460, width: "100%", padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>Exam complete</h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 14, textAlign: "center", marginBottom: 28 }}>
          You put in the work. Whatever the result — that matters.
        </p>

        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          What's next for you?
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {NEXT_TARGETS.map(t => (
            <button key={t.id} onClick={() => setSelected(t.id)} style={{
              background: selected === t.id ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
              border: `1px solid ${selected === t.id ? "var(--accent-dim)" : "var(--border-hairline)"}`,
              borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
              color: "var(--text-primary)", cursor: "pointer", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: selected === t.id ? "var(--accent-bright)" : "var(--text-secondary)" }}>{t.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{
            width: "100%", background: selected ? "var(--accent-grad)" : "var(--bg-surface-2)",
            color: selected ? "var(--bg-base)" : "var(--text-disabled)", border: "none", borderRadius: 8,
            padding: "13px", fontWeight: 700, fontSize: 15, cursor: selected ? "pointer" : "default",
            transition: "all 0.15s",
          }}
        >
          {saving ? "Saving…" : "Confirm →"}
        </button>
      </div>
    </div>
  );
}