"use client";

import { useRouter } from "next/navigation";

export default function VoiceCallSection() {
  const router = useRouter();

  return (
    <div id="section-voice" style={{
      background:   "#0b1120",
      borderRadius: 20,
      padding:      "28px 24px",
      marginTop:    24,
      border:       "1px solid #1e3a5f",
    }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: "white", margin: 0, fontSize: 18, fontWeight: 700 }}>
          📞 Voice AI Tutor
        </h3>
        <p style={{ color: "var(--text-muted)", margin: "5px 0 0", fontSize: 13 }}>
          Talk to your personal IIT-level professor — solve any doubt instantly
        </p>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => router.push("/call-tutor")}
          style={{
            padding:      "14px 40px",
            borderRadius: 50,
            fontSize:     15,
            fontWeight:   700,
            cursor:       "pointer",
            border:       "none",
            background:   "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            color:        "white",
            boxShadow:    "0 0 28px rgba(124,58,237,0.4)",
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            transition:   "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "scale(1.04)";
            e.currentTarget.style.boxShadow = "0 0 40px rgba(124,58,237,0.55)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 0 28px rgba(124,58,237,0.4)";
          }}
        >
          📞 Call AI Tutor
        </button>
      </div>

      {/* ── How it works ─────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        gap:            16,
        marginTop:      20,
        justifyContent: "center",
        flexWrap:       "wrap",
      }}>
        {[
          ["🎤", "Speak your doubt"],
          ["🧠", "AI understands"],
          ["🎓", "Professor explains"],
          ["🔁", "Ask follow-ups"],
        ].map(([icon, label]) => (
          <div key={label} style={{ textAlign: "center", minWidth: 72 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
