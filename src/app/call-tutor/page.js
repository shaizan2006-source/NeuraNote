"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Constants ────────────────────────────────────────────────────────────────
const SILENCE_THRESHOLD = 0.012;
const SILENCE_DURATION  = 1600;
const MAX_RECORDING_MS  = 30_000;
const BAR_COUNT         = 7;

const LANGUAGES = [
  { code: "en", label: "English"  },
  { code: "hi", label: "हिंदी"   },
  { code: "fr", label: "Français" },
];

// glow = "rgba(r,g,b," — append opacity + ")" to form a valid color
const PHASE_CFG = {
  idle:       { color: "#8b5cf6", glow: "rgba(139,92,246,",  status: "Your AI Tutor",       hint: "Tap the orb to begin your session"     },
  connecting: { color: "#f59e0b", glow: "rgba(245,158,11,",  status: "Connecting…",         hint: "Setting up your session"               },
  greeting:   { color: "#60a5fa", glow: "rgba(96,165,250,",  status: "Greeting you…",       hint: ""                                      },
  listening:  { color: "#34d399", glow: "rgba(52,211,153,",  status: "Listening…",          hint: "Speak your doubt clearly"              },
  thinking:   { color: "#fbbf24", glow: "rgba(251,191,36,",  status: "Thinking…",           hint: "Processing your question"              },
  speaking:   { color: "#60a5fa", glow: "rgba(96,165,250,",  status: "Speaking…",           hint: "Tap orb to interrupt"                  },
  ended:      { color: "#6b7280", glow: "rgba(107,114,128,", status: "Call Ended",          hint: ""                                      },
  summary:    { color: "#34d399", glow: "rgba(52,211,153,",  status: "Session Complete",    hint: ""                                      },
};

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function getSupportedMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/webm";
}

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CallTutorPage() {
  const router = useRouter();

  // ─ UI State ─
  const [phase,    setPhase]    = useState("idle");
  const [language, setLanguage] = useState("en");
  const [messages, setMessages] = useState([]);
  const [liveText, setLiveText] = useState("");
  const [timer,    setTimer]    = useState(0);
  const [error,    setError]    = useState("");
  const [summary,  setSummary]  = useState("");
  const [isMuted,  setIsMuted]  = useState(false);
  const [hint,     setHint]     = useState("Start a voice conversation with your AI tutor");

  // ─ Core refs ─
  const phaseRef    = useRef("idle");
  const msgsRef     = useRef([]);
  const callIdRef   = useRef(null);
  const langRef     = useRef("en");
  const streamRef   = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const audioRef    = useRef(null);
  const startTsRef  = useRef(null);
  const timerIntRef = useRef(null);
  const silRafRef   = useRef(null);
  const safetyTRef  = useRef(null);
  const mimeRef     = useRef("audio/webm");
  const mutedRef    = useRef(false);

  // ─ Animation refs (direct DOM — no re-renders per frame) ─
  const orbRef  = useRef(null);
  const r1Ref   = useRef(null);
  const r2Ref   = useRef(null);
  const barsRef = useRef([]);
  const animRef = useRef(null);

  // ─ Stable fn refs (avoid stale closures in callbacks) ─
  const processFn = useRef(null);
  const listenFn  = useRef(null);
  const endFn     = useRef(null);

  // Sync state → refs
  useEffect(() => { phaseRef.current  = phase;    }, [phase]);
  useEffect(() => { msgsRef.current   = messages; }, [messages]);
  useEffect(() => { langRef.current   = language; }, [language]);
  useEffect(() => { mutedRef.current  = isMuted;  }, [isMuted]);

  // ── Auth token ─────────────────────────────────────────────────────────────
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  // ── Visual animation loop (rAF — never triggers React re-render) ───────────
  useEffect(() => {
    const tick = (ts) => {
      animRef.current = requestAnimationFrame(tick);
      if (!orbRef.current) return;

      const t = ts / 1000;
      const p = phaseRef.current;
      let scale = 1, rs1 = 1, rs2 = 1;

      if (p === "idle" || p === "ended") {
        // Slow breathing pulse
        scale = 1 + Math.sin(t * 1.1) * 0.025;
        rs1   = 1 + Math.sin(t * 1.1 + 0.5) * 0.042;
        rs2   = 1 + Math.sin(t * 0.7) * 0.065;

      } else if (p === "listening" && analyserRef.current && !mutedRef.current) {
        // Real-time amplitude from microphone
        const tdb = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(tdb);
        const rms = Math.sqrt(tdb.reduce((s, v) => s + v * v, 0) / tdb.length);
        scale = 1 + Math.min(rms * 9,  0.38);
        rs1   = 1 + Math.min(rms * 14, 0.55);
        rs2   = 1 + Math.min(rms * 20, 0.78);

        // Drive waveform bars from FFT frequency data
        const fdb  = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(fdb);
        const step = Math.max(1, Math.floor((fdb.length / 4) / BAR_COUNT)); // voice freq range
        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const v = (fdb[i * step + 1] ?? 0) / 255;
          bar.style.height  = `${Math.max(3, v * 52)}px`;
          bar.style.opacity = String(0.35 + v * 0.65);
        });

      } else if (p === "speaking") {
        scale = 1 + Math.sin(t * 3.8) * 0.055 + 0.018;
        rs1   = 1 + Math.sin(t * 2.9 + 1.0) * 0.092;
        rs2   = 1 + Math.sin(t * 2.1 + 0.3) * 0.135;

      } else if (p === "thinking") {
        scale = 1 + Math.abs(Math.sin(t * 2.2)) * 0.045;
        rs1   = 1 + Math.sin(t * 1.8 + 0.5) * 0.072;
        rs2   = 1 + Math.sin(t * 1.4 + 1.5) * 0.112;

      } else {
        // connecting, greeting — moderate pulse
        scale = 1 + Math.sin(t * 2.8) * 0.038;
        rs1   = 1 + Math.sin(t * 2.2 + 0.3) * 0.065;
        rs2   = 1 + Math.sin(t * 1.6 + 1.0) * 0.1;
      }

      orbRef.current.style.transform = `scale(${scale.toFixed(4)})`;
      if (r1Ref.current) r1Ref.current.style.transform = `scale(${rs1.toFixed(4)})`;
      if (r2Ref.current) r2Ref.current.style.transform = `scale(${rs2.toFixed(4)})`;

      // Idle waveform bars (gentle ambient ripple when not listening)
      if (p !== "listening") {
        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const v = Math.max(0, Math.sin(t * 1.6 + i * 0.9) * 0.5 + 0.5);
          bar.style.height  = `${3 + v * 5}px`;
          bar.style.opacity = "0.22";
        });
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // ── TTS — play AI response audio ───────────────────────────────────────────
  const speak = useCallback(async (text, onEnd) => {
    if (!text || phaseRef.current === "ended") { onEnd?.(); return; }
    setPhase("speaking");
    setHint("Tap orb to interrupt");

    try {
      const token = await getToken();
      const res   = await fetch("/api/voice/speak", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ text, language: langRef.current }),
      });
      if (!res.ok) throw new Error("TTS failed");
      if (phaseRef.current === "ended") { onEnd?.(); return; }

      const blob  = await res.blob();
      const url   = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; onEnd?.(); };
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; onEnd?.(); };
      await audio.play();
    } catch {
      audioRef.current = null;
      onEnd?.();
    }
  }, [getToken]);

  // ── End call — cleanup + optional summary ──────────────────────────────────
  const endCall = useCallback(async (finalMsgs) => {
    cancelAnimationFrame(silRafRef.current);
    clearTimeout(safetyTRef.current);
    clearInterval(timerIntRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current?.state !== "closed") audioCtxRef.current?.close().catch(() => {});

    setPhase("ended");

    const dur  = Math.round((Date.now() - (startTsRef.current ?? Date.now())) / 1000);
    const msgs = finalMsgs ?? msgsRef.current;

    try {
      const token = await getToken();
      const { summary: s } = await (await fetch("/api/voice/end", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ callId: callIdRef.current, durationSecs: dur, messages: msgs }),
      })).json();
      if (s) { setSummary(s); setPhase("summary"); }
    } catch { /* summary is optional — never block navigation */ }
  }, [getToken]);

  // ── Process recorded audio — STT → LLM → TTS pipeline ─────────────────────
  const processUserSpeech = useCallback(async (blob) => {
    if (phaseRef.current === "ended") return;

    if (!blob || blob.size < 2000) {
      setHint("Didn't catch that — try again...");
      setTimeout(() => listenFn.current?.(), 1200);
      return;
    }

    setPhase("thinking");
    setLiveText("");
    setHint("Processing your question…");

    try {
      const token = await getToken();

      // 1. Speech → Text (Whisper)
      const fd = new FormData();
      fd.append("audio",    blob, `audio.${mimeRef.current.includes("mp4") ? "mp4" : "webm"}`);
      fd.append("language", langRef.current);
      fd.append("mimeType", mimeRef.current);

      const { text } = await (await fetch("/api/voice/transcribe", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      })).json();

      if (!text?.trim() || text.trim().length < 2) {
        setHint("Couldn't understand — please repeat.");
        setTimeout(() => listenFn.current?.(), 1800);
        return;
      }

      setLiveText(text);
      const userMsg = { role: "user", content: text };
      const newMsgs = [...msgsRef.current, userMsg];
      setMessages(newMsgs);

      // 2. Text → LLM response
      const { text: aiText, endCall: shouldEnd } = await (await fetch("/api/voice/respond", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ messages: newMsgs, language: langRef.current }),
      })).json();

      const updated = [...newMsgs, { role: "assistant", content: aiText }];
      setMessages(updated);
      setLiveText("");

      // 3. LLM response → TTS playback
      await new Promise(r => speak(aiText, r));

      if (shouldEnd || phaseRef.current === "ended") {
        await endFn.current?.(updated);
      } else {
        listenFn.current?.();
      }
    } catch {
      setHint("Something went wrong — retrying…");
      setTimeout(() => listenFn.current?.(), 2000);
    }
  }, [speak, getToken]);

  // ── Start listening — MediaRecorder + VAD silence detection ───────────────
  const startListening = useCallback(() => {
    if (phaseRef.current === "ended") return;

    setPhase("listening");
    setHint("Speak your doubt clearly");
    setLiveText("");
    chunksRef.current = [];

    const stream = streamRef.current;
    if (!stream?.active) { setHint("Microphone disconnected — please restart."); return; }

    const tryMake = (opts) => {
      try { return opts ? new MediaRecorder(stream, opts) : new MediaRecorder(stream); }
      catch { return null; }
    };

    let rec  = tryMake(mimeRef.current ? { mimeType: mimeRef.current } : null) ?? tryMake(null);
    if (!rec) { endFn.current?.(); return; }

    const mime = rec.mimeType || mimeRef.current || "audio/webm";
    mimeRef.current     = mime;
    recorderRef.current = rec;

    const attach = (r, m) => {
      r.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      r.onstop = () => {
        cancelAnimationFrame(silRafRef.current);
        clearTimeout(safetyTRef.current);
        if (phaseRef.current === "listening") {
          processFn.current?.(new Blob(chunksRef.current, { type: m }));
        }
      };
    };

    attach(rec, mime);
    let started = false;
    try { rec.start(200); started = true; } catch { /* fallback to plain recorder */ }

    if (!started) {
      const plain = tryMake(null);
      if (!plain) { endFn.current?.(); return; }
      const pm = plain.mimeType || "audio/webm";
      mimeRef.current     = pm;
      recorderRef.current = plain;
      attach(plain, pm);
      try { plain.start(200); } catch { endFn.current?.(); return; }
    }

    // VAD — stop recording on sustained silence
    let silStart = null;
    const vadTick = () => {
      if (phaseRef.current !== "listening") return;
      if (!analyserRef.current || mutedRef.current) {
        silRafRef.current = requestAnimationFrame(vadTick);
        return;
      }
      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);

      if (rms < SILENCE_THRESHOLD) {
        silStart = silStart ?? Date.now();
        if (Date.now() - silStart >= SILENCE_DURATION) {
          if (recorderRef.current?.state === "recording") recorderRef.current.stop();
          return;
        }
      } else {
        silStart = null;
      }
      silRafRef.current = requestAnimationFrame(vadTick);
    };
    silRafRef.current = requestAnimationFrame(vadTick);

    safetyTRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    }, MAX_RECORDING_MS);
  }, []);

  // Keep fn refs current
  useEffect(() => { processFn.current = processUserSpeech; }, [processUserSpeech]);
  useEffect(() => { listenFn.current  = startListening;    }, [startListening]);
  useEffect(() => { endFn.current     = endCall;            }, [endCall]);

  // ── Start call — auth → rate-limit → mic → AudioContext → greeting ─────────
  const startCall = useCallback(async () => {
    setError("");
    setPhase("connecting");
    setMessages([]);
    setSummary("");
    setTimer(0);
    setHint("Setting up your session…");

    try {
      const token = await getToken();
      if (!token) {
        setError("Please log in to use the Voice AI Tutor.");
        setPhase("idle"); setHint("Tap the orb to begin your session");
        return;
      }

      // Rate-limit check
      const res  = await fetch("/api/voice/start", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || data.limitReached) {
        setError(data.error ?? "Daily call limit reached. Upgrade to continue.");
        setPhase("idle"); setHint("Tap the orb to begin your session");
        return;
      }
      callIdRef.current = data.callId;

      // Microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;

      if (typeof MediaRecorder === "undefined") {
        setError("Voice recording not supported. Please use Chrome or Firefox.");
        stream.getTracks().forEach(t => t.stop());
        setPhase("idle"); return;
      }

      // AudioContext + analyser for VAD and visualization
      const Ctx      = window.AudioContext ?? window.webkitAudioContext;
      const ctx      = new Ctx();
      audioCtxRef.current = ctx;
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;
      mimeRef.current = getSupportedMimeType();

      // Call timer + max-duration enforcement
      startTsRef.current  = Date.now();
      timerIntRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTsRef.current) / 1000);
        setTimer(elapsed);
        if (data.limits?.maxDurationSecs && elapsed >= data.limits.maxDurationSecs) {
          endFn.current?.();
        }
      }, 1000);

      // AI greeting
      setPhase("greeting");
      setHint("");
      const greet  = `${getGreeting()}! I'm your AI tutor from Ask My Notes. I'm here to help you understand any concept deeply and clearly. What doubt would you like to clear today?`;
      msgsRef.current = [{ role: "assistant", content: greet }];
      setMessages(msgsRef.current);

      await new Promise(r => speak(greet, r));
      if (phaseRef.current !== "ended") listenFn.current?.();

    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone access denied. Please allow mic access in your browser settings and try again.");
      } else {
        setError("Failed to start call. Please try again.");
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerIntRef.current);
      setPhase("idle");
      setHint("Tap the orb to begin your session");
    }
  }, [getToken, speak]);

  // Auto-start on page load
  useEffect(() => {
    const t = setTimeout(() => startCall(), 800);
    return () => clearTimeout(t);
  }, [startCall]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
      return next;
    });
  }, []);

  const interruptAI = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    listenFn.current?.();
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => {
    cancelAnimationFrame(silRafRef.current);
    clearTimeout(safetyTRef.current);
    clearInterval(timerIntRef.current);
    cancelAnimationFrame(animRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    audioRef.current?.pause();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current?.state !== "closed") audioCtxRef.current?.close().catch(() => {});
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isActive = ["connecting", "greeting", "listening", "thinking", "speaking"].includes(phase);
  const cfg      = PHASE_CFG[phase] ?? PHASE_CFG.idle;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .ct-btn { transition: transform 0.15s ease, opacity 0.15s ease; cursor: pointer; }
        .ct-btn:hover  { opacity: 0.82; transform: scale(1.07); }
        .ct-btn:active { transform: scale(0.94); }
        .ct-end-btn:hover  { opacity: 0.9; transform: scale(1.08) !important; box-shadow: 0 0 40px rgba(220,38,38,0.6) !important; }
        .ct-end-btn:active { transform: scale(0.94) !important; }

        @keyframes ct-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .ct-thinking-ring {
          animation: ct-spin 2.2s linear infinite;
        }

        @keyframes ct-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ct-fade-in { animation: ct-fade-in 0.35s ease forwards; }

        @media (max-width: 480px) {
          .ct-orb  { width: 140px !important; height: 140px !important; }
          .ct-r1   { width: 196px !important; height: 196px !important; }
          .ct-r2   { width: 254px !important; height: 254px !important; }
          .ct-tr   { width: 164px !important; height: 164px !important; }
          .ct-status-txt { font-size: 19px !important; }
        }
        @media (max-width: 380px) {
          .ct-orb  { width: 120px !important; height: 120px !important; }
          .ct-r1   { width: 170px !important; height: 170px !important; }
          .ct-r2   { width: 218px !important; height: 218px !important; }
        }
      `}</style>

      {/* ── FULL-SCREEN SHELL ─────────────────────────────────────────── */}
      <div style={{
        position:        "fixed",
        inset:           0,
        background:      "#07070f",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "space-between",
        overflow:        "hidden",
        WebkitUserSelect: "none",
        userSelect:      "none",
        touchAction:     "manipulation",
      }}>

        {/* ── AMBIENT BACKGROUND GLOW (phase-reactive) ───────────────── */}
        <div style={{
          position:      "absolute",
          inset:         0,
          background:    `radial-gradient(ellipse 62% 56% at 50% 44%, ${cfg.glow}0.1) 0%, transparent 68%)`,
          transition:    "background 1.4s ease",
          pointerEvents: "none",
          zIndex:        0,
        }} />
        {/* Second layer — deeper, wider glow */}
        <div style={{
          position:      "absolute",
          inset:         0,
          background:    `radial-gradient(ellipse 90% 70% at 50% 50%, ${cfg.glow}0.04) 0%, transparent 100%)`,
          transition:    "background 1.4s ease",
          pointerEvents: "none",
          zIndex:        0,
        }} />

        {/* ── TOP BAR ─────────────────────────────────────────────────── */}
        <header style={{
          position:        "relative",
          zIndex:          10,
          width:           "100%",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "20px 22px",
          flexShrink:      0,
          boxSizing:       "border-box",
        }}>
          {/* Back */}
          <button
            className="ct-btn"
            onClick={() => { endFn.current?.(); setTimeout(() => router.push("/dashboard"), 180); }}
            style={{
              background:   "rgba(255,255,255,0.05)",
              border:       "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
              padding:      "8px 17px",
              color:        "#64748b",
              fontSize:     13,
              fontWeight:   500,
              display:      "flex",
              alignItems:   "center",
              gap:          5,
              whiteSpace:   "nowrap",
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>←</span> Dashboard
          </button>

          {/* Title */}
          <span style={{
            color:         "#cbd5e1",
            fontSize:      15,
            fontWeight:    700,
            letterSpacing: 0.3,
            flexShrink:    0,
          }}>
            AI Tutor
          </span>

          {/* Live badge + timer */}
          {isActive ? (
            <div style={{ textAlign: "right", minWidth: 72 }}>
              <div style={{
                color:         cfg.color,
                fontSize:      10,
                fontWeight:    800,
                letterSpacing: 2.5,
                marginBottom:  2,
                transition:    "color 1.2s ease",
              }}>
                ● LIVE
              </div>
              <div style={{
                color:      "#2d3748",
                fontSize:   14,
                fontWeight: 600,
                fontFamily: "monospace",
              }}>
                {fmtTime(timer)}
              </div>
            </div>
          ) : (
            <div style={{ minWidth: 72 }} />
          )}
        </header>

        {/* ── LANGUAGE SELECTOR (idle + error states only) ─────────────── */}
        {!isActive && phase !== "summary" && (
          <div className="ct-fade-in" style={{
            position:   "relative",
            zIndex:     10,
            display:    "flex",
            gap:        7,
            flexShrink: 0,
          }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                className="ct-btn"
                onClick={() => setLanguage(l.code)}
                style={{
                  padding:      "5px 15px",
                  borderRadius: 20,
                  fontSize:     12,
                  fontWeight:   600,
                  border:       `1px solid ${language === l.code ? cfg.color : "rgba(255,255,255,0.07)"}`,
                  background:   language === l.code ? `${cfg.color}1e` : "transparent",
                  color:        language === l.code ? cfg.color : "#475569",
                  transition:   "border-color 0.3s, background 0.3s, color 0.3s",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        {/* ── CENTRAL ORB STAGE ───────────────────────────────────────── */}
        <div style={{
          position:        "relative",
          zIndex:          10,
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          flex:            1,
          justifyContent:  "center",
        }}>
          {/* Outer concentric ring */}
          <div
            ref={r2Ref}
            className="ct-r2"
            style={{
              position:     "absolute",
              width:        292,
              height:       292,
              borderRadius: "50%",
              border:       `1px solid ${cfg.color}`,
              opacity:      0.1,
              transition:   "border-color 1.3s ease",
              pointerEvents: "none",
              willChange:   "transform",
            }}
          />

          {/* Inner ring */}
          <div
            ref={r1Ref}
            className="ct-r1"
            style={{
              position:     "absolute",
              width:        222,
              height:       222,
              borderRadius: "50%",
              border:       `1.5px solid ${cfg.color}`,
              opacity:      0.18,
              transition:   "border-color 1.3s ease",
              pointerEvents: "none",
              willChange:   "transform",
            }}
          />

          {/* Thinking spinner arc */}
          {phase === "thinking" && (
            <div
              className="ct-thinking-ring ct-tr"
              style={{
                position:       "absolute",
                width:          196,
                height:         196,
                borderRadius:   "50%",
                border:         "2px solid transparent",
                borderTopColor: cfg.color,
                borderRightColor: `${cfg.color}55`,
                opacity:        0.75,
                pointerEvents:  "none",
              }}
            />
          )}

          {/* ── MAIN ORB ── */}
          <div
            ref={orbRef}
            className="ct-orb"
            onClick={!isActive ? startCall : phase === "speaking" ? interruptAI : undefined}
            style={{
              position:        "relative",
              width:           170,
              height:          170,
              borderRadius:    "50%",
              background:      `radial-gradient(circle at 33% 28%, ${cfg.color}f2 0%, ${cfg.color}9a 30%, ${cfg.color}52 62%, ${cfg.color}15 100%)`,
              boxShadow:       [
                `0 0 36px ${cfg.glow}0.48)`,
                `0 0 72px ${cfg.glow}0.24)`,
                `0 0 130px ${cfg.glow}0.09)`,
                "inset 0 2px 4px rgba(255,255,255,0.28)",
              ].join(", "),
              cursor:          !isActive ? "pointer" : phase === "speaking" ? "pointer" : "default",
              transition:      "background 1.3s ease, box-shadow 1.3s ease",
              willChange:      "transform",
              flexShrink:      0,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Glass specular highlight */}
            <div style={{
              position:     "absolute",
              top:          "11%",
              left:         "14%",
              width:        "40%",
              height:       "30%",
              borderRadius: "50%",
              background:   "rgba(255,255,255,0.2)",
              filter:       "blur(11px)",
              transform:    "rotate(-18deg)",
              pointerEvents: "none",
            }} />
            {/* Faint secondary reflection */}
            <div style={{
              position:     "absolute",
              bottom:       "16%",
              right:        "18%",
              width:        "20%",
              height:       "15%",
              borderRadius: "50%",
              background:   "rgba(255,255,255,0.07)",
              filter:       "blur(6px)",
              pointerEvents: "none",
            }} />
          </div>

          {/* ── WAVEFORM BARS ── */}
          <div style={{
            display:    "flex",
            alignItems: "flex-end",
            gap:        5,
            marginTop:  26,
            height:     56,
          }}>
            {Array.from({ length: BAR_COUNT }, (_, i) => (
              <div
                key={i}
                ref={el => { barsRef.current[i] = el; }}
                style={{
                  width:        4,
                  height:       4,
                  borderRadius: 3,
                  background:   cfg.color,
                  opacity:      0.22,
                  transition:   "background 1.3s ease",
                  willChange:   "height, opacity",
                  flexShrink:   0,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── STATUS TEXT ─────────────────────────────────────────────── */}
        <div style={{
          position:    "relative",
          zIndex:      10,
          textAlign:   "center",
          padding:     "0 32px",
          flexShrink:  0,
          marginBottom: 6,
          boxSizing:   "border-box",
          maxWidth:    "100%",
        }}>
          <p
            className="ct-status-txt"
            style={{
              color:         "#e2e8f0",
              fontSize:      21,
              fontWeight:    600,
              margin:        0,
              letterSpacing: 0.2,
              lineHeight:    1.2,
              transition:    "color 0.5s ease",
            }}
          >
            {cfg.status}
          </p>

          {/* Dynamic hint / live transcript preview */}
          <p style={{
            color:      "#2d3a4a",
            fontSize:   13,
            margin:     "9px 0 0",
            maxWidth:   300,
            lineHeight: 1.65,
            minHeight:  20,
            transition: "opacity 0.3s ease",
          }}>
            {liveText ? `"${liveText}"` : hint}
          </p>

          {/* Exchange counter */}
          {isActive && messages.length > 1 && (
            <p style={{ color: "#1a2030", fontSize: 11, margin: "8px 0 0" }}>
              {Math.floor(messages.length / 2)} exchange{Math.floor(messages.length / 2) !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* ── ERROR MESSAGE ────────────────────────────────────────────── */}
        {error && (
          <div className="ct-fade-in" style={{
            position:     "relative",
            zIndex:       10,
            background:   "#160808",
            border:       "1px solid rgba(127,29,29,0.7)",
            borderRadius: 12,
            padding:      "11px 18px",
            color:        "#fca5a5",
            fontSize:     13,
            textAlign:    "center",
            maxWidth:     "min(300px, calc(100vw - 48px))",
            lineHeight:   1.65,
            margin:       "0 24px",
            flexShrink:   0,
            boxSizing:    "border-box",
          }}>
            {error}
            {error.toLowerCase().includes("limit") && (
              <a
                href="/pricing"
                style={{ display: "block", color: "#60a5fa", marginTop: 5, fontSize: 12 }}
              >
                Upgrade plan →
              </a>
            )}
          </div>
        )}

        {/* ── BOTTOM CONTROL BAR ───────────────────────────────────────── */}
        <footer style={{
          position:        "relative",
          zIndex:          10,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          gap:             20,
          padding:         "18px 24px 44px",
          flexShrink:      0,
        }}>
          {isActive ? (
            <>
              {/* Mute / unmute */}
              <button
                className="ct-btn"
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                style={{
                  width:           54,
                  height:          54,
                  borderRadius:    "50%",
                  border:          `1.5px solid ${isMuted ? "rgba(239,68,68,0.38)" : "rgba(255,255,255,0.09)"}`,
                  background:      isMuted ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                  color:           isMuted ? "#ef4444" : "#475569",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  backdropFilter:  "blur(8px)",
                  transition:      "border-color 0.2s, background 0.2s, color 0.2s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {isMuted ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .37-.03.73-.08 1.08M12 19v3M8 23h8" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 23h8" />
                  </svg>
                )}
              </button>

              {/* End call */}
              <button
                className="ct-end-btn"
                onClick={() => endFn.current?.()}
                title="End call"
                aria-label="End call"
                style={{
                  width:           68,
                  height:          68,
                  borderRadius:    "50%",
                  border:          "none",
                  background:      "linear-gradient(145deg, #dc2626, #991b1b)",
                  color:           "white",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  boxShadow:       "0 0 28px rgba(220,38,38,0.42)",
                  transition:      "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                  cursor:          "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {/* Phone hang-up icon */}
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.25c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C9.61 21 3 14.39 3 6a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"
                    transform="rotate(135 12 12)" />
                </svg>
              </button>

              {/* Spacer — keeps end-call button centred */}
              <div style={{ width: 54, flexShrink: 0 }} />
            </>
          ) : (phase === "ended" || phase === "summary") ? (
            <button
              className="ct-btn ct-fade-in"
              onClick={() => router.push("/dashboard")}
              style={{
                padding:        "13px 34px",
                borderRadius:   50,
                border:         "1px solid rgba(255,255,255,0.1)",
                background:     "rgba(255,255,255,0.05)",
                color:          "#94a3b8",
                fontSize:       14,
                fontWeight:     600,
                backdropFilter: "blur(8px)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              ← Back to Dashboard
            </button>
          ) : (
            /* Placeholder to preserve layout height during connecting */
            <div style={{ height: 68 }} />
          )}
        </footer>
      </div>

      {/* ── SESSION SUMMARY OVERLAY ──────────────────────────────────── */}
      {phase === "summary" && summary && (
        <div
          className="ct-fade-in"
          style={{
            position:        "fixed",
            inset:           0,
            background:      "rgba(0,0,0,0.88)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            zIndex:          50,
            padding:         "24px 20px",
            backdropFilter:  "blur(6px)",
            boxSizing:       "border-box",
          }}
        >
          <div style={{
            background:   "#05110a",
            border:       "1px solid #14532d",
            borderRadius: 20,
            padding:      "28px 24px",
            maxWidth:     440,
            width:        "100%",
            maxHeight:    "74vh",
            overflowY:    "auto",
            boxShadow:    "0 0 60px rgba(52,211,153,0.13)",
          }}>
            <p style={{
              color:      "#86efac",
              fontWeight: 700,
              margin:     "0 0 14px",
              fontSize:   15,
            }}>
              📋 Session Summary
            </p>
            <div style={{
              color:        "#d1fae5",
              fontSize:     14,
              lineHeight:   1.82,
              whiteSpace:   "pre-wrap",
              marginBottom: 22,
            }}>
              {summary}
            </div>
            <button
              className="ct-btn"
              onClick={() => router.push("/dashboard")}
              style={{
                width:        "100%",
                padding:      "13px",
                borderRadius: 12,
                border:       "none",
                background:   "linear-gradient(135deg, #16a34a, #15803d)",
                color:        "white",
                fontWeight:   700,
                fontSize:     14,
                boxShadow:    "0 0 22px rgba(22,163,74,0.28)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
