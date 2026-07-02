// src/components/support/TicketList.jsx
"use client";
import { useEffect, useState, useCallback } from "react";

const STATUS_META = {
  open:        { label: "Open",        color: "var(--info)" },
  in_progress: { label: "In progress", color: "var(--accent)" },
  resolved:    { label: "Resolved",    color: "var(--success)" },
};

const CATEGORY_LABEL = {
  bug: "Bug", billing: "Billing", feature_request: "Feature request",
  account: "Account", other: "Other",
};

export default function TicketList({ token, refreshKey = 0 }) {
  const [tickets, setTickets] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/support", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setTickets(await res.json());
    } catch {
      setTickets([]);
    }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, refreshKey, load]);

  if (tickets === null) {
    return <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Loading…</p>;
  }
  if (tickets.length === 0) {
    return <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>No requests yet.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tickets.map(t => {
        const status = STATUS_META[t.status] ?? STATUS_META.open;
        return (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)", borderRadius: 10,
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.subject}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>
                {CATEGORY_LABEL[t.category] ?? t.category} · {new Date(t.created_at).toLocaleDateString()}
              </p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: status.color, whiteSpace: "nowrap",
              textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
            }}>
              ● {status.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
