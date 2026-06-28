/**
 * Plan limits + enforcement helpers
 * Free    : 1 PDF, 20 Q&A/day
 * Student : 10 PDFs, unlimited Q&A  (₹199/mo · ₹1,599/yr)
 * Pro     : unlimited PDFs & Q&A    (₹399/mo · ₹2,999/yr)
 * Family  : unlimited PDFs & Q&A    (₹4,499/yr — up to 5 seats)
 * School  : unlimited everything    (B2B — negotiated separately)
 *
 * Prices are derived from pricing.js — do NOT hardcode amounts here.
 * Internal developer accounts bypass all limits — see internalAccess.js.
 * Pass the `user` object (from supabase.auth.getUser) to any check function
 * to enable the bypass path without an extra DB query.
 */

import { createClient } from "@supabase/supabase-js";
import { isInternalDev, DEV_ALLOWED, DEV_PLAN } from "@/lib/internalAccess";
import { PRICING_AMOUNTS } from "@/lib/pricing";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Convert paise → INR for display / comparison purposes.
// pricing.js is the single source of truth for all monetary values.
const inr = (paise) => Math.round(paise / 100);

export const PLANS = {
  free:    { name: "Free",     pdfLimit: 1,    qaLimit: 20,   monthlyPrice: 0,                                          yearlyPrice: 0 },
  student: { name: "Student",  pdfLimit: 10,   qaLimit: null, monthlyPrice: inr(PRICING_AMOUNTS.student.monthly),       yearlyPrice: inr(PRICING_AMOUNTS.student.yearly) },
  pro:     { name: "Pro",      pdfLimit: null, qaLimit: null, monthlyPrice: inr(PRICING_AMOUNTS.pro.monthly),           yearlyPrice: inr(PRICING_AMOUNTS.pro.yearly) },
  proplus: { name: "Pro+",     pdfLimit: null, qaLimit: null, monthlyPrice: inr(PRICING_AMOUNTS.proplus.monthly),       yearlyPrice: inr(PRICING_AMOUNTS.proplus.yearly) },
  family:  { name: "Family",   pdfLimit: null, qaLimit: null, monthlyPrice: null,                                       yearlyPrice: inr(PRICING_AMOUNTS.family.yearly) },
  school:  { name: "School",   pdfLimit: null, qaLimit: null, monthlyPrice: null,                                       yearlyPrice: null },  // B2B — negotiated separately
};

/**
 * Get user's active plan tier. Falls back to "free".
 * Pass `user` (from supabase.auth.getUser) to short-circuit for dev accounts.
 */
export async function getUserPlan(userId, user = null) {
  if (!userId) return "free";
  // Internal dev accounts always get the highest-tier plan.
  if (isInternalDev(user)) return DEV_PLAN;

  const { data } = await supabase
    .from("user_plans")
    .select("plan, expires_at, is_trial, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return "free";
  // Expired paid subscription → downgrade to free
  if (data.expires_at && new Date(data.expires_at) < new Date()) return "free";
  // F-005: a lapsed trial must also drop to free. Trials set trial_ends_at but never
  // expires_at, so without this check an expired trial kept Pro entitlements forever.
  if (data.is_trial && data.trial_ends_at && new Date(data.trial_ends_at) < new Date()) return "free";
  return data.plan || "free";
}

/** Count PDFs already uploaded by this user. */
export async function countUserPDFs(userId) {
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count || 0;
}

/** Count Q&A requests made today by this user. */
export async function countTodayQA(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("qa_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString());
  return count || 0;
}

/** Record one Q&A usage event. */
export async function recordQAUsage(userId) {
  const { error } = await supabase.from("qa_usage").insert({ user_id: userId });
  if (error) console.error("recordQAUsage failed:", error.message);
}

/**
 * Check if user can upload another PDF.
 * Returns { allowed: true } or { allowed: false, reason, limit, current }
 * Pass `user` (from supabase.auth.getUser) to enable dev override.
 */
export async function canUploadPDF(userId, user = null) {
  // Internal developer accounts: unlimited uploads, no checks.
  if (isInternalDev(user)) return DEV_ALLOWED;

  const plan = await getUserPlan(userId);
  const limits = PLANS[plan];
  if (!limits.pdfLimit) return { allowed: true };          // unlimited

  const current = await countUserPDFs(userId);
  if (current >= limits.pdfLimit) {
    return {
      allowed: false,
      reason: `Free plan allows ${limits.pdfLimit} PDF. Upgrade to upload more.`,
      limit: limits.pdfLimit,
      current,
      upgradeUrl: "/pricing",
    };
  }
  return { allowed: true };
}

/**
 * Check if user can make another Q&A request today.
 * Returns { allowed: true } or { allowed: false, reason, limit, current }
 * Pass `user` (from supabase.auth.getUser) to enable dev override.
 */
export async function canAskQuestion(userId, user = null) {
  // Internal developer accounts: unlimited Q&A, no daily cap.
  if (isInternalDev(user)) return DEV_ALLOWED;

  const plan = await getUserPlan(userId);
  const limits = PLANS[plan];
  if (!limits.qaLimit) return { allowed: true };           // unlimited

  const current = await countTodayQA(userId);
  if (current >= limits.qaLimit) {
    return {
      allowed: false,
      reason: `Free plan allows ${limits.qaLimit} questions per day. Upgrade for unlimited.`,
      limit: limits.qaLimit,
      current,
      upgradeUrl: "/pricing",
    };
  }
  return { allowed: true };
}
