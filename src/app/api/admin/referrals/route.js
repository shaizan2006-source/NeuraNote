import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "shaizan2006@gmail.com")
  .split(",").map(e => e.trim());

/**
 * GET /api/admin/referrals?days=30&source=product_hunt
 *
 * Returns signups and paid conversion by UTM source/medium/campaign.
 * Admin-only (ADMIN_EMAILS env var).
 *
 * Response shape:
 * {
 *   period_days: 30,
 *   total_signups: 142,
 *   total_paid: 18,
 *   by_source: [
 *     { source, medium, campaign, signups, paid, conversion_pct, mrr_estimate }
 *   ],
 *   top_creators: [
 *     { source, signups, paid, commission_estimate }
 *   ]
 * }
 */
export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_EMAILS.includes(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days   = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "30", 10)));
  const source = searchParams.get("source") ?? null;

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  // ── 1. Signups in window ─────────────────────────────────
  let signupQuery = supabaseAdmin
    .from("profiles")
    .select("id, referral_source, utm_medium, utm_campaign, created_at")
    .gte("created_at", since);

  if (source) signupQuery = signupQuery.eq("referral_source", source);

  const { data: signups, error: signupErr } = await signupQuery;
  if (signupErr) {
    console.error("[admin/referrals] signups error:", signupErr.message);
    return Response.json({ error: signupErr.message }, { status: 500 });
  }

  const signupIds = (signups ?? []).map(s => s.id);

  // ── 2. Paid conversions for those users ─────────────────
  let paidMap = new Map(); // user_id → { plan, amount }
  if (signupIds.length > 0) {
    const { data: plans } = await supabaseAdmin
      .from("user_plans")
      .select("user_id, plan, billing_cycle")
      .in("user_id", signupIds)
      .not("payment_id", "is", null);

    for (const p of plans ?? []) {
      paidMap.set(p.user_id, p);
    }
  }

  // ── 3. Aggregate by source / medium / campaign ──────────
  const buckets = new Map();

  for (const s of signups ?? []) {
    const key = [
      s.referral_source ?? "(direct)",
      s.utm_medium      ?? "",
      s.utm_campaign    ?? "",
    ].join("|");

    if (!buckets.has(key)) {
      buckets.set(key, {
        source:   s.referral_source ?? "(direct)",
        medium:   s.utm_medium      ?? null,
        campaign: s.utm_campaign    ?? null,
        signups:  0,
        paid:     0,
        mrr:      0,
      });
    }

    const b = buckets.get(key);
    b.signups++;

    if (paidMap.has(s.id)) {
      b.paid++;
      const plan = paidMap.get(s.id);
      // Approximate MRR
      const monthly =
        plan.plan === "pro"     ? 399 :
        plan.plan === "student" ? 199 :
        plan.plan === "family"  ? Math.round(4499 / 12) : 0;
      b.mrr += plan.billing_cycle === "annual" ? Math.round(monthly * 0.67) : monthly;
    }
  }

  const by_source = Array.from(buckets.values())
    .map(b => ({
      ...b,
      conversion_pct: b.signups > 0 ? +((b.paid / b.signups) * 100).toFixed(1) : 0,
      mrr_estimate:   b.mrr,
    }))
    .sort((a, b) => b.signups - a.signups);

  // ── 4. Creator-specific view (utm_source starts with "creator_") ──
  const top_creators = by_source
    .filter(b => b.source?.startsWith("creator_"))
    .map(b => ({
      creator: b.source.replace("creator_", ""),
      source:  b.source,
      signups: b.signups,
      paid:    b.paid,
      commission_estimate: Math.round(b.mrr * 0.20),
    }))
    .sort((a, b) => b.paid - a.paid);

  return Response.json({
    period_days:   days,
    since,
    total_signups: signups?.length ?? 0,
    total_paid:    paidMap.size,
    overall_conversion_pct: signups?.length
      ? +((paidMap.size / signups.length) * 100).toFixed(1)
      : 0,
    by_source,
    top_creators,
  });
}
