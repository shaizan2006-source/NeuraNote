#!/usr/bin/env node
/**
 * Dry-run tool: evaluate a specific user's Day 3 activation signals
 * without writing to the DB or sending any WhatsApp messages.
 *
 * Usage:
 *   node scripts/backfill-trial-segments.js <user_id>
 *
 * Requires .env.local to be loaded (uses SUPABASE_SERVICE_ROLE_KEY).
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: node scripts/backfill-trial-segments.js <user_id>");
  process.exit(1);
}

async function evaluate(userId) {
  console.log(`\nEvaluating user: ${userId}\n`);

  // Get trial plan
  const { data: plan } = await supabase
    .from("user_plans")
    .select("trial_started_at, trial_ends_at, is_trial, plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (!plan) { console.error("No user_plans row found."); process.exit(1); }
  if (!plan.is_trial) { console.warn("User is not on a trial (is_trial=false)."); }

  const since = plan.trial_started_at ?? new Date(Date.now() - 3 * 86400000).toISOString();
  console.log("Trial started:", since);
  console.log("Trial ends:  ", plan.trial_ends_at);

  // Signals
  const [briefings, questions, focusSessions, cards, existingSegment] = await Promise.all([
    supabase.from("daily_briefings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("listened_at", "is", null)
      .gte("created_at", since)
      .then(r => r.count ?? 0),

    supabase.from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since)
      .then(r => r.count ?? 0),

    supabase.from("focus_progress")
      .select("session_date")
      .eq("user_id", userId)
      .gte("session_date", since.slice(0, 10))
      .then(r => r.data ?? []),

    supabase.from("spaced_repetition_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gt("repetition", 0)
      .gte("created_at", since)
      .then(r => r.count ?? 0),

    supabase.from("trial_segments")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(r => r.data),
  ]);

  const distinctDates = new Set(focusSessions.map(r => r.session_date));
  const days_active = distinctDates.size;

  const signals = {
    briefings_opened: briefings,
    questions_asked: questions,
    focus_sessions: focusSessions.length,
    fsrs_cards_reviewed: cards,
    days_active,
    distinct_dates: [...distinctDates],
  };

  let segment;
  if (days_active >= 2 && (briefings >= 2 || questions >= 10)) {
    segment = "high_intent";
  } else if (days_active === 1 || (questions > 0 && days_active < 2)) {
    segment = "low_intent";
  } else {
    segment = "dead";
  }

  console.log("\n── Signals ──────────────────────────────────");
  Object.entries(signals).forEach(([k, v]) => console.log(`  ${k}: ${JSON.stringify(v)}`));
  console.log("\n── Decision ─────────────────────────────────");
  console.log(`  Segment: ${segment.toUpperCase()}`);

  if (existingSegment) {
    console.log(`\n── Existing DB row ──────────────────────────`);
    console.log(`  Current segment: ${existingSegment.segment}`);
    console.log(`  Evaluated at:    ${existingSegment.evaluated_at}`);
    console.log(`  Intervention:    ${existingSegment.intervention_triggered}`);
  } else {
    console.log("\n  (No existing trial_segments row — user not yet evaluated)");
  }

  console.log("\n✓ Dry run complete — no DB writes, no WhatsApp sent.\n");
}

evaluate(userId).catch(err => {
  console.error(err);
  process.exit(1);
});
