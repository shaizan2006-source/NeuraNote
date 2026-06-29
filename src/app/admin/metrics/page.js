"use client";
/**
 * /admin/metrics â€” Core operational metrics dashboard
 *
 * Phase 9 Â§9.10 essentials:
 *   MRR Â· signup funnel Â· Day-7/30 retention cohorts Â· top AI spenders Â· daily signups sparkline
 *
 * Auth: must be in ADMIN_EMAILS (checked server-side).
 * Access: /admin/metrics â€” internal only.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmt(n, decimals = 0) {
  if (n == null) return "â€”";
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function fmtInr(n) {
  if (n == null) return "â€”";
  return "â‚¹" + fmt(Math.round(n));
}

function fmtPct(n) {
  if (n == null) return "â€”";
  return n.toFixed(1) + "%";
}

const PLAN_COLOR = {
  free: "#4B5563", student: "#3B82F6", pro: "#8B5CF6", family: "#06B6D4", school: "#10B981",
};

function PlanBadge({ plan }) {
  return (
    <span style={{
      display: "inline-block", padding: "1px 7px", borderRadius: 4,
      background: PLAN_COLOR[plan] ?? "#374151", color: "#fff",
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    }}>
      {plan}
    </span>
  );
}

// Tiny inline sparkline using SVG
function Sparkline({ data, color = "#8B5CF6", height = 40, width = 200 }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.signups), 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.signups / max) * (height - 4);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "20px 24px",
      minWidth: 160,
      flex: "1 1 160px",
    }}>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color ?? "#F9FAFB", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function MetricsDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not signed in"); setLoading(false); return; }

      const res = await fetch("/api/admin/metrics", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const S = { fontFamily: "Inter, -apple-system, sans-serif", color: "#fff", fontSize: 13 };

  return (
    <div style={{ ...S, minHeight: "100vh", background: "#0A0A0A", padding: "32px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Metrics Dashboard</h1>
        <button
          onClick={load}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: 12 }}
        >
          â†» Refresh
        </button>
      </div>
      <p style={{ color: "#4B5563", fontSize: 12, margin: "0 0 32px" }}>
        Phase 9 essential metrics Â· last updated {new Date().toLocaleString("en-IN")}
      </p>

      {error && (
        <div style={{ padding: "12px 16px", background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, color: "#fca5a5", marginBottom: 24, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: "#555" }}>Loading metricsâ€¦</p>}

      {data && (
        <>
          {/* â”€â”€ MRR + Funnel â”€â”€ */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 14px" }}>
              Revenue &amp; Funnel (last 30 days)
            </h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatCard
                label="MRR (est.)"
                value={fmtInr(data.mrr.mrr)}
                sub={`${data.mrr.totalPaid} active paid users`}
                color="#10B981"
              />
              <StatCard
                label="New Signups"
                value={fmt(data.funnel.signups)}
                sub="last 30 days"
              />
              <StatCard
                label="Paid Conversions"
                value={fmt(data.funnel.paid)}
                sub={`${fmtPct(data.funnel.convRate)} conv. rate`}
                color="#8B5CF6"
              />
              <StatCard
                label="Target Conv."
                value="12%"
                sub={`Gap: ${(12 - data.funnel.convRate).toFixed(1)}pp`}
                color={data.funnel.convRate >= 12 ? "#10B981" : "#F59E0B"}
              />
            </div>

            {/* Plan breakdown */}
            {data.mrr.breakdown && Object.keys(data.mrr.breakdown).length > 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(data.mrr.breakdown).map(([plan, count]) => (
                  <div key={plan} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <PlanBadge plan={plan} />
                    <span style={{ fontSize: 20, fontWeight: 700, color: PLAN_COLOR[plan] }}>{count}</span>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>users</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* â”€â”€ Daily signups sparkline â”€â”€ */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 14px" }}>
              Daily Signups (30d)
            </h2>
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "20px 24px",
            }}>
              <Sparkline data={data.dailySignups} width={Math.min(600, typeof window !== "undefined" ? window.innerWidth - 160 : 600)} height={60} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#4B5563" }}>
                <span>{data.dailySignups[0]?.date}</span>
                <span>{data.dailySignups[data.dailySignups.length - 1]?.date}</span>
              </div>
            </div>
          </section>

          {/* â”€â”€ Retention cohorts â”€â”€ */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 14px" }}>
              Retention Cohorts
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" }}>
                    {["Cohort", "Size", "Day-7 retention", "Day-30 retention"].map((h) => (
                      <th key={h} style={{ padding: "8px 14px", color: "#6B7280", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.retention ?? []).map((row) => (
                    <tr key={row.week} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "10px 14px", color: "#9CA3AF" }}>{row.week}</td>
                      <td style={{ padding: "10px 14px" }}>{row.cohortSize}</td>
                      <td style={{ padding: "10px 14px" }}>
                        {row.day7 == null ? <span style={{ color: "#374151" }}>â€”</span> : (
                          <span style={{ color: row.day7 >= 30 ? "#10B981" : row.day7 >= 15 ? "#F59E0B" : "#EF4444", fontWeight: 700 }}>
                            {fmtPct(row.day7)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {row.day30 == null ? <span style={{ color: "#374151" }}>â€”</span> : (
                          <span style={{ color: row.day30 >= 30 ? "#10B981" : row.day30 >= 15 ? "#F59E0B" : "#EF4444", fontWeight: 700 }}>
                            {fmtPct(row.day30)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!data.retention?.length) && (
                    <tr><td colSpan={4} style={{ padding: "20px 14px", color: "#374151", textAlign: "center" }}>
                      No retention data yet (needs spend tracking data from new signups)
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: "#374151", marginTop: 8 }}>
              Retention = had AI activity (spend &gt; $0) in the window. Proxy for engagement until dedicated event tracking is wired.
              Target: Day-7 ≥ 30% · Day-30 ≥ 20%
            </p>
          </section>

          {/* â”€â”€ Top AI spenders â”€â”€ */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 14px" }}>
              Top AI Spenders This Month
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" }}>
                    {["#", "Email", "Plan", "AI Spend (USD)", "Margin flag"].map((h) => (
                      <th key={h} style={{ padding: "8px 14px", color: "#6B7280", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.topSpenders ?? []).map((u, i) => {
                    const flag = u.spendUsd > 5 ? "ðŸ”´ Over limit" : u.spendUsd > 3 ? "ðŸŸ¡ Watch" : "ðŸŸ¢ OK";
                    return (
                      <tr key={u.userId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "10px 14px", color: "#4B5563" }}>{i + 1}</td>
                        <td style={{ padding: "10px 14px", color: "#E5E7EB" }}>{u.email}</td>
                        <td style={{ padding: "10px 14px" }}><PlanBadge plan={u.plan} /></td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ color: u.spendUsd > 5 ? "#EF4444" : u.spendUsd > 3 ? "#F59E0B" : "#10B981", fontWeight: 700 }}>
                            ${u.spendUsd.toFixed(3)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 11 }}>{flag}</td>
                      </tr>
                    );
                  })}
                  {(!data.topSpenders?.length) && (
                    <tr><td colSpan={5} style={{ padding: "20px 14px", color: "#374151", textAlign: "center" }}>
                      No AI spend recorded yet. Apply the Supabase migration to start tracking.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* â”€â”€ Pricing A/B test results â”€â”€ */}
          {data.abTest && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 14px" }}>
                Pricing A/B Test â€” {data.abTest.epoch}
              </h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {[
                  { v: "a", label: "â‚¹199/mo", color: "#3B82F6" },
                  { v: "b", label: "â‚¹399/mo (control)", color: "#8B5CF6" },
                  { v: "c", label: "â‚¹499/mo", color: "#EC4899" },
                ].map(({ v, label, color }) => (
                  <div key={v} style={{
                    background: "rgba(255,255,255,0.03)", border: `1px solid ${color}40`,
                    borderRadius: 12, padding: "16px 20px", minWidth: 150, flex: "1 1 150px",
                  }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>
                      Arm {v.toUpperCase()} Â· {label}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>
                      {fmtPct(data.abTest.convRates[v])}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                      {data.abTest.conversions[v]} paid / {data.abTest.counts[v]} assigned
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#374151", marginTop: 4 }}>
                Total assigned: {data.abTest.counts.total} users.
                Need ~500/arm for 80% power at 10% conversion difference.
                Activate by setting <code style={{ color: "#8B5CF6" }}>AB_TEST_PRICING_EPOCH</code> in Vercel env.
              </p>
            </section>
          )}

          {!data.abTest && (
            <section style={{ marginBottom: 36, padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12 }}>
              <p style={{ fontSize: 12, color: "#4B5563", margin: 0 }}>
                Pricing A/B test is not active.
                To activate: set <strong style={{ color: "#6B7280" }}>AB_TEST_PRICING_EPOCH=pro-price-2026-05</strong> in Vercel environment variables.
                Users will be randomly assigned to â‚¹199 / â‚¹399 / â‚¹499 Pro arms and results will appear here.
              </p>
            </section>
          )}

          {/* Navigation to other admin pages */}
          <div style={{ display: "flex", gap: 12, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24 }}>
            <a href="/admin/users" style={{ fontSize: 12, color: "#8B5CF6", textDecoration: "none" }}>â†’ User Management</a>
            <a href="/admin/trial-segments" style={{ fontSize: 12, color: "#8B5CF6", textDecoration: "none" }}>â†’ Trial Segments</a>
          </div>
        </>
      )}
    </div>
  );
}
