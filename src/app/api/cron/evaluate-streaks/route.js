import { supabaseAdmin } from "@/lib/serverAuth";
import { todayIST, yesterdayIST } from "@/lib/format/date";
import { cronSecretValid } from "@/lib/security/cronAuth";

const MIN_SESSION_MINUTES = 5;

async function hasMinimumSessionYesterday(userId, yesterdayStr) {
  // yesterdayStr is the IST calendar date we're evaluating, passed in from the
  // caller so all users in the batch use the exact same date string — no drift
  // between the start and end of a long-running cron.
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
  if (!cronSecretValid(req)) return new Response(null, { status: 401 });

  // Fix these timestamps once at cron entry so every user in the batch uses
  // the exact same IST date — long-running loops otherwise drift across midnight.
  const todayStr = todayIST();
  const yesterdayStr = yesterdayIST();

  // ── Cron double-fire guard ──────────────────────────────────────────────────
  // Vercel can invoke a cron more than once on network retry. If any streak
  // was already evaluated with today's IST date, this is a duplicate run —
  // skip entirely to avoid double-incrementing streaks.
  //
  // Edge case: if zero users exist, this check passes on both invocations.
  // That is safe: the loop will process zero users on both, no data changed.
  const { count: alreadyEvaluated } = await supabaseAdmin
    .from("study_streaks")
    .select("id", { count: "exact", head: true })
    .eq("last_evaluated_date", todayStr);

  if ((alreadyEvaluated ?? 0) > 0) {
    console.log(`[evaluate-streaks] already ran for ${todayStr}, skipping duplicate invocation`);
    return Response.json({ ok: true, skipped: true, reason: "already_evaluated", date: todayStr });
  }

  // Get all users — paginate if needed (limit 2000 per call)
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .limit(2000);

  if (profilesError) {
    console.error("[evaluate-streaks] failed to fetch profiles:", profilesError.message);
    return Response.json({ ok: false, error: profilesError.message }, { status: 500 });
  }

  let updated = 0, errors = 0, skipped = 0;

  for (const profile of profiles ?? []) {
    try {
      const streak = await getOrCreateStreak(profile.id);
      if (!streak) { errors++; continue; }

      // Per-user idempotency: skip if this specific user was already evaluated today.
      // Catches the race where the cron-level guard above ran before any writes
      // completed (e.g., two invocations that started within the same second).
      if (streak.last_evaluated_date === todayStr) {
        skipped++;
        continue;
      }

      const studiedYesterday = await hasMinimumSessionYesterday(profile.id, yesterdayStr);

      const updates = {
        last_evaluated_date: todayStr, // always write — marks evaluation complete
      };

      if (studiedYesterday) {
        updates.cumulative_study_days = (streak.cumulative_study_days ?? 0) + 1;
        updates.streak_count = (streak.streak_count ?? 0) + 1;
        // IST "today" is the day we just finished evaluating (the day after yesterday)
        updates.last_active_date = todayStr;

        // Every 7th consecutive day → earn a freeze (cap 3)
        const newStreak = updates.streak_count;
        if (newStreak % 7 === 0 && (streak.freezes_available ?? 0) < 3) {
          updates.freezes_available = (streak.freezes_available ?? 0) + 1;
          updates.last_freeze_earned_at = new Date().toISOString();
        }
      } else if ((streak.freezes_available ?? 0) > 0) {
        // Auto-apply freeze — streak holds, freeze consumed
        updates.freezes_available = streak.freezes_available - 1;
        updates.freezes_used = (streak.freezes_used ?? 0) + 1;
        updates.last_freeze_used_at = new Date().toISOString();
      } else {
        // No session, no freeze — reset current streak
        updates.streak_count = 0;
      }

      const { error: updateError } = await supabaseAdmin
        .from("study_streaks")
        .update(updates)
        .eq("user_id", profile.id);

      if (updateError) {
        console.error(`[evaluate-streaks] update failed for ${profile.id}:`, updateError.message);
        errors++;
      } else {
        updated++;
      }
    } catch (err) {
      errors++;
      console.error(`[evaluate-streaks] ${profile.id}:`, err.message);
    }
  }

  console.log(`[evaluate-streaks] date=${todayStr} yesterday=${yesterdayStr}`, { updated, skipped, errors });
  return Response.json({ ok: true, date: todayStr, yesterday: yesterdayStr, updated, skipped, errors });
}
