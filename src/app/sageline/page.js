"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FLAGS } from "@/lib/featureFlags";
import { useSageLineCall } from "@/lib/sageline/useSageLineCall";
import { useActivePDF } from "@/hooks/useActivePDF";
import { LogoMark } from "@/components/brand/Logo";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const STATUS = {
  idle:        "Ready when you are",
  connecting:  "Connecting…",
  greeting:    "SageLine is greeting you…",
  listening:   "Listening — go ahead",
  thinking:    "Thinking…",
  speaking:    "SageLine is speaking… (just talk to interrupt)",
  wrapping_up: "Wrapping up…",
  ended:       "Call ended",
};

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function SageLinePage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [ready, setReady]   = useState(false);
  const [timer, setTimer]   = useState(0);
  const { activePdf } = useActivePDF(userId);

  const { phase, transcript, lastLatencyMs, error, remaining, summary, analyserRef, start, end } =
    useSageLineCall();

  const orbRef = useRef(null);
  const animRef = useRef(null);
  const startTsRef = useRef(null);

  useEffect(() => {
    if (!FLAGS.SAGELINE_V2) { router.replace("/call-tutor"); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUserId(session.user.id);
      setReady(true);
    });
  }, [router]);

  const isLive = ["connecting", "greeting", "listening", "thinking", "speaking", "wrapping_up"].includes(phase);

  // Call timer.
  useEffect(() => {
    if (!isLive) return;
    if (!startTsRef.current) startTsRef.current = Date.now();
    const id = setInterval(() => setTimer(Math.round((Date.now() - startTsRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  // Orb: mic amplitude while listening, gentle breathing otherwise.
  useEffect(() => {
    const tick = (ts) => {
      animRef.current = requestAnimationFrame(tick);
      if (!orbRef.current) return;
      const t = ts / 1000;
      let scale = 1 + Math.sin(t * 1.2) * 0.03;
      if (phase === "listening" && analyserRef.current) {
        const buf = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        scale = 1 + Math.min(rms * 10, 0.4);
      } else if (phase === "speaking") {
        scale = 1 + Math.sin(t * 3.6) * 0.06 + 0.02;
      }
      orbRef.current.style.transform = `scale(${scale.toFixed(4)})`;
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, analyserRef]);

  if (!FLAGS.SAGELINE_V2 || !ready) return null;

  const minsLabel = remaining?.maxDurationSecs
    ? `${Math.floor(remaining.maxDurationSecs / 60)} min max this call`
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg-base)", display: "flex", flexDirection: "column", userSelect: "none" }}>
      {/* Ambient warm glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 55% at 50% 42%, color-mix(in srgb, var(--accent) 9%, transparent) 0%, transparent 70%)",
      }} />

      {/* Top bar */}
      <header style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px" }}>
        <button
          onClick={() => { if (isLive) end(); setTimeout(() => router.push("/dashboard"), 150); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)", borderRadius: 24, padding: "7px 15px", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          <span style={{ fontSize: 14 }}>←</span> Dashboard
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
          <LogoMark size={18} strokeWidth={1.7} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>SageLine</span>
        </div>
        <div style={{ minWidth: 78, textAlign: "right" }}>
          {isLive ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "var(--accent)" }}>● LIVE</div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace", color: "var(--text-tertiary)" }}>{fmt(timer)}</div>
            </>
          ) : <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{minsLabel}</span>}
        </div>
      </header>

      {/* Center */}
      <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: "0 24px", minHeight: 0 }}>
        {phase === "ended" ? (
          <EndCard summary={summary} onAgain={() => { startTsRef.current = null; setTimer(0); start({ documentId: activePdf?.id }); }} onHome={() => router.push("/dashboard")} />
        ) : (
          <>
            {/* Orb */}
            <button
              onClick={() => { if (phase === "idle") start({ documentId: activePdf?.id }); }}
              disabled={isLive}
              aria-label={phase === "idle" ? "Start call" : "Call in progress"}
              style={{ background: "none", border: "none", cursor: phase === "idle" ? "pointer" : "default", padding: 0 }}
            >
              <div ref={orbRef} style={{
                width: 160, height: 160, borderRadius: "50%",
                background: "radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--accent) 85%, white) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 55%, black) 100%)",
                boxShadow: "0 0 60px color-mix(in srgb, var(--accent) 35%, transparent)",
              }} />
            </button>

            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{STATUS[phase] ?? ""}</p>
              {phase === "idle" && (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-tertiary)", maxWidth: 340 }}>
                  SageLine picks up the phone and actually teaches you.
                  {activePdf ? <> We&apos;ll work through <span style={{ color: "var(--info)" }}>{activePdf.name}</span>.</> : " Tap to start."}
                </p>
              )}
              {lastLatencyMs != null && isLive && (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>response ~{lastLatencyMs} ms</p>
              )}
              {error && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--error)" }}>{error}</p>}
            </div>

            {/* Live transcript */}
            {transcript.length > 0 && (
              <div style={{ width: "100%", maxWidth: 520, maxHeight: "34vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {transcript.slice(-8).map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === "student" ? "flex-end" : "flex-start", maxWidth: "88%", padding: "8px 13px", borderRadius: 13, fontSize: 13, lineHeight: 1.5, background: m.role === "student" ? "var(--bg-surface-2)" : "color-mix(in srgb, var(--accent) 8%, var(--bg-elevated))", color: "var(--text-primary)" }}>
                    {m.text}
                  </div>
                ))}
              </div>
            )}

            {isLive && (
              <button
                onClick={() => end()}
                style={{ marginTop: 4, padding: "10px 26px", borderRadius: 26, border: "1px solid var(--error)", background: "transparent", color: "var(--error)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                End call
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EndCard({ summary, onAgain, onHome }) {
  const [showTranscript, setShowTranscript] = useState(false);
  return (
    <div style={{ width: "100%", maxWidth: 480, background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 18, padding: 24 }}>
      <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Session complete</p>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-tertiary)" }}>Nicely done. Here&apos;s what we covered.</p>

      {summary?.summary && (
        <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>{summary.summary}</p>
      )}

      {summary?.misconceptions?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>Caught & cleared</p>
          {summary.misconceptions.map((m, i) => (
            <p key={i} style={{ margin: "0 0 5px", fontSize: 13, color: "var(--text-secondary)" }}>• {m}</p>
          ))}
        </div>
      )}

      {summary?.cardsAdded > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)", marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
            ✓ {summary.cardsAdded} card{summary.cardsAdded > 1 ? "s" : ""} added to your review queue
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onAgain} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "var(--accent-grad)", color: "var(--bg-base)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Call again
        </button>
        <button onClick={onHome} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid var(--border-hairline)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Dashboard
        </button>
      </div>
    </div>
  );
}
