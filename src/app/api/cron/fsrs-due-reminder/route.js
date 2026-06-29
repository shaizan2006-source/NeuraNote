import { supabaseAdmin } from "@/lib/serverAuth";
import { sendNotification } from "@/lib/notifications/dispatcher";
import { cronSecretValid } from "@/lib/security/cronAuth";

export async function GET(req) {
  if (!cronSecretValid(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString();

  // Find users with FSRS cards due today
  const { data: rows } = await supabaseAdmin
    .from("spaced_repetition_cards")
    .select("user_id")
    .lte("fsrs_due", today)
    .eq("fsrs_state", "review");

  if (!rows || rows.length === 0) return Response.json({ notified: 0 });

  // Deduplicate user IDs and count due cards per user
  const userDueCount = {};
  for (const row of rows) {
    userDueCount[row.user_id] = (userDueCount[row.user_id] ?? 0) + 1;
  }

  let notified = 0;
  for (const [userId, count] of Object.entries(userDueCount)) {
    try {
      await sendNotification(userId, {
        title: `${count} card${count > 1 ? "s" : ""} due for review`,
        body: "Quick 5-min session keeps your memory sharp.",
        url: "/review",
        type: "review_reminder",
      });
      notified++;
    } catch {
      // user has no push subscription — skip
    }
  }

  return Response.json({ notified });
}