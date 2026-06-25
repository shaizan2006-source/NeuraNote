"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PHASE_UI = {
  t30: {
    gradient: "var(--bg-base)",
    accent: "var(--accent)",
    icon: "30",
    subtitle: "days to exam",
  },
  t7: {
    gradient: "var(--bg-base)",
    accent: "var(--warning)",
    icon: "7",
    subtitle: "days left",
  },
  t1: {
    gradient: "var(--bg-base)",
    accent: "var(--error)",
    icon: "1",
    subtitle: "day left",
  },
  t0: {
    gradient: "var(--bg-base)",
    accent: "var(--success)",
    icon: "★",
    subtitle: "exam day",
  },
};

export default function ExamTransitionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exam/phase")
      .then(r => r.json())
      .then(d => setPhase(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>Loading…</div>;
  }

  if (!phase || phase.phase === "normal") {
    router.replace("/dashboard");
    return null;
  }

  const ui = PHASE_UI[phase.phase] ?? PHASE_UI.t7;
  const config = phase.config ?? {};

  return (
    <div style={{ minHeight: "100vh", background: ui.gradient, color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 480, width: "100%", padding: 32, textAlign: "center" }}>
        {/* Countdown circle */}
        <div style={{ width: 120, height: 120, borderRadius: "50%", border: `3px solid ${ui.accent}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", flexDirection: "column" }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: ui.accent, lineHeight: 1 }}>{ui.icon}</span>
          <span style={{ fontSize: 11, color: ui.accent, marginTop: 2 }}>{ui.subtitle}</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          {phase.exam_type?.replace(/_/g, " ").toUpperCase()} {phase.phase === "t0" ? "— Today" : `in ${phase.days_left} day${phase.days_left === 1 ? "" : "s"}`}
        </h1>

        {config.banner && (
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 28, maxWidth: 380, margin: "0 auto 28px" }}>
            {config.banner}
          </p>
        )}

        {/* Today's focus breakdown */}
        {config.study_ratio && (
          <div style={{ background: "var(--bg-surface-2)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Today's Focus</div>
            {Object.entries(config.study_ratio).filter(([, v]) => v > 0).map(([key, val]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>{key}</span>
                  <span style={{ fontSize: 12, color: ui.accent }}>{Math.round(val * 100)}%</span>
                </div>
                <div style={{ height: 4, background: "var(--border-strong)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${val * 100}%`, background: ui.accent, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: ui.accent, color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Start Studying
          </button>
          {config.show_mock_cta && (
            <button onClick={() => router.push("/mock-test")} style={{ background: "var(--bg-surface-2)", color: "var(--text-primary)", border: `1px solid color-mix(in srgb, ${ui.accent} 25%, transparent)`, borderRadius: 8, padding: "12px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Take a Mock Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}