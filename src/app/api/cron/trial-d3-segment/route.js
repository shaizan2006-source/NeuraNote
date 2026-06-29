import { supabaseAdmin } from "@/lib/serverAuth";
import { dispatchWhatsApp } from "@/lib/whatsapp/dispatch";
import { trackEvent, EVENTS } from "@/lib/telemetry/events";
import { cronSecretValid } from "@/lib/security/cronAuth";

// Runs daily at 6pm IST (12:30 UTC) — end-of-day captures "did they study today"
// Schedule in vercel.json: "30 12 * * *"

export async function GET(req) {
  if (!cronSecretValid(req)) return new Response(null, { status: 401 });

  const dryRun = req.headers.get("x-dry-run") === "true";

  const results = { evaluated: 0, high_intent: 0, low_intent: 0, dead: 0, skipped: 0, errors: 0 };

  // 1. Find trial users on Day 3 (between 2d23h and 3d1h ago) not yet segmented.
  //    Two-step approach: Supabase JS client doesn't support NOT IN (subquery),
  //    so we fetch already-segmented IDs first and filter client-side.
  const windowStart = new Date(Date.now() - (3 * 24 + 1) * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(Date.now() - (2 * 24 + 23) * 60 * 60 * 1000).toISOString();

  const [{ data: rawUsers }, { data: alreadySegmented }] = await Promise.all([
    supabaseAdmin
      .from("user_plans")
      .select("user_id, trial_started_at, trial_ends_at")
      .eq("plan", "pro")
      .eq("is_trial", true)
      .gte("trial_started_at", windowStart)
      .lte("trial_started_at", windowEnd),

    supabaseAdmin
      .from("trial_segments")
      .select("user_id"),
  ]);

  const segmentedIds = new Set((alreadySegmented ?? []).map(r => r.user_id));
  const eligibleUsers = (rawUsers ?? []).filter(u => !segmentedIds.has(u.user_id));

  for (const trialUser of eligibleUsers) {
    try {
      await processUser(trialUser, dryRun, results);
    } catch (err) {
      results.errors++;
      console.error(`[trial-d3-segment] failed for ${trialUser.user_id}:`, err.message);
    }
  }

  console.log("[cron/trial-d3-segment]", { dryRun, ...results });
  return Response.json({ ok: true, dryRun, ...results });
}

async function processUser(trialUser, dryRun, results) {
  const { user_id, trial_started_at, trial_ends_at } = trialUser;
  const since = trial_started_at;

  // 2. Gather activation signals in parallel
  const [briefings, questions, focusSessions, cards, profile] = await Promise.all([
    // Briefings opened (listened_at IS NOT NULL since trial started)
    supabaseAdmin
      .from("daily_briefings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .not("listened_at", "is", null)
      .gte("created_at", since)
      .then(r => r.count ?? 0),

    // Questions asked (conversations created since trial started)
    supabaseAdmin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .gte("created_at", since)
      .then(r => r.count ?? 0),

    // Focus sessions (rows in focus_progress since trial started)
    supabaseAdmin
      .from("focus_progress")
      .select("session_date", { count: "exact" })
      .eq("user_id", user_id)
      .gte("session_date", since.slice(0, 10))
      .then(r => r.data ?? []),

    // FSRS cards reviewed (repetition > 0 = reviewed at least once, card exists since trial)
    supabaseAdmin
      .from("spaced_repetition_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .gt("repetition", 0)
      .gte("created_at", since)
      .then(r => r.count ?? 0),

    // Profile for WhatsApp dispatch
    supabaseAdmin
      .from("profiles")
      .select("phone_number, whatsapp_opt_in, preferred_language, full_name")
      .eq("id", user_id)
      .maybeSingle()
      .then(r => r.data),
  ]);

  // Derive days_active from distinct session_dates
  const distinctDates = new Set(focusSessions.map(r => r.session_date));
  const days_active = distinctDates.size;
  const focus_sessions_count = focusSessions.length;

  const signals = {
    briefings_opened: briefings,
    questions_asked: questions,
    focus_sessions: focus_sessions_count,
    fsrs_cards_reviewed: cards,
    days_active,
  };

  // 3. Segment logic
  let segment;
  if (days_active >= 2 && (briefings >= 2 || questions >= 10)) {
    segment = "high_intent";
  } else if (days_active === 1 || (questions > 0 && days_active < 2)) {
    segment = "low_intent";
  } else {
    segment = "dead";
  }

  results.evaluated++;
  results[segment]++;

  // 4. Determine intervention
  const INTERVENTION_MAP = {
    high_intent: "high_intent_reinforce",
    low_intent:  "low_intent_recover",
    dead:        "dead_revive",
  };
  const TEMPLATE_MAP = {
    high_intent: "trial_d3_high_intent_reinforce",
    low_intent:  "trial_d3_low_intent_hinglish",
    dead:        "trial_d3_revive_hinglish",
  };

  const intervention = INTERVENTION_MAP[segment];
  const templateName = TEMPLATE_MAP[segment];

  if (dryRun) {
    console.log(`[trial-d3-segment] DRY RUN — user=${user_id} segment=${segment}`, signals);
    return;
  }

  // 5. Insert segment row
  await supabaseAdmin.from("trial_segments").upsert({
    user_id,
    trial_started_at,
    trial_ends_at,
    evaluated_at: new Date().toISOString(),
    segment,
    signals,
    intervention_triggered: intervention,
  }, { onConflict: "user_id" });

  // 6. Fire telemetry
  await trackEvent(user_id, EVENTS.TRIAL_D3_SEGMENT, {
    segment,
    signals,
    intervention_triggered: intervention,
  });

  // 7. Dispatch WhatsApp (skip if opted out or no phone)
  const phone = profile?.phone_number;
  const optedIn = profile?.whatsapp_opt_in !== false;

  if (!phone || !optedIn) {
    console.log(`[trial-d3-segment] no WhatsApp for ${user_id} — skipping message`);
    results.skipped++;

    // Update intervention status to reflect skipped send
    await supabaseAdmin
      .from("trial_segments")
      .update({ intervention_triggered: null })
      .eq("user_id", user_id);
    return;
  }

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "Student";
  const monthsToExam = profile?.exam_proximity_months_at_signup ?? 0;

  const VARIABLES = {
    high_intent: { "1": firstName, "2": String(days_active) },
    low_intent:  { "1": firstName, "2": String(questions), "3": String(monthsToExam) },
    dead:        { "1": firstName },
  };

  const waResult = await dispatchWhatsApp({
    userId: user_id,
    phoneNumber: phone,
    templateName,
    variables: VARIABLES[segment],
    idempotencyKey: `trial_d3_${segment}_${user_id}`,
  });

  // 8. Mark intervention sent (or failed)
  await supabaseAdmin
    .from("trial_segments")
    .update({
      intervention_triggered: waResult.ok ? intervention : "failed_whatsapp",
      intervention_sent_at: waResult.ok ? new Date().toISOString() : null,
    })
    .eq("user_id", user_id);
}
