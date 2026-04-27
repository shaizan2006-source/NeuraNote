"use client";

// =====================================================================
// useSessionTracker — assigns a stable sessionId to user activity.
// A "session" = continuous activity with no >IDLE_MS gap between events.
//
// Behaviour:
//   • Reads/writes sessionStorage key amn_session_id.
//   • On mount: if no id OR last activity > IDLE_MS ago → new session_started.
//   • Touch on every track() call via window event 'amn:activity' (track.js
//     can dispatch this; useSessionTracker also bumps on visibility/clicks).
//   • On idle expiry (visibilitychange→hidden + >IDLE_MS) emits session_ended
//     with duration_ms = lastActivity − sessionStart.
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { trackSessionStart, trackSessionEnd } from "@/lib/track";

const SESSION_KEY    = "amn_session_id";
const SESSION_START  = "amn_session_start";
const LAST_ACTIVITY  = "amn_last_activity";
const IDLE_MS        = 15 * 60 * 1000;            // 15 min

function uuid() {
  // Crypto-safe UUID v4 (Node 18+/modern browsers expose this).
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Tiny fallback (not RFC-strict but unique enough for grouping).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function readState() {
  try {
    return {
      id:    sessionStorage.getItem(SESSION_KEY)   || null,
      start: parseInt(sessionStorage.getItem(SESSION_START) || "0", 10) || null,
      last:  parseInt(sessionStorage.getItem(LAST_ACTIVITY) || "0", 10) || null,
    };
  } catch { return { id: null, start: null, last: null }; }
}

function writeState({ id, start, last }) {
  try {
    if (id    !== undefined) sessionStorage.setItem(SESSION_KEY,   id);
    if (start !== undefined) sessionStorage.setItem(SESSION_START, String(start));
    if (last  !== undefined) sessionStorage.setItem(LAST_ACTIVITY, String(last));
  } catch {}
}

export function useSessionTracker() {
  const [state, setState] = useState({ sessionId: null, sessionStart: null });
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const now  = Date.now();
    const prev = readState();
    const expired = !prev.id || !prev.last || (now - prev.last > IDLE_MS);

    if (expired) {
      // End the previous session (best-effort) before starting a new one.
      if (prev.id && prev.start) {
        trackSessionEnd(prev.id, Math.max(0, (prev.last || now) - prev.start));
      }
      const id = uuid();
      writeState({ id, start: now, last: now });
      setState({ sessionId: id, sessionStart: now });
      trackSessionStart(id);
    } else {
      writeState({ last: now });
      setState({ sessionId: prev.id, sessionStart: prev.start });
    }

    // Touch activity timestamp on common signals — track.js also dispatches.
    const touch = () => writeState({ last: Date.now() });
    window.addEventListener("click",          touch, { passive: true });
    window.addEventListener("keydown",        touch, { passive: true });
    window.addEventListener("amn:activity",   touch);

    // On hide, if the gap to last activity exceeds IDLE_MS we assume the
    // session is done. We don't end immediately — that happens lazily on the
    // next mount when expiry is detected.
    const onHidden = () => { if (document.visibilityState === "hidden") writeState({ last: Date.now() }); };
    window.addEventListener("visibilitychange", onHidden);

    return () => {
      window.removeEventListener("click",          touch);
      window.removeEventListener("keydown",        touch);
      window.removeEventListener("amn:activity",   touch);
      window.removeEventListener("visibilitychange", onHidden);
    };
  }, []);

  return state;     // { sessionId, sessionStart }
}
