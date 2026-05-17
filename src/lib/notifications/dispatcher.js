import webpush from "web-push";
import { supabaseAdmin } from "@/lib/serverAuth";
import { buildPayload } from "./copy";
import { shouldSkip, shouldSkipSlump, localMinuteOfDay } from "./guardrails";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const BUCKET_FIELD = {
  briefing:     { enabled: "briefing_enabled",      time: "briefing_time" },
  midday:       { enabled: "midday_enabled",         time: "midday_time" },
  focus_anchor: { enabled: "focus_anchor_enabled",   time: "focus_anchor_time" },
  night_closure:{ enabled: "night_closure_enabled",  time: "night_closure_time" },
};

export async function dispatchNotifications() {
  const now = new Date();
  const results = { sent: 0, skipped: 0, errors: 0 };

  for (const [bucket, fields] of Object.entries(BUCKET_FIELD)) {
    // Fetch users whose notification time is in the current 5-min bucket
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select(`user_id, ${fields.time}, ${fields.enabled}`)
      .eq(fields.enabled, true);

    if (!prefs?.length) continue;

    // Filter to users whose local minute-of-day matches current bucket
    const eligible = [];
    for (const pref of prefs) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, exam_date, timezone, cohort_id")
        .eq("id", pref.user_id)
        .maybeSingle();

      if (!profile) continue;

      const localMin = localMinuteOfDay(now, profile.timezone ?? "Asia/Kolkata");
      const targetMin = pref[fields.time] ?? 420;
      const diff = localMin - targetMin;
      if (diff < 0 || diff >= 5) continue;

      eligible.push({ ...pref, profile });
    }

    for (const user of eligible) {
      try {
        // Apply guardrails
        if (await shouldSkip(user.profile, now)) { results.skipped++; continue; }
        if (bucket === "midday" && await shouldSkipSlump(user.profile, now)) { results.skipped++; continue; }

        // Build payload
        const payload = buildPayload(bucket, user.profile.full_name?.split(" ")[0]);
        if (!payload) continue;

        // Get push subscriptions
        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", user.profile.id);

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
              // Expired subscription — remove it
              await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            } else {
              results.errors++;
              console.error(`[push] send failed for ${user.profile.id}:`, err.message);
            }
          }
        }

        // Log send
        await supabaseAdmin.from("notification_log").insert({
          user_id: user.profile.id,
          notification_type: bucket,
          delivered: true,
          metadata: { bucket },
        });

      } catch (err) {
        results.errors++;
        console.error(`[dispatcher] user ${user.profile?.id} error:`, err.message);
      }
    }
  }

  return results;
}
