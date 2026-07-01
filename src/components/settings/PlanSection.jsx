// src/components/settings/PlanSection.jsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SettingsCard, SettingsGroup, GoldButton } from "./SettingsShell";
import PremiumMark from "@/components/brand/PremiumMark";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const PLAN_COLORS = {
  free:    { bg: "var(--bg-surface-2)",  color: "var(--text-tertiary)", label: "Free" },
  student: { bg: "color-mix(in srgb, var(--info) 12%, transparent)", color: "var(--info)", label: "Student" },
  pro:     { bg: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", label: "Pro" },
  proplus: { bg: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", label: "Pro+" },
  family:  { bg: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", label: "Family" },
  school:  { bg: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)", label: "School" },
};

function UsageBar({ label, used, limit }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
        <span>{label}</span>
        <span>{limit ? `${used} / ${limit}` : <span style={{ color: "var(--success)" }}>Unlimited</span>}</span>
      </div>
      {limit && (
        <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent-grad)", borderRadius: 3, transition: "width 0.5s ease" }} />
        </div>
      )}
    </div>
  );
}

export default function PlanSection({ user }) {
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/settings/plan", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  const plan     = data?.plan ?? "free";
  const planMeta = PLAN_COLORS[plan] ?? PLAN_COLORS.free;
  const isFree   = plan === "free";
  const expiresAt = data?.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Your Plan</h1>

      <SettingsGroup label="Current plan">
        <SettingsCard>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isFree ? 20 : 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: planMeta.bg, color: planMeta.color }}>
              {planMeta.label}
            </span>
            {expiresAt && <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Renews {expiresAt}</span>}
          </div>

          {isFree ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <PremiumMark size={28} glow />
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Unlock unlimited questions, PDFs, and more</p>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-tertiary)" }}>Starting at ₹199/month. Cancel anytime.</p>
                <GoldButton onClick={() => router.push("/pricing")}>Upgrade now</GoldButton>
              </div>
            </div>
          ) : (
            <GoldButton outline onClick={() => router.push("/pricing")}>Manage subscription</GoldButton>
          )}
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="Usage">
        <SettingsCard>
          {loading ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Loading usage…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <UsageBar label="Questions today" used={data?.qaUsedToday ?? 0} limit={data?.qaLimit}  />
              <UsageBar label="PDFs uploaded"   used={data?.pdfCount    ?? 0} limit={data?.pdfLimit} />
            </div>
          )}
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
