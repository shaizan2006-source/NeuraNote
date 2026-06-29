"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SEGMENT_COLORS = {
  high_intent: "#10B981",
  low_intent:  "#F59E0B",
  dead:        "#EF4444",
  unevaluated: "#6B7280",
};

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "shaizan2006@gmail.com";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function TrialSegmentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState(null);

  const checkAdmin = useCallback(async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === ADMIN_EMAIL) setIsAdmin(true);
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    let q = supabase
      .from("trial_segments")
      .select("user_id, segment, signals, intervention_triggered, intervention_sent_at, evaluated_at, trial_started_at, trial_ends_at")
      .order("evaluated_at", { ascending: false })
      .limit(100);

    if (filter !== "all") q = q.eq("segment", filter);

    const { data } = await q;
    setRows(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { checkAdmin(); }, [checkAdmin]);
  useEffect(() => { if (isAdmin) fetchRows(); }, [isAdmin, fetchRows]);

  const triggerDryRun = async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cron/trial-d3-segment", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
          "x-dry-run": "true",
        },
      });
      const json = await res.json();
      setCronResult(json);
    } catch (err) {
      setCronResult({ error: err.message });
    } finally {
      setCronRunning(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, color: "#9CA3AF", fontFamily: "monospace" }}>
        Access denied.
      </div>
    );
  }

  const counts = rows.reduce((acc, r) => {
    acc[r.segment] = (acc[r.segment] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: "24px 32px", background: "#0A0A0A", minHeight: "100vh", color: "#F9FAFB", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Trial Segments â€” Day 3</h1>
      <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 24 }}>
        Shows the most recent 100 rows from <code>trial_segments</code>.
        Cron runs daily at 6pm IST.
      </p>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {Object.entries(SEGMENT_COLORS).map(([seg, color]) => (
          <div key={seg} style={{
            background: `${color}22`, border: `1px solid ${color}55`,
            borderRadius: 8, padding: "6px 14px", fontSize: 13,
          }}>
            <span style={{ color }}>{seg}</span>
            <span style={{ color: "#9CA3AF", marginLeft: 8 }}>{counts[seg] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Filter + dry-run controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px", color: "#F9FAFB", fontSize: 13 }}
        >
          <option value="all">All segments</option>
          <option value="high_intent">high_intent</option>
          <option value="low_intent">low_intent</option>
          <option value="dead">dead</option>
        </select>

        <button
          onClick={triggerDryRun}
          disabled={cronRunning}
          style={{
            background: cronRunning ? "rgba(255,255,255,0.04)" : "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.4)",
            borderRadius: 8, padding: "6px 16px", color: cronRunning ? "#6B7280" : "#A78BFA",
            fontSize: 13, cursor: cronRunning ? "not-allowed" : "pointer",
          }}
        >
          {cronRunning ? "Runningâ€¦" : "Dry-run cron now"}
        </button>

        {cronResult && (
          <pre style={{ fontSize: 11, color: "#6B7280", margin: 0, background: "rgba(255,255,255,0.04)", padding: "4px 10px", borderRadius: 6 }}>
            {JSON.stringify(cronResult)}
          </pre>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "#6B7280", fontSize: 13 }}>Loadingâ€¦</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#6B7280", fontSize: 13 }}>No rows yet. Run the cron or wait for Day 3 trial users.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["User ID", "Segment", "Days active", "Briefings", "Questions", "FSRS cards", "Intervention", "Sent at", "Evaluated at"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#6B7280", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const s = row.signals ?? {};
                const color = SEGMENT_COLORS[row.segment] ?? "#6B7280";
                return (
                  <tr key={row.user_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "8px 12px", color: "#9CA3AF", fontFamily: "monospace" }}>
                      {row.user_id.slice(0, 8)}â€¦
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ color, fontWeight: 600 }}>{row.segment}</span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#E5E7EB" }}>{s.days_active ?? "â€”"}</td>
                    <td style={{ padding: "8px 12px", color: "#E5E7EB" }}>{s.briefings_opened ?? "â€”"}</td>
                    <td style={{ padding: "8px 12px", color: "#E5E7EB" }}>{s.questions_asked ?? "â€”"}</td>
                    <td style={{ padding: "8px 12px", color: "#E5E7EB" }}>{s.fsrs_cards_reviewed ?? "â€”"}</td>
                    <td style={{ padding: "8px 12px", color: "#9CA3AF", fontSize: 11 }}>
                      {row.intervention_triggered ?? "none"}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#6B7280", fontSize: 11 }}>
                      {row.intervention_sent_at ? new Date(row.intervention_sent_at).toLocaleString("en-IN") : "â€”"}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#6B7280", fontSize: 11 }}>
                      {new Date(row.evaluated_at).toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
