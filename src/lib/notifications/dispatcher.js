import webpush from "web-push";
import { supabaseAdmin } from "@/lib/serverAuth";
import { buildPayload } from "./copy";
import { shouldSkip, shouldSkipSlump, localMinuteOfDay } from "./guardrails";

// Guarded: missing VAPID env (e.g. local dev) must not crash module load / build.
// Sends fail at call time with webpush's own "no VAPID details" error instead.
const VAPID_CONFIGURED = Boolean(
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
);
if (VAPID_CONFIGURED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("[push] VAPID env vars not set — push sends will fail until configured");
}

const BUCKET_FIELD = {
  briefing:     { enabled: "briefing_enabled",      time: "briefing_time" },
  midday:       { enabled: "midday_enabled",         time: "midday_time" },
  focus_anchor: { enabled: "focus_anchor_enabled",   time: "focus_anchor_time" },
  night_closure:{ enabled: "night_closure_enabled",  time: "night_closure_time" },
};

/**
 * Send an ad-hoc push notification to one user, to every registered subscription.
 * Throws if the user has no push subscriptions (callers treat that as "skip").
 */
export async function sendNotification(userId, payload) {
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) throw new Error("no push subscription");

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      } else {
        console.error(`[push] ad-hoc send failed for ${userId}:`, err.message);
      }
    }
  }

  if (sent === 0) throw new Error("all subscriptions failed");

  await supabaseAdmin.from("notification_log").insert({
    user_id: userId,
    notification_type: payload?.type ?? "adhoc",
    delivered: true,
    metadata: { adhoc: true },
  });

  return sent;
}

export async function dispatchNotifications() {
  const now = new Date();
  const results = { sent: 0, skipped: 0, errors: 0 };

  for (const [bucket, fields] of Object.entries(BUCKET_FIELD)) {
    // Single query: fetch prefs + profile via JOIN (eliminates N+1)
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select(
        `user_id, ${fields.time}, ${fields.enabled},
         profiles(id, full_name, exam_date, timezone, cohort_id)`
      )
      .eq(fields.enabled, true);

    if (!prefs?.length) continue;

    for (const pref of prefs) {
      const profile = pref.profiles;
      if (!profile) continue;

      const localMin = localMinuteOfDay(now, profile.timezone ?? "Asia/Kolkata");
      const targetMin = pref[fields.time] ?? 420;
      const diff = localMin - targetMin;
      if (diff < 0 || diff >= 5) continue;

      try {
        if (await shouldSkip(profile, now)) { results.skipped++; continue; }
        if (bucket === "midday" && await shouldSkipSlump(profile, now)) { results.skipped++; continue; }

        const payload = buildPayload(bucket, profile.full_name?.split(" ")[0]);
        if (!payload) continue;

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", profile.id);

        if (!subs?.length) continue;

        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify(payload)
            );
            results.sent++;
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            } else {
              results.errors++;
              console.error(`[push] send failed for ${profile.id}:`, err.message);
            }
          }
        }

        await supabaseAdmin.from("notification_log").insert({
          user_id: profile.id,
          notification_type: bucket,
          delivered: true,
          metadata: { bucket },
        });

      } catch (err) {
        results.errors++;
        console.error(`[dispatcher] user ${profile?.id} error:`, err.message);
      }
    }
  }

  return results;
}
