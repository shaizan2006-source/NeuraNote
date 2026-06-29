import webpush from "web-push";
import { supabaseAdmin } from "@/lib/serverAuth";

// Guarded: missing VAPID env (e.g. local dev) must not crash module load / build.
if (
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("[d6Push] VAPID env vars not set — push sends will fail until configured");
}

/**
 * Send a Day 6 trial-ending push notification as a fallback when WhatsApp
 * was not delivered or unavailable.
 *
 * @param {string} userId
 * @param {string} firstName
 * @returns {Promise<boolean>} true if at least one subscription was reached
 */
export async function sendD6PushFallback(userId, firstName) {
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return false;

  const payload = JSON.stringify({
    title: "Trial ends tomorrow",
    body: "Your schedule continues with Pro. Tap to see your options.",
    url: "/trial/decision",
    icon: "/icons/icon-192.png",
  });

  let sent = false;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent = true;
    } catch (err) {
      // Remove stale subscriptions (410 = endpoint gone, 404 = not found)
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      } else {
        console.error(`[d6Push] push failed for ${userId}:`, err.message);
      }
    }
  }

  return sent;
}
