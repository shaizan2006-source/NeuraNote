import { supabaseAdmin } from "@/lib/serverAuth";
import { generateHandle } from "./handles";

function humanReadableName(cohortId) {
  // "jee_main_2027_south_class11" → "JEE Main 2027 — South, Class 11"
  return cohortId
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace("Jee", "JEE")
    .replace("Neet", "NEET");
}

function isUniqueViolation(err) {
  return err?.code === "23505" || err?.message?.includes("unique");
}

export async function assignCohort(userId, profile) {
  const { exam_type, exam_year, region, class_level } = profile;
  if (!exam_type) return null;

  const cohortId = [exam_type, exam_year, region, class_level]
    .filter(Boolean)
    .join("_")
    .toLowerCase()
    .replace(/\s+/g, "_");

  // Upsert cohort row
  await supabaseAdmin.from("cohorts").upsert({
    id: cohortId,
    exam_type,
    exam_year: exam_year ?? null,
    region: region ?? null,
    class_level: class_level ?? null,
    name: humanReadableName(cohortId),
  }, { onConflict: "id" });

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from("cohort_members")
    .select("display_handle")
    .eq("cohort_id", cohortId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { cohortId, handle: existing.display_handle };

  // Insert with unique handle (retry on collision)
  let handle;
  for (let attempt = 0; attempt < 5; attempt++) {
    handle = generateHandle();
    const { error } = await supabaseAdmin.from("cohort_members").insert({
      cohort_id: cohortId,
      user_id: userId,
      display_handle: handle,
    });
    if (!error) break;
    if (!isUniqueViolation(error)) throw error;
  }

  // Update profile
  await supabaseAdmin.from("profiles").update({ cohort_id: cohortId }).eq("id", userId);

  return { cohortId, handle };
}
