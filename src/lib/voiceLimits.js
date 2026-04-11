/**
 * Voice call rate limiting
 * Free    : 2 calls/day, 10 min max
 * Student : 5 calls/day, 20 min max
 * Pro     : 15 calls/day, 40 min max
 * School  : unlimited, 60 min max
 */
import { createClient } from "@supabase/supabase-js";
import { getUserPlan } from "@/lib/planLimits";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const VOICE_LIMITS = {
  free:    { callsPerDay: 2,    maxDurationSecs: 600,  label: "2 calls/day · 10 min each" },
  student: { callsPerDay: 5,    maxDurationSecs: 1200, label: "5 calls/day · 20 min each" },
  pro:     { callsPerDay: 15,   maxDurationSecs: 2400, label: "15 calls/day · 40 min each" },
  school:  { callsPerDay: null, maxDurationSecs: 3600, label: "Unlimited · 60 min each" },
};

export async function countTodayCalls(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("voice_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("started_at", todayStart.toISOString());
  return count || 0;
}

export async function canStartCall(userId) {
  const plan  = await getUserPlan(userId);
  const limits = VOICE_LIMITS[plan] || VOICE_LIMITS.free;

  if (!limits.callsPerDay) {
    return { allowed: true, plan, limits, todayCount: 0 };
  }

  const todayCount = await countTodayCalls(userId);
  if (todayCount >= limits.callsPerDay) {
    return {
      allowed: false,
      reason: `You've used all ${limits.callsPerDay} voice calls for today. Upgrade your plan to continue learning without limits.`,
      upgradeUrl: "/pricing",
      todayCount,
      plan,
      limits,
    };
  }
  return { allowed: true, plan, limits, todayCount };
}

export async function startCallSession(userId) {
  const { data, error } = await supabase
    .from("voice_calls")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function endCallSession(callId, durationSecs, messagesCount) {
  await supabase
    .from("voice_calls")
    .update({
      ended_at:        new Date().toISOString(),
      duration_seconds: durationSecs,
      messages_count:  messagesCount,
    })
    .eq("id", callId);
}
