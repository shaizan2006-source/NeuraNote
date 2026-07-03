"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { parseSseStream } from "@/lib/sseParser";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Adaptive endpointing: shorter when the student clearly finished, longer when
// the last words trail off mid-thought (thinking, not done).
const VAD_RMS          = 0.012;
const ENDPOINT_MS      = 750;    // done → respond fast
const ENDPOINT_THINK_MS = 1500;  // trailing conjunction/filler → wait longer
const DISTRACTED_MS    = 25_000; // long silence → gentle re-engagement
const BARGE_IN_MS      = 250;    // sustained speech over TTS → interrupt
const MAX_RECORDING_MS = 30_000;

const TRAILING_FILLERS = ["um", "uh", "so", "and", "but", "like", "matlab", "aur", "toh", "ki", "the", "a", "because"];

function endsMidThought(text) {
  if (!text) return true;
  const last = text.trim().toLowerCase().split(/\s+/).pop().replace(/[.,]/g, "");
  return TRAILING_FILLERS.includes(last);
}

function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const t of types) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  return "audio/webm";
}

/**
 * SageLine call loop. Owns mic, VAD, the per-sentence TTS playback queue,
 * barge-in, and latency instrumentation. UI-agnostic — it reports phase,
 * transcript, and last latency; the page renders them.
 */
export function useSageLineCall({ onEnded } = {}) {
  const [phase, setPhase]         = useState("idle"); // idle|connecting|greeting|listening|thinking|speaking|wrapping_up|ended|error
  const [transcript, setTranscript] = useState([]);   // {role, text}
  const [liveText, setLiveText]   = useState("");
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [error, setError]         = useState("");
  const [remaining, setRemaining] = useState(null);   // {maxDurationSecs}
  const [summary, setSummary]     = useState(null);

  const phaseRef   = useRef("idle");
  const sessionRef = useRef(null);
  const streamRef  = useRef(null);
  const ctxRef     = useRef(null);
  const analyserRef= useRef(null);
  const recRef     = useRef(null);
  const chunksRef  = useRef([]);
  const mimeRef    = useRef("audio/webm");
  const silRafRef  = useRef(null);
  const safetyRef  = useRef(null);
  const distractRef= useRef(null);
  const lastTextRef= useRef("");
  const endpointAtRef = useRef(0);       // VAD endpoint timestamp (t0 for latency)
  const playQueueRef  = useRef([]);      // pending sentence audio urls
  const playingRef    = useRef(false);
  const audioRef      = useRef(null);
  const bargeRef      = useRef(null);
  const firstAudioRef = useRef(true);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const setPhaseSafe = (p) => { if (phaseRef.current !== "ended") setPhase(p); };

  // ── Per-sentence playback queue ──────────────────────────────────────────
  const playNext = useCallback(async () => {
    if (playingRef.current) return;
    const url = playQueueRef.current.shift();
    if (!url) {
      // Queue drained — if we're still in speaking with nothing pending, listen.
      if (phaseRef.current === "speaking" && !playingRef.current) startListeningRef.current?.();
      return;
    }
    playingRef.current = true;
    const audio = new Audio(url);
    audioRef.current = audio;
    if (firstAudioRef.current && endpointAtRef.current) {
      setLastLatencyMs(Math.round(performance.now() - endpointAtRef.current));
      firstAudioRef.current = false;
    }
    audio.onended = () => { URL.revokeObjectURL(url); playingRef.current = false; audioRef.current = null; playNext(); };
    audio.onerror = () => { URL.revokeObjectURL(url); playingRef.current = false; audioRef.current = null; playNext(); };
    try { await audio.play(); } catch { playingRef.current = false; playNext(); }
  }, []);

  const enqueueSentence = useCallback(async (text, sessionId) => {
    try {
      const t = await token();
      const res = await fetch("/api/sageline/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ text, session_id: sessionId }),
      });
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      playQueueRef.current.push(url);
      playNext();
    } catch { /* skip this sentence's audio */ }
  }, [token, playNext]);

  // ── Send a recorded turn ─────────────────────────────────────────────────
  const sendTurn = useCallback(async (blob) => {
    if (phaseRef.current === "ended") return;
    if (!blob || blob.size < 1500) { startListeningRef.current?.(); return; }

    setPhaseSafe("thinking");
    firstAudioRef.current = true;
    const latency = endpointAtRef.current ? Math.round(performance.now() - endpointAtRef.current) : null;

    try {
      const t = await token();
      const fd = new FormData();
      fd.append("audio", blob, "turn.webm");
      fd.append("session_id", sessionRef.current);
      if (latency != null) fd.append("client_latency_ms", String(latency));

      const res = await fetch("/api/sageline/turn", {
        method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd,
      });
      if (res.status === 410) { endRef.current?.(); return; }
      if (!res.ok) { startListeningRef.current?.(); return; }

      setPhaseSafe("speaking");
      let endCall = false;
      for await (const ev of parseSseStream(res)) {
        if (ev.type === "transcript") {
          setTranscript(prev => [...prev, { role: "student", text: ev.text }]);
        } else if (ev.type === "sentence") {
          setTranscript(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "sageline" && last.streaming) {
              const copy = [...prev]; copy[copy.length - 1] = { ...last, text: `${last.text} ${ev.text}`.trim() }; return copy;
            }
            return [...prev, { role: "sageline", text: ev.text, streaming: true }];
          });
          enqueueSentence(ev.text, sessionRef.current);
        } else if (ev.type === "turn_done") {
          endCall = ev.endCall;
        }
      }
      setTranscript(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
      if (endCall) { setPhaseSafe("wrapping_up"); waitDrainThenEnd(); }
      // else: playback queue's drain triggers listening
    } catch {
      startListeningRef.current?.();
    }
  }, [token, enqueueSentence]);

  // Wait for the playback queue to finish, then end the call.
  const waitDrainThenEnd = useCallback(() => {
    const check = setInterval(() => {
      if (!playingRef.current && playQueueRef.current.length === 0) {
        clearInterval(check);
        endRef.current?.();
      }
    }, 300);
  }, []);

  // ── Listening + adaptive VAD ─────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (phaseRef.current === "ended") return;
    setPhaseSafe("listening");
    chunksRef.current = [];
    const stream = streamRef.current;
    if (!stream?.active) { setError("Microphone disconnected."); return; }

    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: mimeRef.current }); }
    catch { try { rec = new MediaRecorder(stream); } catch { return; } }
    recRef.current = rec;
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      cancelAnimationFrame(silRafRef.current);
      clearTimeout(safetyRef.current);
      clearTimeout(distractRef.current);
      if (phaseRef.current === "listening") sendTurn(new Blob(chunksRef.current, { type: mimeRef.current }));
    };
    try { rec.start(200); } catch { return; }

    // Distracted timer — long silence with no speech at all.
    distractRef.current = setTimeout(() => {
      if (phaseRef.current === "listening") {
        setTranscript(prev => [...prev, { role: "sageline", text: "Still there? Take your time — what's on your mind?" }]);
      }
    }, DISTRACTED_MS);

    let silStart = null;
    let heardSpeech = false;
    const tick = () => {
      if (phaseRef.current !== "listening" || !analyserRef.current) return;
      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);

      if (rms < VAD_RMS) {
        silStart = silStart ?? Date.now();
        const threshold = endsMidThought(lastTextRef.current) ? ENDPOINT_THINK_MS : ENDPOINT_MS;
        if (heardSpeech && Date.now() - silStart >= threshold) {
          endpointAtRef.current = performance.now();
          if (recRef.current?.state === "recording") recRef.current.stop();
          return;
        }
      } else {
        silStart = null;
        heardSpeech = true;
        clearTimeout(distractRef.current);
      }
      silRafRef.current = requestAnimationFrame(tick);
    };
    silRafRef.current = requestAnimationFrame(tick);
    safetyRef.current = setTimeout(() => { if (recRef.current?.state === "recording") { endpointAtRef.current = performance.now(); recRef.current.stop(); } }, MAX_RECORDING_MS);
  }, [sendTurn]);

  // ── Barge-in: sustained voice while SageLine speaks → stop and listen ─────
  useEffect(() => {
    if (phase !== "speaking") return;
    let voiceStart = null;
    const id = setInterval(() => {
      if (!analyserRef.current) return;
      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
      if (rms > VAD_RMS * 2.2) {
        voiceStart = voiceStart ?? Date.now();
        if (Date.now() - voiceStart >= BARGE_IN_MS) {
          // Flush playback + pending audio, switch to listening.
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
          playQueueRef.current.forEach(URL.revokeObjectURL);
          playQueueRef.current = [];
          playingRef.current = false;
          clearInterval(id);
          startListeningRef.current?.();
        }
      } else {
        voiceStart = null;
      }
    }, 60);
    bargeRef.current = id;
    return () => clearInterval(id);
  }, [phase]);

  // ── Start / end ──────────────────────────────────────────────────────────
  const start = useCallback(async ({ documentId } = {}) => {
    setError(""); setSummary(null); setTranscript([]);
    setPhaseSafe("connecting");
    try {
      const t = await token();
      if (!t) { setError("Please log in to use SageLine."); setPhase("idle"); return; }

      const res = await fetch("/api/sageline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ document_id: documentId || null }),
      });
      const data = await res.json();
      if (!res.ok || data.limitReached) { setError(data.error || "Couldn't start the call."); setPhase("idle"); return; }

      sessionRef.current = data.session.id;
      setRemaining(data.limits || null);
      if (Array.isArray(data.turns) && data.turns.length) {
        setTranscript(data.turns.map(tn => ({ role: tn.role, text: tn.content })));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      const ctx = new Ctx(); ctxRef.current = ctx;
      const an = ctx.createAnalyser(); an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      analyserRef.current = an;
      mimeRef.current = pickMime();

      setPhaseSafe("greeting");
      setTranscript(prev => [...prev, { role: "sageline", text: data.greetingText }]);
      firstAudioRef.current = false; // greeting isn't a turn-latency sample
      await enqueueSentence(data.greetingText, sessionRef.current);
      // Playback drain → listening.
    } catch (err) {
      setError(err?.name === "NotAllowedError" ? "Microphone access denied." : "Couldn't start the call.");
      streamRef.current?.getTracks().forEach(x => x.stop());
      setPhase("idle");
    }
  }, [token, enqueueSentence]);

  const end = useCallback(async ({ failed = false } = {}) => {
    cancelAnimationFrame(silRafRef.current);
    clearTimeout(safetyRef.current); clearTimeout(distractRef.current); clearInterval(bargeRef.current);
    if (recRef.current?.state === "recording") recRef.current.stop();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    playQueueRef.current.forEach(URL.revokeObjectURL); playQueueRef.current = []; playingRef.current = false;
    streamRef.current?.getTracks().forEach(x => x.stop());
    if (ctxRef.current?.state !== "closed") ctxRef.current?.close().catch(() => {});
    setPhase("ended");

    try {
      const t = await token();
      const res = await fetch("/api/sageline/end", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ session_id: sessionRef.current, failed }),
      });
      const data = await res.json();
      setSummary(data);
    } catch { /* summary optional */ }
    onEnded?.();
  }, [token, onEnded]);

  // Stable refs so callbacks don't capture stale versions.
  const startListeningRef = useRef(startListening);
  const endRef = useRef(end);
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
  useEffect(() => { endRef.current = end; }, [end]);

  // When the playback queue drains after speaking/greeting, go to listening.
  useEffect(() => {
    if (phase !== "speaking" && phase !== "greeting") return;
    const id = setInterval(() => {
      if (!playingRef.current && playQueueRef.current.length === 0 && (phaseRef.current === "speaking" || phaseRef.current === "greeting")) {
        clearInterval(id);
        startListeningRef.current?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  // Cleanup on unmount.
  useEffect(() => () => {
    cancelAnimationFrame(silRafRef.current);
    clearTimeout(safetyRef.current); clearTimeout(distractRef.current); clearInterval(bargeRef.current);
    if (recRef.current?.state === "recording") recRef.current.stop();
    audioRef.current?.pause();
    streamRef.current?.getTracks().forEach(x => x.stop());
    if (ctxRef.current?.state !== "closed") ctxRef.current?.close().catch(() => {});
  }, []);

  return {
    phase, transcript, liveText, lastLatencyMs, error, remaining, summary,
    analyserRef, start, end,
    interrupt: () => startListeningRef.current?.(),
  };
}
