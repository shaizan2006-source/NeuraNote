"use client";
/**
 * /admin/tickets — support ticket triage.
 * Auth: must be in ADMIN_EMAILS (enforced server-side in /api/admin/tickets).
 */
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const STATUSES = ["open", "in_progress", "resolved"];
const STATUS_COLOR = {
  open:        "var(--info)",
  in_progress: "var(--accent)",
  resolved:    "var(--success)",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState(null);
  const [filter,  setFilter]  = useState("");
  const [error,   setError]   = useState(null);
  const [openId,  setOpenId]  = useState(null);

  async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  async function load(status = filter) {
    setError(null);
    try {
      const qs  = status ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/tickets${qs}`, { headers: await authHeader() });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setTickets(await res.json());
    } catch (err) {
      setError(err.message);
      setTickets([]);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id, status) {
    setTickets(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
    const res = await fetch("/api/admin/tickets", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body:    JSON.stringify({ id, status }),
    });
    if (!res.ok) load(); // revert optimistic update on failure
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: 40, fontFamily: "inherit" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Support tickets</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "0 0 24px" }}>
          Status updates are service-role only — this page is the only writer.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["", ...STATUSES].map(s => (
            <button
              key={s || "all"}
              onClick={() => { setFilter(s); load(s); }}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${filter === s ? "var(--border-strong)" : "var(--border-hairline)"}`,
                background: filter === s ? "var(--bg-surface-2)" : "transparent",
                color: filter === s ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
            >
              {s === "" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {error && <p style={{ color: "var(--error)", fontSize: 13 }}>{error}</p>}
        {tickets === null && <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading…</p>}
        {tickets?.length === 0 && !error && (
          <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No tickets{filter ? ` with status ${filter}` : ""}.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tickets?.map(t => (
            <div key={t.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: STATUS_COLOR[t.status], fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  ● {t.status.replace("_", " ")}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.category}</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: "auto" }}>
                  {new Date(t.created_at).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: "8px 0 2px", fontSize: 14, fontWeight: 600 }}>{t.subject}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>{t.email ?? t.user_id}</p>
              <p
                onClick={() => setOpenId(openId === t.id ? null : t.id)}
                style={{
                  margin: "8px 0 0", fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", lineHeight: 1.6,
                  ...(openId === t.id ? {} : { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }),
                }}
              >
                {t.message}
              </p>
              {t.screenshot_url && (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
                  Screenshot (open in Supabase → support-screenshots): <code>{t.screenshot_url}</code>
                </p>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                {STATUSES.filter(s => s !== t.status).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(t.id, s)}
                    style={{
                      padding: "4px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      border: "1px solid var(--border-hairline)", background: "var(--bg-surface-2)", color: "var(--text-secondary)",
                    }}
                  >
                    Mark {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
