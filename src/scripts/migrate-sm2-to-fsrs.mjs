#!/usr/bin/env node
/**
 * One-shot migration: converts all SM-2 spaced_repetition_cards to FSRS baseline.
 * Run: node src/scripts/migrate-sm2-to-fsrs.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { migrateSM2Card } from "../lib/fsrs/scheduler.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let from = 0;
const batchSize = 200;
let migrated = 0;
let skipped = 0;

console.log("Starting SM-2 → FSRS migration…");

while (true) {
  const { data, error } = await supabase
    .from("spaced_repetition_cards")
    .select("id, topic, repetition, interval_days, ease_factor, next_due_at, last_review_at")
    .is("fsrs_stability", null)
    .range(from, from + batchSize - 1);

  if (error) { console.error(error.message); process.exit(1); }
  if (!data || data.length === 0) break;

  for (const card of data) {
    try {
      await migrateSM2Card(card);
      migrated++;
    } catch (e) {
      console.warn(`Skipping card ${card.id}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`Processed ${from + data.length} cards (migrated: ${migrated}, skipped: ${skipped})`);
  if (data.length < batchSize) break;
  from += batchSize;
}

console.log(`Done. Migrated ${migrated} cards, skipped ${skipped}.`);