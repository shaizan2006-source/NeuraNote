/**
 * GET /api/admin/metrics
 *
 * Returns the core operational metrics needed for the Phase 9 dashboard:
 *   - MRR (current month paid subscriptions × plan price)
 *   - Funnel (signups → trial → paid, last 30 days)
 *   - Day-7 and Day-30 retention by signup cohort (last 8 weeks)
 *   - Top 20 users by AI cost this month
 *   - New signups per day (last 30 days, for sparkline)
 *
 * Auth: Bearer token, must be in ADMIN_EMAILS.
 * All queries use service role (bypasses RLS).
 */

import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin as supabase } from "@/lib/serverAuth";
import { PRICING_AMOUNTS } from "@/lib/pricing";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "shaizan2006@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

async function requireAdmin(req) {
  const user = await verifyAuth(req);
  if (!user) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase()))
    return { err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { err: null };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function firstOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Plan price in INR (monthly equivalent)
const PLAN_MONTHLY_INR = {
  student: PRICING_AMOUNTS.student.monthly / 100,
  pro:     PRICING_AMOUNTS.pro.monthly / 100,
  family:  PRICING_AMOUNTS.family.yearly / 100 / 12,
  school:  0,  // B2B — exclude from automated MRR
  free:    0,
};

// ── Metric queries (run in parallel) ──────────────────────────────────────

async function getMRR() {
  const { data, error } = await supabase
    .from("user_plans")
    .select("plan, expires_at")
    .gt("expires_at", new Date().toISOString());

  if (error) throw error;

  const active = (data ?? []).filter((r) => r.plan !== "free" && r.plan !== "school");
  const mrr = active.reduce((sum, r) => sum + (PLAN_MONTHLY_INR[r.plan] ?? 0), 0);

  const breakdown = {};
  for (const r of active) {
    breakdown[r.plan] = (breakdown[r.plan] ?? 0) + 1;
  }

  return { mrr, totalPaid: active.length, breakdown };
}

async function getFunnel() {
  const since = daysAgo(30);

  // New signups in last 30 days
  const { data: signups, error: signupsErr } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (signupsErr) throw signupsErr;

  const recentSignups = (signups.users ?? []).filter(
    (u) => u.created_at >= since
  );

  // How many of those started a trial or became paid
  const recentIds = recentSignups.map((u) => u.id);

  let trialCount = 0;
  let paidCount  = 0;

  if (recentIds.length > 0) {
    const { data: plans, error: plansErr } = await supabase
      .from("user_plans")
      .select("user_id, plan")
      .in("user_id", recentIds);

    if (plansErr) throw plansErr;

    for (const p of plans ?? []) {
      if (p.plan === "free")   trialCount++;  // free = in-trial
      else                     paidCount++;   // any paid plan
    }
    // users with no plan row are also free/trial
    trialCount += recentIds.length - (plans ?? []).length;
  }

  return {
    signups:    recentSignups.length,
    trial:      trialCount,
    paid:       paidCount,
    convRate:   recentSignups.length > 0
      ? +((paidCount / recentSignups.length) * 100).toFixed(1)
      : 0,
  };
}

async function getRetention() {
  // Proxy: users who had at least one AI call in week N after signup
  // Using user_ai_spend_daily as the activity signal.
  const results = [];

  for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
    const cohortStart = daysAgo(7 * (weekOffset + 1));
    const cohortEnd   = daysAgo(7 * weekOffset);

    // Users who signed up in this cohort window
    const { data: signups } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const cohort = (signups?.users ?? []).filter(
      (u) => u.created_at >= cohortStart && u.created_at < cohortEnd
    );

    if (cohort.length === 0) {
      results.push({ week: `W-${weekOffset + 1}`, cohortSize: 0, day7: null, day30: null });
      continue;
    }

    const cohortIds = cohort.map((u) => u.id);

    // Day-7 retention: had activity 6-8 days after signup
    const d7Start = new Date(cohortEnd);
    d7Start.setDate(d7Start.getDate() + 6);
    const d7End   = new Date(cohortEnd);
    d7End.setDate(d7End.getDate() + 8);

    const { data: d7active } = await supabase
      .from("user_ai_spend_daily")
      .select("user_id")
      .in("user_id", cohortIds)
      .gte("date", d7Start.toISOString().slice(0, 10))
      .lte("date", d7End.toISOString().slice(0, 10));

    const d7Unique = new Set((d7active ?? []).map((r) => r.user_id)).size;

    // Day-30 retention: only meaningful for cohorts >30 days old
    let day30 = null;
    if (weekOffset >= 4) {
      const d30Start = new Date(cohortEnd);
      d30Start.setDate(d30Start.getDate() + 28);
      const d30End   = new Date(cohortEnd);
      d30End.setDate(d30End.getDate() + 32);

      const { data: d30active } = await supabase
        .from("user_ai_spend_daily")
        .select("user_id")
        .in("user_id", cohortIds)
        .gte("date", d30Start.toISOString().slice(0, 10))
        .lte("date", d30End.toISOString().slice(0, 10));

      const d30Unique = new Set((d30active ?? []).map((r) => r.user_id)).size;
      day30 = cohort.length > 0 ? +((d30Unique / cohort.length) * 100).toFixed(1) : null;
    }

    results.push({
      week:       `W-${weekOffset + 1}`,
      cohortSize: cohort.length,
      day7:       cohort.length > 0 ? +((d7Unique / cohort.length) * 100).toFixed(1) : null,
      day30,
    });
  }

  return results.reverse(); // oldest cohort first
}

async function getTopSpenders() {
  const since = firstOfMonth().slice(0, 10);

  const { data, error } = await supabase
    .from("user_ai_spend_daily")
    .select("user_id, cost_usd")
    .gte("date", since);

  if (error) throw error;

  // Aggregate per user
  const spendMap = new Map();
  for (const row of data ?? []) {
    spendMap.set(row.user_id, (spendMap.get(row.user_id) ?? 0) + parseFloat(row.cost_usd ?? 0));
  }

  // Sort and take top 20
  const sorted = [...spendMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (sorted.length === 0) return [];

  // Fetch emails for top spenders
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((authData?.users ?? []).map((u) => [u.id, u.email]));

  // Fetch plans
  const topIds = sorted.map(([id]) => id);
  const { data: plans } = await supabase
    .from("user_plans")
    .select("user_id, plan")
    .in("user_id", topIds);
  const planMap = new Map((plans ?? []).map((p) => [p.user_id, p.plan]));

  return sorted.map(([userId, spend]) => ({
    userId,
    email:    emailMap.get(userId) ?? "unknown",
    plan:     planMap.get(userId) ?? "free",
    spendUsd: +spend.toFixed(4),
  }));
}

async function getDailySignups() {
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const since = daysAgo(30);
  const users = (authData?.users ?? []).filter((u) => u.created_at >= since);

  // Group by date
  const byDate = {};
  for (const u of users) {
    const d = u.created_at.slice(0, 10);
    byDate[d] = (byDate[d] ?? 0) + 1;
  }

  // Fill in missing days
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, signups: byDate[key] ?? 0 });
  }
  return result;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function GET(req) {
  const { err } = await requireAdmin(req);
  if (err) return err;

  try {
    const [mrr, funnel, topSpenders, dailySignups] = await Promise.all([
      getMRR(),
      getFunnel(),
      getTopSpenders(),
      getDailySignups(),
    ]);

    // Retention is expensive (8 separate queries) — run it but don't fail the whole response
    let retention = [];
    try { retention = await getRetention(); }
    catch (e) { console.warn("Retention query failed:", e.message); }

    // A/B test variant breakdown (only when test is active)
    let abTest = null;
    const testEpoch = process.env.AB_TEST_PRICING_EPOCH ?? null;
    if (testEpoch) {
      try {
        const { data: variants } = await supabase
          .from("profiles")
          .select("pricing_variant")
          .eq("pricing_ab_test", testEpoch);

        const counts = { a: 0, b: 0, c: 0, total: 0 };
        for (const row of variants ?? []) {
          if (row.pricing_variant in counts) counts[row.pricing_variant]++;
          counts.total++;
        }

        // Paid conversions per variant
        const variantIds = { a: [], b: [], c: [] };
        const { data: allVariantUsers } = await supabase
          .from("profiles")
          .select("id, pricing_variant")
          .eq("pricing_ab_test", testEpoch);

        for (const u of allVariantUsers ?? []) {
          if (u.pricing_variant in variantIds) variantIds[u.pricing_variant].push(u.id);
        }

        const convByVariant = {};
        for (const [v, ids] of Object.entries(variantIds)) {
          if (!ids.length) { convByVariant[v] = 0; continue; }
          const { data: plans } = await supabase
            .from("user_plans")
            .select("user_id")
            .in("user_id", ids)
            .neq("plan", "free");
          convByVariant[v] = (plans ?? []).length;
        }

        abTest = {
          epoch: testEpoch,
          counts,
          conversions: convByVariant,
          convRates: Object.fromEntries(
            ["a", "b", "c"].map((v) => [
              v,
              counts[v] > 0 ? +((convByVariant[v] / counts[v]) * 100).toFixed(1) : 0,
            ])
          ),
        };
      } catch (e) { console.warn("A/B test query failed:", e.message); }
    }

    return NextResponse.json({ mrr, funnel, retention, topSpenders, dailySignups, abTest });
  } catch (err) {
    console.error("admin/metrics error:", err);
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
