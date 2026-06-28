"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const TYPE_COLOR = {
  definition:   "#D4AF6E",
  theorem:      "#EACF96",
  procedure:    "#F5B544",
  formula:      "#34D399",
  argument:     "#F0584F",
  case:         "#9A7E44",
  relationship: "#6B6B70",
};

const RATINGS = [
  { id: "again", label: "Again",  color: "#F0584F", key: "1" },
  { id: "hard",  label: "Hard",   color: "#F5B544", key: "2" },
  { id: "good",  label: "Good",   color: "#8AA0B4", key: "3" },
  { id: "easy",  label: "Easy",   color: "#34D399", key: "4" },
];

export default function StudyPage() {
  const [token,    setToken]    = useState(null);
  const [queue,    setQueue]    = useState([]);
  const [idx,      setIdx]      = useState(0);
  const [flipped,  setFlipped]  = useState(false);
  const [status,   setStatus]   = useState("loading"); // loading | ready | done | error
  const [reviewed, setReviewed] = useState(0);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data?.session?.access_token;
      if (!t) { window.location.href = "/login"; return; } // F-018: redirect logged-out users
      setToken(t);
    });
  }, []);

  // Load cards once we have a token
  useEffect(() => {
    if (!token) return;
    fetch("/api/cards/due?limit=20", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(({ cards, error }) => {
        if (error) throw new Error(error);
        setQueue(cards ?? []);
        setStatus(cards?.length ? "ready" : "done");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  // Keyboard: space = flip, 1-4 = rate
  useEffect(() => {
    if (status !== "ready") return;
    const handler = (e) => {
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (flipped) {
        const rating = RATINGS.find((r) => r.key === e.key);
        if (rating) submitRating(rating.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status, flipped]);  // eslint-disable-line react-hooks/exhaustive-deps

  const submitRating = useCallback(async (rating) => {
    const card = queue[idx];
    if (!card) return;

    await fetch(`/api/cards/${card.id}/review`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });

    setReviewed((n) => n + 1);
    const next = idx + 1;
    if (next >= queue.length) {
      setStatus("done");
    } else {
      setIdx(next);
      setFlipped(false);
    }
  }, [queue, idx, token]);

  // ── Render states ────────────────────────────────────────────────────────
  if (status === "loading") return <Shell><Spinner /></Shell>;
  if (status === "error")   return <Shell><ErrorMsg /></Shell>;
  if (status === "done")    return <Shell><DoneScreen reviewed={reviewed} total={queue.length} /></Shell>;

  const card    = queue[idx];
  const concept = card.concept ?? {};
  const typeColor = TYPE_COLOR[concept.type] ?? "#6B6B70";
  const remaining = queue.length - idx;

  return (
    <div style={{
      minHeight:  "100vh",
      background: "linear-gradient(135deg, var(--bg-base) 0%, var(--bg-surface-2) 50%, var(--bg-elevated) 100%)",
      display:    "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter, sans-serif",
      padding:    "24px",
      gap:        "24px",
    }}>
      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", fontSize: 13, marginBottom: 8 }}>
          <span>{reviewed} reviewed</span>
          <span>{remaining} left</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
          <div style={{
            height: "100%",
            width:  `${(reviewed / queue.length) * 100}%`,
            background: "var(--accent-grad)",
            borderRadius: 2,
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        style={{
          width:        "100%",
          maxWidth:     640,
          minHeight:    280,
          background:   "rgba(255,255,255,0.04)",
          border:       "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding:      "36px 40px",
          cursor:       "pointer",
          display:      "flex",
          flexDirection: "column",
          gap:          16,
          userSelect:   "none",
          transition:   "background 0.15s",
        }}
      >
        {/* Type badge */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: typeColor,
            background: `${typeColor}22`,
            padding: "3px 10px",
            borderRadius: 20,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {concept.type ?? card.type}
          </span>
          {concept.difficulty && (
            <span style={{ fontSize: 11, color: "var(--text-disabled)" }}>d{concept.difficulty}</span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-disabled)" }}>
            {flipped ? "answer" : "question · click to reveal"}
          </span>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          fontSize: flipped ? 15 : 18,
          fontWeight: flipped ? 400 : 600,
          color: flipped ? "var(--text-secondary)" : "var(--text-primary)",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}>
          {flipped ? card.back : card.front}
        </div>

        {!flipped && (
          <div style={{ fontSize: 12, color: "var(--text-disabled)", textAlign: "center" }}>
            Press <kbd style={{ background: "var(--bg-surface-2)", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border-strong)" }}>Space</kbd> to flip
          </div>
        )}
      </div>

      {/* Rating buttons — only shown after flip */}
      {flipped && (
        <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 640 }}>
          {RATINGS.map((r) => (
            <button
              key={r.id}
              onClick={() => submitRating(r.id)}
              style={{
                flex:         1,
                padding:      "14px 0",
                borderRadius: 12,
                border:       `1px solid ${r.color}44`,
                background:   `${r.color}18`,
                color:        r.color,
                fontWeight:   600,
                fontSize:     14,
                cursor:       "pointer",
                fontFamily:   "Inter, sans-serif",
                display:      "flex",
                flexDirection: "column",
                alignItems:   "center",
                gap:          4,
                transition:   "background 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = `${r.color}30`}
              onMouseLeave={(e) => e.currentTarget.style.background = `${r.color}18`}
            >
              {r.label}
              <span style={{ fontSize: 10, opacity: 0.5 }}>[{r.key}]</span>
            </button>
          ))}
        </div>
      )}

      {/* Concept title footer */}
      <div style={{ color: "var(--text-disabled)", fontSize: 12 }}>
        {concept.title && `Concept: ${concept.title}`}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div style={{
      minHeight:      "100vh",
      background:     "linear-gradient(135deg, var(--bg-base) 0%, var(--bg-surface-2) 50%, var(--bg-elevated) 100%)",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      fontFamily:     "Inter, sans-serif",
    }}>
      {children}
    </div>
  );
}

function Spinner() {
  return <div style={{ color: "var(--text-tertiary)", fontSize: 14 }}>Loading cards…</div>;
}

function ErrorMsg() {
  return (
    <div style={{ textAlign: "center", color: "var(--error)" }}>
      <div style={{ fontSize: 18, marginBottom: 8 }}>Could not load cards</div>
      <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
        Make sure you&apos;re signed in and have uploaded documents.
      </div>
      <a href="/dashboard" style={{ color: "var(--accent)", fontSize: 13, marginTop: 16, display: "block" }}>
        ← Back to dashboard
      </a>
    </div>
  );
}

function DoneScreen({ reviewed, total }) {
  return (
    <div style={{ textAlign: "center", color: "var(--text-primary)" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Session complete</div>
      <div style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 32 }}>
        {reviewed > 0
          ? `Reviewed ${reviewed} of ${total} cards`
          : "No cards due right now — check back later"}
      </div>
      <a href="/dashboard" style={{
        display:      "inline-block",
        padding:      "12px 32px",
        borderRadius: 12,
        background:   "var(--accent-grad)",
        color:        "var(--bg-base)",
        fontWeight:   600,
        fontSize:     14,
        textDecoration: "none",
      }}>
        Back to dashboard
      </a>
    </div>
  );
}
