import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { assignCohort } from "@/lib/cohorts/assignment";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    exam_type, class_level, exam_date, study_window, region, city,
    phone_number, parent_phone_number, is_repeat_aspirant,
  } = body;

  // F-031: type-guard exam_type — a non-string (number/array) would crash exam_type.match() below.
  if (!exam_type || typeof exam_type !== "string") return Response.json({ error: "exam_type required" }, { status: 400 });

  // S7 fix: server-side phone validation — client-side regex is bypassable
  const INDIAN_PHONE_RE = /^\+91[6-9]\d{9}$/;
  if (phone_number && !INDIAN_PHONE_RE.test(phone_number)) {
    return Response.json({ error: "invalid_phone_number" }, { status: 400 });
  }
  if (parent_phone_number && !INDIAN_PHONE_RE.test(parent_phone_number)) {
    return Response.json({ error: "invalid_parent_phone_number" }, { status: 400 });
  }

  const exam_year = exam_type.match(/(\d{4})$/)?.[1]
    ? parseInt(exam_type.match(/(\d{4})$/)[1])
    : null;

  const cohort_id = [exam_type, exam_year, region, class_level]
    .filter(Boolean)
    .join("_")
    .toLowerCase()
    .replace(/\s+/g, "_");

  // Calculate exam proximity in months at signup (snapshot — never recalculated)
  let exam_proximity_months_at_signup = null;
  if (exam_date) {
    const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
    const diff = new Date(exam_date).getTime() - Date.now();
    if (diff > 0) {
      exam_proximity_months_at_signup = Math.round(diff / msPerMonth);
    }
  }

  // Upsert profile — includes new Phase 1 fields
  await supabaseAdmin.from("profiles").upsert({
    id: user.id,
    exam_type,
    exam_year,
    exam_date: exam_date || null,
    class_level: class_level || null,
    study_window: study_window || null,
    region: region || null,
    city: city || null,
    cohort_id,
    phone_number: phone_number || null,
    parent_phone_number: parent_phone_number || null,
    is_repeat_aspirant: is_repeat_aspirant ?? false,
    exam_proximity_months_at_signup,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  // Upsert cohort row
  await supabaseAdmin.from("cohorts").upsert({
    id: cohort_id,
    exam_type,
    exam_year,
    region: region || null,
    class_level: class_level || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" }).select().maybeSingle();

  await assignCohort(user.id, { exam_type, exam_year, region, class_level })
    .catch(() => null);

  // Activate 7-day Pro trial — ignoreDuplicates prevents double-activation on network retry
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  await supabaseAdmin.from("user_plans").insert({
    user_id: user.id,
    plan: "pro",
    is_trial: true,
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEndsAt,
    billing_cycle: "monthly",
  }, { ignoreDuplicates: true });

  return Response.json({ cohort_id, redirect_to: "/" });
}
