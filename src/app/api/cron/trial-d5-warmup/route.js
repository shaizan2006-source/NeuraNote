import { supabaseAdmin } from "@/lib/serverAuth";
import { dispatchWhatsApp } from "@/lib/whatsapp/dispatch";
import { sendD6PushFallback } from "@/lib/notifications/d6Push";
import { trackEvent, EVENTS } from "@/lib/telemetry/events";
import { cronSecretValid } from "@/lib/security/cronAuth";

// Runs daily at 6pm IST (12:30 UTC)
// Schedule in vercel.json: "30 12 * * *" (same time as d3-segment — Vercel
// runs crons sequentially per path, so no conflict)

const QUIET_HOURS_START_IST = 22; // 10pm
const QUIET_HOURS_END_IST   = 7;  // 7am

export async function GET(req) {
  if (!cronSecretValid(req)) return new Response(null, { status: 401 });

  const now = new Date();
  const istHour = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getHours();

  // Quiet hours guard (10pm–7am IST)
  if (istHour >= QUIET_HOURS_START_IST || istHour < QUIET_HOURS_END_IST) {
    console.log("[trial-d5-warmup] quiet hours — skipping");
    return Response.json({ ok: true, skipped: "quiet_hours" });
  }

  const results = { evaluated: 0, wa_sent: 0, push_sent: 0, skipped: 0, errors: 0 };

  // Find trial users on Day 5 (between 4d23h and 5d1h ago)
  const windowStart = new Date(now - (5 * 24 + 1) * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now - (4 * 24 + 23) * 60 * 60 * 1000).toISOString();

  const { data: trialUsers } = await supabaseAdmin
    .from("user_plans")
    .select("user_id, trial_ends_at")
    .eq("plan", "pro")
    .eq("is_trial", true)
    .gte("trial_started_at", windowStart)
    .lte("trial_started_at", windowEnd);

  if (!trialUsers?.length) {
    return Response.json({ ok: true, ...results });
  }

  // Only warm up activated users (high_intent or low_intent — not dead)
  const userIds = trialUsers.map(u => u.user_id);

  const [{ data: segments }, { data: profiles }, { data: decisionViews }, { data: alreadySent }] =
    await Promise.all([
      supabaseAdmin
        .from("trial_segments")
        .select("user_id, segment")
        .in("user_id", userIds)
        .in("segment", ["high_intent", "low_intent"]),

      // Fetch profiles for phone, opt-in, name, exam_date
      supabaseAdmin
        .from("profiles")
        .select("id, phone_number, whatsapp_opt_in, preferred_language, full_name, exam_date")
        .in("id", userIds),

      // Check if any user already visited /trial/decision (suppress warmup)
      supabaseAdmin
        .from("growth_events")
        .select("user_id")
        .in("user_id", userIds)
        .eq("event_name", EVENTS.TRIAL_D7_PAGE_VIEWED),

      // Idempotency check — skip users already sent this warmup
      supabaseAdmin
        .from("whatsapp_messages")
        .select("user_id")
        .in("user_id", userIds)
        .like("idempotency_key", "trial_d5_warmup_%")
        .neq("status", "failed"),
    ]);

  const activatedIds        = new Set((segments ?? []).map(s => s.user_id));
  const profileMap          = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
  const alreadyViewedDecision = new Set((decisionViews ?? []).map(e => e.user_id));
  const warmupSentIds       = new Set((alreadySent ?? []).map(m => m.user_id));

  for (const { user_id, trial_ends_at } of trialUsers) {
    try {
      results.evaluated++;

      // Skip dead-trial users (not in activated set)
      if (!activatedIds.has(user_id)) { results.skipped++; continue; }

      // Skip if already visited decision page
      if (alreadyViewedDecision.has(user_id)) { results.skipped++; continue; }

      // Skip if already sent warmup
      if (warmupSentIds.has(user_id)) { results.skipped++; continue; }

      const profile = profileMap[user_id];
      if (!profile) { results.skipped++; continue; }

      // E2 fix: only skip if exam is within the NEXT 7 days (positive daysToExam).
      // Previously `daysToExam <= 7` also skipped users whose exam was yesterday (daysToExam = -1).
      if (profile.exam_date) {
        const daysToExam = Math.ceil(
          (new Date(profile.exam_date) - now) / 86_400_000
        );
        if (daysToExam > 0 && daysToExam <= 7) { results.skipped++; continue; }
      }

      // Count FSRS cards due next week for WhatsApp variable
      const { count: cardsDue } = await supabaseAdmin
        .from("spaced_repetition_cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .gte("next_due_at", now.toISOString())
        .lte("next_due_at", new Date(now.getTime() + 7 * 86_400_000).toISOString());

      const firstName  = (profile.full_name ?? "").split(" ")[0] || "Student";
      const cardsCount = cardsDue ?? 0;

      // Attempt WhatsApp first
      if (profile.phone_number && profile.whatsapp_opt_in !== false) {
        const waResult = await dispatchWhatsApp({
          userId: user_id,
          phoneNumber: profile.phone_number,
          templateName: "trial_d6_warmup_hinglish",
          variables: { "1": firstName, "2": String(cardsCount) },
          idempotencyKey: `trial_d5_warmup_${user_id}`,
        });

        if (waResult.ok) {
          results.wa_sent++;
          await trackEvent(user_id, EVENTS.TRIAL_D5_WARMUP_SENT, {
            channel: "whatsapp",
            cards_count: cardsCount,
          });
          continue;
        }
      }

      // Fallback: push notification
      const pushSent = await sendD6PushFallback(user_id, firstName);
      if (pushSent) {
        results.push_sent++;
        await trackEvent(user_id, EVENTS.TRIAL_D5_WARMUP_SENT, {
          channel: "push",
          cards_count: cardsCount,
        });
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors++;
      console.error(`[trial-d5-warmup] failed for ${user_id}:`, err.message);
    }
  }

  console.log("[cron/trial-d5-warmup]", results);
  return Response.json({ ok: true, ...results });
}
