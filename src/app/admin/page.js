"use client";
/**
 * /admin â€” Internal operations hub
 * Links to all admin tools. Requires ADMIN_EMAILS authentication
 * (each linked page enforces auth independently).
 */
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const TOOLS = [
  {
    href:  "/admin/metrics",
    icon:  "ðŸ“Š",
    title: "Metrics Dashboard",
    desc:  "MRR, funnel, Day-7/30 retention, top AI spenders, pricing A/B results.",
    badge: "Core",
    color: "#8B5CF6",
  },
  {
    href:  "/admin/users",
    icon:  "ðŸ‘¥",
    title: "User Management",
    desc:  "Paginated user list with plan, AI spend, last active. Change plan / grant access.",
    badge: "Ops",
    color: "#3B82F6",
  },
  {
    href:  "/admin/trial-segments",
    icon:  "ðŸŽ¯",
    title: "Trial Segments",
    desc:  "High/low intent trial users. Manually trigger D3/D5 interventions.",
    badge: "Growth",
    color: "#10B981",
  },
  {
    href:  "/admin/pyqs",
    icon:  "ðŸ“",
    title: "PYQ Manager",
    desc:  "Ingest and review Previous Year Questions for JEE, NEET, UPSC, GATE.",
    badge: "Content",
    color: "#F59E0B",
  },
  {
    href:  "/dev/backfill",
    icon:  "ðŸ”„",
    title: "Concept Backfill",
    desc:  "Re-run concept extraction for documents missing a Brain Map. Dev/internal only.",
    badge: "Dev",
    color: "#6B7280",
  },
  {
    href:  "/dev/graph",
    icon:  "ðŸ§ ",
    title: "Graph Debug Viewer",
    desc:  "Inspect raw concept graph for any document. Dev environment only.",
    badge: "Dev",
    color: "#6B7280",
  },
];

const BADGE_COLORS = {
  Core:    { bg: "rgba(139,92,246,0.15)", text: "#C4B5FD" },
  Ops:     { bg: "rgba(59,130,246,0.15)", text: "#93C5FD" },
  Growth:  { bg: "rgba(16,185,129,0.15)", text: "#6EE7B7" },
  Content: { bg: "rgba(245,158,11,0.15)", text: "#FCD34D" },
  Dev:     { bg: "rgba(107,114,128,0.15)", text: "#9CA3AF" },
};

export default function AdminIndex() {
  const [email, setEmail] = useState(null);

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0A",
      color: "#fff",
      fontFamily: "Inter, -apple-system, sans-serif",
      padding: "40px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
          Ask My Notes â€” Internal Tools
        </h1>
        {email && (
          <p style={{ fontSize: 13, color: "#4B5563", margin: "0 0 36px" }}>
            Signed in as {email}
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {TOOLS.map((tool) => {
            const badge = BADGE_COLORS[tool.badge] ?? BADGE_COLORS.Dev;
            return (
              <a
                key={tool.href}
                href={tool.href}
                style={{
                  display:        "block",
                  background:     "rgba(255,255,255,0.03)",
                  border:         `1px solid ${tool.color}30`,
                  borderRadius:   14,
                  padding:        "22px 24px",
                  textDecoration: "none",
                  color:          "inherit",
                  transition:     "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background    = `${tool.color}12`;
                  e.currentTarget.style.borderColor   = `${tool.color}60`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background    = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor   = `${tool.color}30`;
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{tool.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#F9FAFB" }}>{tool.title}</span>
                  <span style={{
                    marginLeft:   "auto",
                    fontSize:     10,
                    fontWeight:   700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding:      "2px 8px",
                    borderRadius: 4,
                    background:   badge.bg,
                    color:        badge.text,
                  }}>
                    {tool.badge}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
                  {tool.desc}
                </p>
              </a>
            );
          })}
        </div>

        <div style={{
          marginTop: 48,
          padding:   "16px 20px",
          background: "rgba(255,255,255,0.02)",
          border:    "1px dashed rgba(255,255,255,0.06)",
          borderRadius: 10,
          fontSize:  12,
          color:     "#374151",
          lineHeight: 1.7,
        }}>
          <strong style={{ color: "#4B5563" }}>New env vars to configure in Vercel:</strong><br />
          <code style={{ color: "#8B5CF6" }}>AB_TEST_PRICING_EPOCH</code> â€” set to activate pricing A/B (e.g. <code>pro-price-2026-05</code>)<br />
          <code style={{ color: "#8B5CF6" }}>VOICE_PROPLUS_ENABLED=true</code> + <code style={{ color: "#8B5CF6" }}>NEXT_PUBLIC_VOICE_PROPLUS_ENABLED=true</code> â€” activate Pro+ voice tier<br />
          <code style={{ color: "#8B5CF6" }}>AI_BUDGET_FREE_USD</code> / <code style={{ color: "#8B5CF6" }}>AI_BUDGET_STUDENT_USD</code> / <code style={{ color: "#8B5CF6" }}>AI_BUDGET_PRO_USD</code> â€” override monthly AI spend caps<br />
          <code style={{ color: "#8B5CF6" }}>ADMIN_EMAILS</code> â€” comma-separated admin email list (default: shaizan2006@gmail.com)
        </div>
      </div>
    </div>
  );
}
