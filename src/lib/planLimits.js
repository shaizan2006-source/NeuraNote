/**
 * Plan limits + enforcement helpers
 * Free    : 1 PDF, 20 Q&A/day
 * Student : 10 PDFs, unlimited Q&A
 * Pro     : unlimited PDFs, unlimited Q&A
 * School  : unlimited everything (managed separately)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const PLANS = {
  free:    { name: "Free",    pdfLimit: 1,         qaLimit: 20,  price: 0 },
  student: { name: "Student", pdfLimit: 10,        qaLimit: null, price: 299 },
  pro:     { name: "Pro",     pdfLimit: null,       qaLimit: null, price: 599 },
  school:  { name: "School",  pdfLimit: null,       qaLimit: null, price: 50000 },
};

/** Get user's active plan tier. Falls back to "free". */
export async function getUserPlan(userId) {
  if (!userId) return "free";
  const { data } = await supabase
    .from("user_plans")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return "free";
  // Expired subscription → downgrade to free
  if (data.expires_at && new Date(data.expires_at) < new Date()) return "free";
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
 */
export async function canUploadPDF(userId) {
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
 */
export async function canAskQuestion(userId) {
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
