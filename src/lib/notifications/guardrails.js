import { supabaseAdmin } from "@/lib/serverAuth";

// Default to IST (UTC+5:30)
function toLocalHour(utcDate, timezone = "Asia/Kolkata") {
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(utcDate),
      10
    );
  } catch {
    return utcDate.getUTCHours() + 5; // IST fallback
  }
}

function toLocalDate(utcDate, timezone = "Asia/Kolkata") {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(utcDate); // YYYY-MM-DD
  } catch {
    return utcDate.toISOString().slice(0, 10);
  }
}

export async function shouldSkip(user, now) {
  const tz = user.timezone ?? "Asia/Kolkata";
  const localHour = toLocalHour(now, tz);
  const localDate = toLocalDate(now, tz);

  // Night silence: 10pm – 7am
  if (localHour >= 22 || localHour < 7) return true;

  // Exam day silence
  if (user.exam_date && user.exam_date === localDate) return true;

  // 4/day cap
  const { count } = await supabaseAdmin
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("sent_at", `${localDate}T00:00:00Z`)
    .lte("sent_at", `${localDate}T23:59:59Z`);
  if ((count ?? 0) >= 4) return true;

  return false;
}

export async function shouldSkipSlump(user, now) {
  const tz = user.timezone ?? "Asia/Kolkata";
  const localHour = toLocalHour(now, tz);
  if (localHour < 14 || localHour >= 17) return false;

  // Slump window 2-5pm: skip if no session today
  const localDate = toLocalDate(now, tz);
  const { count } = await supabaseAdmin
    .from("focus_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("session_date", localDate);
  return (count ?? 0) === 0;
}

// Find minute-of-day for a UTC time in a given timezone
export function localMinuteOfDay(utcDate, timezone = "Asia/Kolkata") {
  try {
    const h = parseInt(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(utcDate), 10);
    const m = parseInt(new Intl.DateTimeFormat("en-US", { minute: "numeric", timeZone: timezone }).format(utcDate), 10);
    return h * 60 + m;
  } catch {
    return (utcDate.getUTCHours() + 5) * 60 + utcDate.getUTCMinutes();
  }
}
