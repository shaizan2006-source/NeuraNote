import { supabaseAdmin } from "@/lib/serverAuth";
import { todayIST, daysAgoIST } from "@/lib/format/date";
import { cronSecretValid } from "@/lib/security/cronAuth";

async function computeRankings(cohortId) {
  // Get all members
  const { data: members } = await supabaseAdmin
    .from("cohort_members")
    .select("user_id, display_handle")
    .eq("cohort_id", cohortId);

  if (!members?.length) return [];

  const weekAgo = daysAgoIST(7);

  // Score each member by focus minutes this week
  const scores = await Promise.all(members.map(async (m) => {
    const { data: sessions } = await supabaseAdmin
      .from("focus_progress")
      .select("duration_minutes")
      .eq("user_id", m.user_id)
      .gte("session_date", weekAgo);

    const totalMins = (sessions ?? []).reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
    return { handle: m.display_handle, score: totalMins };
  }));

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)
    .map((s, i) => ({ rank: i + 1, handle: s.handle, score: s.score }));
}

export async function GET(req) {
  if (!cronSecretValid(req)) return new Response(null, { status: 401 });

  const { data: cohorts } = await supabaseAdmin.from("cohorts").select("id");
  const todayStr = todayIST();
  let snapshotted = 0;

  for (const cohort of cohorts ?? []) {
    try {
      const rankings = await computeRankings(cohort.id);
      await supabaseAdmin.from("cohort_leaderboard_snapshots").upsert({
        cohort_id: cohort.id,
        snapshot_date: todayStr,
        rankings,
      }, { onConflict: "cohort_id,snapshot_date" });
      snapshotted++;
    } catch (err) {
      console.error(`[leaderboard-snapshot] cohort ${cohort.id}:`, err.message);
    }
  }

  return Response.json({ ok: true, cohorts_snapshotted: snapshotted });
}
