import { supabaseAdmin } from "@/lib/serverAuth";

const MIN_SESSION_MINUTES = 5;

async function hasMinimumSessionYesterday(userId) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const { data } = await supabaseAdmin
    .from("focus_progress")
    .select("duration_minutes")
    .eq("user_id", userId)
    .eq("session_date", yesterdayStr);

  const total = (data ?? []).reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
  return total >= MIN_SESSION_MINUTES;
}

async function getOrCreateStreak(userId) {
  const { data: existing } = await supabaseAdmin
    .from("study_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabaseAdmin
    .from("study_streaks")
    .insert({ user_id: userId, streak_count: 0, cumulative_study_days: 0, freezes_available: 0, freezes_used: 0 })
    .select()
    .single();

  return created;
}

export async function GET(req) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return new Response(null, { status: 401 });

  // Get all users with profiles
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .limit(2000);

  let updated = 0, errors = 0;

  for (const profile of profiles ?? []) {
    try {
      const streak = await getOrCreateStreak(profile.id);
      const studiedYesterday = await hasMinimumSessionYesterday(profile.id);

      const updates = {};

      if (studiedYesterday) {
        updates.cumulative_study_days = (streak.cumulative_study_days ?? 0) + 1;
        updates.streak_count = (streak.streak_count ?? 0) + 1;
        updates.last_active_date = new Date().toISOString().slice(0, 10);

        // Every 7th consecutive day → earn a freeze (cap 3)
        const newStreak = updates.streak_count;
        if (newStreak % 7 === 0 && (streak.freezes_available ?? 0) < 3) {
          updates.freezes_available = (streak.freezes_available ?? 0) + 1;
          updates.last_freeze_earned_at = new Date().toISOString();
        }
      } else if ((streak.freezes_available ?? 0) > 0) {
        // Auto-apply freeze — streak holds
        updates.freezes_available = streak.freezes_available - 1;
        updates.freezes_used = (streak.freezes_used ?? 0) + 1;
        updates.last_freeze_used_at = new Date().toISOString();
      } else {
        // No freeze — reset current streak, cumulative stays
        updates.streak_count = 0;
      }

      await supabaseAdmin.from("study_streaks").update(updates).eq("user_id", profile.id);
      updated++;
    } catch (err) {
      errors++;
      console.error(`[evaluate-streaks] ${profile.id}:`, err.message);
    }
  }

  return Response.json({ ok: true, updated, errors });
}
