import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("cohort_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.cohort_id) return Response.json({ cohort: null });

  const [memberRes, cohortRes, countRes] = await Promise.all([
    supabaseAdmin.from("cohort_members").select("display_handle, joined_at").eq("cohort_id", profile.cohort_id).eq("user_id", user.id).maybeSingle(),
    supabaseAdmin.from("cohorts").select("id, name, exam_type, exam_year, region").eq("id", profile.cohort_id).maybeSingle(),
    supabaseAdmin.from("cohort_members").select("user_id", { count: "exact", head: true }).eq("cohort_id", profile.cohort_id),
  ]);

  return Response.json({
    cohort_id: profile.cohort_id,
    cohort_name: cohortRes.data?.name ?? profile.cohort_id,
    member_count: countRes.count ?? 0,
    my_handle: memberRes.data?.display_handle ?? null,
  });
}
