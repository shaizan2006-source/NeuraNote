import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { assignCohort } from "@/lib/cohorts/assignment";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const body = await req.json();
  const { exam_type, class_level, exam_date, study_window, region, city } = body;

  if (!exam_type) return Response.json({ error: "exam_type required" }, { status: 400 });

  const exam_year = exam_type.match(/(\d{4})$/)?.[1] ? parseInt(exam_type.match(/(\d{4})$/)[1]) : null;

  // Stub cohort_id: join the exam+year+region+class bucket
  const cohort_id = [exam_type, exam_year, region, class_level]
    .filter(Boolean)
    .join("_")
    .toLowerCase()
    .replace(/\s+/g, "_");

  // Upsert profile
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
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  // Upsert cohort row (stub)
  await supabaseAdmin.from("cohorts").upsert({
    id: cohort_id,
    exam_type,
    exam_year,
    region: region || null,
    class_level: class_level || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" }).select().maybeSingle();

  // Assign to cohort with anonymous handle (full logic)
  const cohortResult = await assignCohort(user.id, { exam_type, exam_year, region, class_level })
    .catch(() => null);

  // Activate 7-day Pro trial for new users (idempotent — skip if already on a plan)
  const { data: existing } = await supabaseAdmin
    .from("user_plans")
    .select("id, plan, payment_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const trialEndsAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    await supabaseAdmin.from("user_plans").insert({
      user_id: user.id,
      plan: "pro",
      trial_ends_at: trialEndsAt,
      billing_cycle: "monthly",
    });
  }

  return Response.json({ cohort_id, redirect_to: "/" });
}
