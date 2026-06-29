"use client";
/**
 * /admin/users â€” User management dashboard
 *
 * Shows: email, plan, plan expiry, last sign-in, current-month AI spend.
 * Actions: change plan (with optional custom expiry).
 *
 * Auth: must be in ADMIN_EMAILS (checked server-side in /api/admin/users).
 * Access: internal only â€” not linked from main nav.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PLAN_COLORS = {
  free:    { bg: "#374151", text: "#9CA3AF", label: "Free"    },
  student: { bg: "#1D4ED8", text: "#93C5FD", label: "Student" },
  pro:     { bg: "#6D28D9", text: "#C4B5FD", label: "Pro"     },
  family:  { bg: "#0D6EFD", text: "#BAE6FD", label: "Family"  },
  school:  { bg: "#065F46", text: "#6EE7B7", label: "School"  },
};

function PlanBadge({ plan }) {
  const c = PLAN_COLORS[plan] ?? PLAN_COLORS.free;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      background: c.bg,
      color: c.text,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
    }}>
      {c.label}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return "â€”";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(iso) {
  if (!iso) return "â€”";
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30)  return `${diffDays}d ago`;
  return fmtDate(iso);
}

// â”€â”€ Plan change modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ChangePlanModal({ user, onClose, onSave }) {
  const [plan, setPlan]   = useState(user.plan);
  const [exp,  setExp]    = useState("");
  const [busy, setBusy]   = useState(false);
  const [msg,  setMsg]    = useState("");

  async function handleSave() {
    setBusy(true);
    setMsg("");
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action:    "change_plan",
          userId:    user.id,
          plan,
          expiresAt: exp || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setMsg("âœ… Plan updated");
      setTimeout(() => { onSave({ ...user, plan }); onClose(); }, 800);
    } catch (err) {
      setMsg(`âŒ ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
    }}>
      <div style={{
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: 32,
        width: 400,
        fontFamily: "Inter, sans-serif",
        color: "#fff",
      }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Change plan</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>{user.email}</p>

        <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 6 }}>Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          style={{
            width: "100%", padding: "8px 10px",
            background: "#111", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6, color: "#fff", fontSize: 13, marginBottom: 16,
          }}
        >
          {["free", "student", "pro", "family", "school"].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>

        {plan !== "free" && (
          <>
            <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 6 }}>
              Expiry date <span style={{ color: "#555" }}>(leave blank = +1 year)</span>
            </label>
            <input
              type="date"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
              style={{
                width: "100%", padding: "8px 10px",
                background: "#111", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6, color: "#fff", fontSize: 13, marginBottom: 20,
                boxSizing: "border-box",
              }}
            />
          </>
        )}

        {msg && <p style={{ fontSize: 13, color: msg.startsWith("âœ…") ? "#10B981" : "#EF4444", marginBottom: 12 }}>{msg}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#ccc", cursor: "pointer", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#6D28D9", color: "#fff", cursor: busy ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {busy ? "Savingâ€¦" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AdminUsersPage() {
  const [users,     setUsers]     = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [planFilter,setPlanFilter] = useState("all");
  const [selected,  setSelected]  = useState(null); // user for modal
  const [error,     setError]     = useState(null);

  const LIMIT = 50;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not signed in"); setLoading(false); return; }

      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)              params.set("search", search);
      if (planFilter !== "all") params.set("plan", planFilter);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");

      setUsers(json.users ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounced search â€” wait 400ms after last keystroke
  function handleSearch(val) {
    setSearch(val);
    setPage(1);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0A",
      color: "#fff",
      fontFamily: "Inter, -apple-system, sans-serif",
      padding: "32px 40px",
    }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>User Management</h1>
      <p style={{ fontSize: 13, color: "#555", margin: "0 0 28px" }}>
        {total.toLocaleString()} total users Â· sorted by AI spend this month
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          type="search"
          placeholder="Search by emailâ€¦"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            padding: "8px 14px",
            background: "#111", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, color: "#fff", fontSize: 13, width: 280,
          }}
        />
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          style={{
            padding: "8px 12px",
            background: "#111", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, color: "#fff", fontSize: 13,
          }}
        >
          <option value="all">All plans</option>
          {["free", "student", "pro", "family", "school"].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={fetchUsers}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13 }}
        >
          â†» Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, color: "#fca5a5", marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p style={{ color: "#555", fontSize: 14 }}>Loadingâ€¦</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" }}>
                {["Email", "Plan", "Plan expires", "Last active", "AI spend (mo)", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", color: "#666", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "24px 12px", color: "#555", textAlign: "center" }}>No users found.</td></tr>
              )}
              {users.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ color: "#e5e7eb" }}>{u.email}</span>
                    {u.role === "internal_dev" && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>DEV</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}><PlanBadge plan={u.plan} /></td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{fmtDate(u.planExpires)}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{fmtRelative(u.lastSignIn)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      color: u.spendUsd > 5 ? "#ef4444" : u.spendUsd > 2 ? "#f59e0b" : "#10b981",
                      fontWeight: u.spendUsd > 2 ? 700 : 400,
                    }}>
                      ${u.spendUsd.toFixed(3)}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button
                      onClick={() => setSelected(u)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(109,40,217,0.5)",
                        background: "transparent",
                        color: "#a78bfa",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Change plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, alignItems: "center" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: page === 1 ? "#333" : "#aaa", cursor: page === 1 ? "default" : "pointer", fontSize: 12 }}
          >
            â† Prev
          </button>
          <span style={{ fontSize: 12, color: "#555" }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: page === totalPages ? "#333" : "#aaa", cursor: page === totalPages ? "default" : "pointer", fontSize: 12 }}
          >
            Next â†’
          </button>
        </div>
      )}

      {/* Plan change modal */}
      {selected && (
        <ChangePlanModal
          user={selected}
          onClose={() => setSelected(null)}
          onSave={(updated) => {
            setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
