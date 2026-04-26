"use client";

/**
 * /dev/backfill — internal admin tool.
 *
 * Lists all of the caller's documents with their concept_extraction_status,
 * provides a "Backfill next batch" button (POSTs to /api/concepts/backfill),
 * and per-doc retry buttons for failed extractions.
 *
 * Polls the documents list every 3s while anything is 'running' so status
 * transitions are visible without a manual refresh.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const STATUS_COLOR = {
  pending:     "#888",
  running:     "#F59E0B",
  done:        "#10B981",
  failed:      "#EF4444",
  skipped_ocr: "#888",
  null:        "#555",
};

export default function BackfillPage() {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState(null);
  const [err, setErr]         = useState(null);
  const tokenRef = useRef(null);

  // Load token once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      tokenRef.current = data?.session?.access_token ?? null;
      if (!tokenRef.current) {
        setErr("Not signed in");
        setLoading(false);
        return;
      }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll while any doc is 'running'
  useEffect(() => {
    const anyRunning = docs.some((d) => d.concept_extraction_status === "running");
    if (!anyRunning) return;
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  async function refresh() {
    try {
      const res = await fetch("/api/documents", {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load documents");
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runBackfill(body = {}) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      // Ensure we have a fresh token before making the request
      let token = tokenRef.current;
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token;
        if (!token) throw new Error("Not signed in");
        tokenRef.current = token;
      }

      const res = await fetch("/api/concepts/backfill", {
        method: "POST",
        headers: {
          Authorization:   `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Backfill failed");
      setMsg(json.queued === 0 ? "Nothing to backfill." : `Queued ${json.queued} doc(s).`);
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(() => {
    const s = { pending: 0, running: 0, done: 0, failed: 0, skipped_ocr: 0, none: 0 };
    for (const d of docs) {
      const key = d.concept_extraction_status ?? "none";
      s[key] = (s[key] ?? 0) + 1;
    }
    return s;
  }, [docs]);

  return (
    <div style={shellStyle}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Concept Extraction — Backfill</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            Internal tool. Kick off concept graph extraction for documents that
            don&apos;t have one yet.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => runBackfill({ limit: 3 })}
            disabled={busy || loading}
            style={btnPrimary(busy || loading)}
          >
            {busy ? "Queuing…" : "Backfill next 3"}
          </button>
          <button
            onClick={() => runBackfill({ limit: 10 })}
            disabled={busy || loading}
            style={btnSecondary(busy || loading)}
          >
            Backfill next 10
          </button>
        </div>
      </div>

      {msg && <div style={msgStyle("ok")}>{msg}</div>}
      {err && <div style={msgStyle("err")}>{err}</div>}

      <div style={summaryStyle}>
        {Object.entries(summary).map(([k, v]) => (
          <div key={k} style={pillStyle(STATUS_COLOR[k] ?? "#555")}>
            <span style={{ opacity: 0.7 }}>{k}</span>
            <strong style={{ marginLeft: 6 }}>{v}</strong>
          </div>
        ))}
      </div>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Document</th>
              <th style={thStyle}>Subject</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Concepts</th>
              <th style={thStyle}>Error</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={tdEmpty}>Loading…</td></tr>
            )}
            {!loading && docs.length === 0 && (
              <tr><td colSpan={6} style={tdEmpty}>No documents yet.</td></tr>
            )}
            {docs.map((d) => {
              const status = d.concept_extraction_status ?? "none";
              const color  = STATUS_COLOR[status] ?? "#555";
              const canRetry = status === "failed" || status === "pending" || status === "none";
              return (
                <tr key={d.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: "#666" }}>{d.id}</div>
                  </td>
                  <td style={tdStyle}>{d.subject ?? "—"}</td>
                  <td style={tdStyle}>
                    <span style={{ color, fontWeight: 600 }}>{status}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{d.concepts_count ?? 0}</td>
                  <td style={{ ...tdStyle, color: "#EF4444", fontSize: 11, maxWidth: 260 }}>
                    {d.concept_extraction_error ?? ""}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/dev/graph/${d.id}`} style={linkBtn}>View graph</Link>
                      {canRetry && (
                        <button
                          onClick={() => runBackfill({ documentId: d.id })}
                          disabled={busy}
                          style={btnSecondary(busy)}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Styles (inline; this is a dev-only page) ────────────────────────────

const shellStyle = {
  minHeight: "100vh",
  background: "#0A0A0A",
  color: "#fff",
  fontFamily: "Inter, sans-serif",
  padding: "28px 32px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 20,
};

const summaryStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 20,
};

const pillStyle = (color) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: `1px solid ${color}33`,
  background: `${color}11`,
  fontSize: 12,
  color,
});

const tableWrap = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  overflow: "hidden",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle = {
  textAlign: "left",
  padding: "10px 14px",
  fontWeight: 600,
  fontSize: 11,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  background: "#111",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const tdStyle = { padding: "12px 14px", verticalAlign: "top" };
const tdEmpty = { padding: "24px", textAlign: "center", color: "#666" };

const linkBtn = {
  padding: "4px 10px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  textDecoration: "none",
  fontSize: 12,
};

const btnPrimary = (disabled) => ({
  padding: "8px 14px",
  borderRadius: 8,
  background: disabled ? "#333" : "#8B5CF6",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 13,
});

const btnSecondary = (disabled) => ({
  padding: "6px 10px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: 12,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

const msgStyle = (kind) => ({
  padding: "10px 14px",
  borderRadius: 8,
  marginBottom: 16,
  fontSize: 13,
  background: kind === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
  border: `1px solid ${kind === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
  color: kind === "ok" ? "#10B981" : "#EF4444",
});
