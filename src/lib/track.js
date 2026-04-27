"use client";

// =====================================================================
// track.js — fire-and-forget client tracker.
//
// Contract:
//   track(eventType, payload?)
//     payload: { surface?, topic?, subject?, durationMs?, ...metadata }
//
// Behaviour:
//   • Buffered in memory; flushed when buffer >= MAX_BUFFER, after FLUSH_MS,
//     on visibilitychange→hidden, or on pagehide/beforeunload.
//   • Uses navigator.sendBeacon on unload paths so events survive tab close.
//   • Auto-attaches sessionId from sessionStorage (set by useSessionTracker).
//   • Never throws to the caller; failures log a warning and are dropped
//     after one retry. Tracking must NEVER block product UX.
// =====================================================================

import { EVENT_TYPES, VALID_EVENT_TYPES, VALID_SURFACES } from "./eventRegistry";

const ENDPOINT      = "/api/events";
const MAX_BUFFER    = 10;
const FLUSH_MS      = 5000;
const SESSION_KEY   = "amn_session_id";
const SURFACE_KEY   = "amn_surface";              // optional, set by surface providers

let buffer        = [];
let flushTimer    = null;
let unloadHooked  = false;
let getAuthToken  = null;                         // injected by TrackingProvider

export function configureTracker({ tokenProvider }) {
  getAuthToken = tokenProvider || getAuthToken;
  hookUnloadOnce();
}

export function setSurface(surface) {
  if (typeof window === "undefined") return;
  if (surface && !VALID_SURFACES.has(surface)) {
    console.warn(`[track] unknown surface "${surface}"`);
  }
  try { sessionStorage.setItem(SURFACE_KEY, surface || ""); } catch {}
}

export function track(eventType, payload = {}) {
  if (typeof window === "undefined") return;            // SSR no-op
  if (!VALID_EVENT_TYPES.has(eventType)) {
    console.warn(`[track] unknown event_type "${eventType}" — add it to eventRegistry.js`);
    return;
  }

  const {
    surface, topic, subject, durationMs, sessionId, ...metadata
  } = payload || {};

  let resolvedSurface = surface;
  let resolvedSession = sessionId;
  try {
    if (!resolvedSurface) resolvedSurface = sessionStorage.getItem(SURFACE_KEY) || null;
    if (!resolvedSession) resolvedSession = sessionStorage.getItem(SESSION_KEY) || null;
  } catch {}

  buffer.push({
    event_type:   eventType,
    surface:      resolvedSurface || null,
    topic:        topic ? String(topic).toLowerCase().trim() : null,
    subject:      subject || null,
    metadata,
    session_id:   resolvedSession || null,
    duration_ms:  Number.isFinite(durationMs) ? Math.round(durationMs) : null,
    client_ts:    Date.now(),
  });

  hookUnloadOnce();
  if (buffer.length >= MAX_BUFFER) flush();
  else scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, FLUSH_MS);
}

async function flush({ useBeacon = false } = {}) {
  if (!buffer.length) return;
  const events = buffer;
  buffer = [];
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }

  const payload = JSON.stringify({ events });

  // Path A: tab is going away → sendBeacon for best-effort delivery.
  if (useBeacon && navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    } catch (e) { /* fall through to fetch */ }
  }

  // Path B: regular fetch with bearer auth.
  try {
    const token = getAuthToken ? await getAuthToken() : null;
    const res = await fetch(ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body:    payload,
      keepalive: true,
    });
    if (!res.ok && res.status !== 401) {
      // one retry, then drop. Tracking must not loop on failure.
      setTimeout(() => retryOnce(payload, token), 1500);
    }
  } catch (e) {
    console.warn("[track] flush failed:", e?.message);
  }
}

async function retryOnce(payload, token) {
  try {
    await fetch(ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body:    payload,
      keepalive: true,
    });
  } catch {}
}

function hookUnloadOnce() {
  if (unloadHooked || typeof window === "undefined") return;
  unloadHooked = true;
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush({ useBeacon: true });
  });
  window.addEventListener("pagehide",     () => flush({ useBeacon: true }));
  window.addEventListener("beforeunload", () => flush({ useBeacon: true }));
}

// Convenience helpers — keep call sites short and discoverable.
// questionText is stored truncated (400 chars) so the embedding worker has text to embed.
export const trackQuestion = (mode, { threadId, depth, charCount, topic, questionText }) =>
  track(EVENT_TYPES.QUESTION_ASKED, {
    mode, threadId, depth, charCount, topic,
    // Truncate so metadata stays lean; embedding worker reads this field.
    questionText: questionText ? String(questionText).slice(0, 400) : undefined,
  });

export const trackModeSwitch = (from, to) =>
  track(EVENT_TYPES.MODE_SWITCHED, { from, to });

export const trackDashboardToggle = (from, to) =>
  track(EVENT_TYPES.DASHBOARD_MODE_TOGGLED, { from, to });

export const trackCoachStep = ({ stepIndex, topic, threadId }) =>
  track(EVENT_TYPES.COACH_STEP_REQUESTED, { stepIndex, topic, threadId });

export const trackSessionStart = (sessionId) =>
  track(EVENT_TYPES.SESSION_STARTED, { sessionId });

export const trackSessionEnd = (sessionId, durationMs) =>
  track(EVENT_TYPES.SESSION_ENDED, { sessionId, durationMs });
