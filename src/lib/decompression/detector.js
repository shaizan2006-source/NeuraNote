import { supabaseAdmin } from "@/lib/serverAuth";
import { todayIST } from "@/lib/format/date";

// Signals that indicate the student might be burnt out or over-stressed
const TRIGGER_THRESHOLDS = {
  consecutive_hard_cards: 5,       // 5+ "Again" ratings in a row
  session_duration_minutes: 180,   // 3h+ continuous study
  daily_study_hours: 10,           // 10h+ in one day
  streak_days: 21,                 // 21+ days without a rest day
  late_night_sessions: 3,          // 3+ sessions past midnight in a week
};

export async function detectDecompression(userId) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000).toISOString();
  const dayAgo = new Date(now - 86400000).toISOString();

  // Fetch recent activity in parallel
  const [cardsRes, sessionsRes, streakRes] = await Promise.all([
    supabaseAdmin
      .from("spaced_repetition_cards")
      .select("fsrs_lapses, fsrs_last_review, fsrs_state")
      .eq("user_id", userId)
      .gte("fsrs_last_review", dayAgo)
      .order("fsrs_last_review", { ascending: false })
      .limit(20),

    supabaseAdmin
      .from("focus_progress")
      .select("session_date, duration_seconds, started_at")
      .eq("user_id", userId)
      .gte("session_date", weekAgo.slice(0, 10))
      .order("session_date", { ascending: false }),

    supabaseAdmin
      .from("user_streaks")
      .select("current_streak, last_study_date")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const cards = cardsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const streak = streakRes.data;

  const signals = [];

  // Signal 1: consecutive lapses (Again ratings) today
  const recentLapses = cards.filter(c => c.fsrs_state === "relearning" || (c.fsrs_lapses ?? 0) > 2).length;
  if (recentLapses >= TRIGGER_THRESHOLDS.consecutive_hard_cards) {
    signals.push({ type: "consecutive_hard_cards", value: recentLapses, threshold: TRIGGER_THRESHOLDS.consecutive_hard_cards });
  }

  // Signal 2: total study time today (IST date — session_date is stored in IST)
  const today = todayIST();
  const todaySeconds = sessions.filter(s => s.session_date === today).reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
  const todayHours = todaySeconds / 3600;
  if (todayHours >= TRIGGER_THRESHOLDS.daily_study_hours) {
    signals.push({ type: "daily_study_hours", value: Math.round(todayHours * 10) / 10, threshold: TRIGGER_THRESHOLDS.daily_study_hours });
  }

  // Signal 3: long streak without rest
  const currentStreak = streak?.current_streak ?? 0;
  if (currentStreak >= TRIGGER_THRESHOLDS.streak_days) {
    signals.push({ type: "long_streak", value: currentStreak, threshold: TRIGGER_THRESHOLDS.streak_days });
  }

  // Signal 4: late-night sessions this week
  const lateNightCount = sessions.filter(s => {
    if (!s.started_at) return false;
    const h = new Date(s.started_at).getHours();
    return h >= 0 && h < 4;
  }).length;
  if (lateNightCount >= TRIGGER_THRESHOLDS.late_night_sessions) {
    signals.push({ type: "late_night_sessions", value: lateNightCount, threshold: TRIGGER_THRESHOLDS.late_night_sessions });
  }

  if (signals.length === 0) return null;

  // Check if we already triggered recently (within 48h) to avoid spam
  const { data: recent } = await supabaseAdmin
    .from("decompression_triggers")
    .select("id")
    .eq("user_id", userId)
    .eq("shadow_mode", true)
    .gte("triggered_at", new Date(now - 48 * 3600000).toISOString())
    .limit(1);

  if (recent && recent.length > 0) return null;

  // Log the trigger in shadow mode
  const { data: trigger } = await supabaseAdmin
    .from("decompression_triggers")
    .insert({
      user_id: userId,
      trigger_type: signals[0].type,
      context: { signals, today_hours: Math.round(todayHours * 10) / 10, streak: currentStreak },
      shadow_mode: true,
    })
    .select("id")
    .single();

  return { trigger_id: trigger?.id, signals, primary: signals[0] };
}

export async function acknowledgeDecompression(triggerId, userResponse) {
  await supabaseAdmin
    .from("decompression_triggers")
    .update({ user_response: userResponse, responded_at: new Date().toISOString() })
    .eq("id", triggerId);
}

// Message copy for each trigger type
export const DECOMPRESSION_MESSAGES = {
  consecutive_hard_cards: {
    title: "Your brain is tired",
    body: "You've been struggling with these cards. That's normal — but it means it's time for a break.",
    cta: "Take 15 min off",
  },
  daily_study_hours: {
    title: "10 hours today",
    body: "That's a lot. Rest is when your brain actually locks in what you learned.",
    cta: "Rest now",
  },
  long_streak: {
    title: "21 days straight",
    body: "Consistency is great. But taking one rest day won't break your streak — it'll actually help your recall.",
    cta: "Schedule a rest day",
  },
  late_night_sessions: {
    title: "Studying after midnight",
    body: "Sleep deprivation cuts memory consolidation by up to 40%. Your future self needs you to sleep.",
    cta: "Set a study cutoff",
  },
};