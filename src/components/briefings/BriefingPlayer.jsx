"use client";
import { useEffect, useRef, useState } from "react";

export default function BriefingPlayer() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [listenedLogged, setListenedLogged] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch("/api/briefings/today")
      .then(r => r.json())
      .then(data => {
        if (data.available) setBriefing(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime / audio.duration);
    if (!listenedLogged && audio.currentTime / audio.duration >= 0.8) {
      setListenedLogged(true);
      fetch("/api/briefings/listened", { method: "POST" }).catch(() => {});
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  if (loading || !briefing) return null;

  const mins = Math.floor((briefing.duration_seconds ?? 90) / 60);
  const secs = (briefing.duration_seconds ?? 90) % 60;
  const duration = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div style={{
      background: "rgba(139,92,246,0.08)",
      border: "1px solid rgba(139,92,246,0.2)",
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 16,
    }}>
      <audio
        ref={audioRef}
        src={briefing.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        preload="metadata"
      />

      {/* Collapsed header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={togglePlay} style={{
          width: 36, height: 36, borderRadius: 18,
          background: "#8B5CF6", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "#fff", flexShrink: 0,
        }}>
          {playing ? "⏸" : "▶"}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E5E7EB" }}>Your Morning Briefing</div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>{duration}</div>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{
          background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 11,
        }}>
          {expanded ? "Hide" : "Read"}
        </button>
      </div>

      {/* Progress bar */}
      {playing && (
        <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 10 }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "#8B5CF6", borderRadius: 2, transition: "width 0.5s linear" }} />
        </div>
      )}

      {/* Transcript */}
      {expanded && briefing.transcript && (
        <div style={{ marginTop: 12, fontSize: 13, color: "#9CA3AF", lineHeight: 1.7, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
          {briefing.transcript}
        </div>
      )}
    </div>
  );
}
