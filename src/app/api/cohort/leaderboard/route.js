import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("cohort_id").eq("id", user.id).maybeSingle();

  if (!profile?.cohort_id) return Response.json({ rankings: [], cohort: null });

  // Get latest snapshot
  const { data: snapshot } = await supabaseAdmin
    .from("cohort_leaderboard_snapshots")
    .select("rankings, snapshot_date")
    .eq("cohort_id", profile.cohort_id)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: cohort } = await supabaseAdmin
    .from("cohorts").select("name").eq("id", profile.cohort_id).maybeSingle();

  const { count: memberCount } = await supabaseAdmin
    .from("cohort_members")
    .select("user_id", { count: "exact", head: true })
    .eq("cohort_id", profile.cohort_id);

  const { data: myMember } = await supabaseAdmin
    .from("cohort_members").select("display_handle")
    .eq("cohort_id", profile.cohort_id).eq("user_id", user.id).maybeSingle();

  return Response.json({
    cohort_id: profile.cohort_id,
    cohort_name: cohort?.name ?? profile.cohort_id,
    member_count: memberCount ?? 0,
    my_handle: myMember?.display_handle ?? null,
    snapshot_date: snapshot?.snapshot_date ?? null,
    rankings: snapshot?.rankings ?? [],
  });
}
