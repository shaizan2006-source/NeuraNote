/**
 * GET /api/pricing-variant
 *
 * Returns (and lazily assigns) the authenticated user's A/B pricing variant.
 *
 * Variants:
 *   'a' → Pro ₹199/mo · ₹1,599/yr   (low-price volume arm)
 *   'b' → Pro ₹399/mo · ₹2,999/yr   (control — current price)
 *   'c' → Pro ₹499/mo · ₹3,999/yr   (high-price quality-signal arm)
 *
 * Assignment strategy:
 *   - Deterministic: derived from a hash of (userId + test epoch), so the same
 *     user always gets the same variant across devices and sessions without a DB
 *     write until the profile row is actually created.
 *   - Persisted: on first call, the variant is written to `profiles.pricing_variant`
 *     so it survives test-epoch changes and is queryable for admin reporting.
 *   - Sticky: once written, the stored variant is returned (ignores re-hash).
 *
 * Response:
 *   { variant: 'a'|'b'|'c', prices: { monthly: number, yearly: number } }
 *
 * When the test is not active (AB_TEST_PRICING_EPOCH is unset), always returns 'b'
 * (the control price) — pricing page works normally with no visible change.
 */

import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin as supabase } from "@/lib/serverAuth";
import { createHash } from "crypto";

// ── Test config (set via Vercel env to activate the test) ──────────────────
// AB_TEST_PRICING_EPOCH=pro-price-2026-05   ← set to activate
// Leave unset to disable (always return control variant 'b')
const TEST_EPOCH = process.env.AB_TEST_PRICING_EPOCH ?? null;

// Pro prices per variant (INR)
const VARIANT_PRICES = {
  a: { monthly: 199, yearly: 1599 },
  b: { monthly: 399, yearly: 2999 },  // control
  c: { monthly: 499, yearly: 3999 },
};

// Razorpay amounts in paise (1 INR = 100 paise)
const VARIANT_PAISE = {
  a: { monthly: 19900,  yearly: 159900 },
  b: { monthly: 39900,  yearly: 299900 },
  c: { monthly: 49900,  yearly: 399900 },
};

/**
 * Deterministically assign a variant from userId + epoch.
 * Returns 'a', 'b', or 'c' with roughly equal probability.
 */
function assignVariant(userId, epoch) {
  const hash = createHash("sha256").update(`${userId}:${epoch}`).digest("hex");
  const bucket = parseInt(hash.slice(0, 8), 16) % 3;
  return ["a", "b", "c"][bucket];
}

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Test not active → always return control
  if (!TEST_EPOCH) {
    return NextResponse.json({
      variant: "b",
      testActive: false,
      prices: VARIANT_PRICES.b,
      paise: VARIANT_PAISE.b,
    });
  }

  // Check if user already has an assigned variant for this test epoch
  const { data: profile } = await supabase
    .from("profiles")
    .select("pricing_variant, pricing_ab_test")
    .eq("id", user.id)
    .maybeSingle();

  // If variant is already stored for THIS epoch, return it (sticky)
  if (profile?.pricing_variant && profile?.pricing_ab_test === TEST_EPOCH) {
    const v = profile.pricing_variant;
    return NextResponse.json({
      variant:    v,
      testActive: true,
      prices:     VARIANT_PRICES[v],
      paise:      VARIANT_PAISE[v],
    });
  }

  // First visit — deterministically assign and persist
  const variant = assignVariant(user.id, TEST_EPOCH);

  await supabase
    .from("profiles")
    .update({
      pricing_variant:    variant,
      pricing_ab_test:    TEST_EPOCH,
      pricing_variant_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return NextResponse.json({
    variant,
    testActive: true,
    prices:     VARIANT_PRICES[variant],
    paise:      VARIANT_PAISE[variant],
  });
}
