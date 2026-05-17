import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { data } = await supabaseAdmin
    .from("study_streaks")
    .select("streak_count, cumulative_study_days, freezes_available, last_active_date")
    .eq("user_id", user.id)
    .maybeSingle();

  const cumulative = data?.cumulative_study_days ?? 0;
  const badge_label = cumulative >= 365 ? "Scholar" : cumulative >= 100 ? "Committed" : cumulative >= 30 ? "Consistent Learner" : "Getting Started";

  return Response.json({
    current_streak: data?.streak_count ?? 0,
    cumulative_days: cumulative,
    freezes_available: data?.freezes_available ?? 0,
    badge_label,
    last_active_date: data?.last_active_date ?? null,
  });
}
