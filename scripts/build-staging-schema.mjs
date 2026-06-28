#!/usr/bin/env node
/**
 * build-staging-schema.mjs — Phase 0 staging artifact (QA)
 *
 * Concatenates the curated, dependency-ordered migration set into a single
 * SQL file you can paste into the Supabase SQL editor (or pipe to psql) to
 * rebuild the schema on a FRESH staging project that matches production.
 *
 * Ordering + exclusions are derived from the Phase 0 migration analysis
 * (see docs/qa/STAGING_SETUP.md §"Ordered apply list"). This file is the
 * single source of truth for that order — edit APPLY_ORDER here, not the doc.
 *
 * Runs with zero dependencies and NO database connection. Safe to run now.
 *   node scripts/build-staging-schema.mjs
 * Output: supabase/staging/_apply_all.sql
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// Curated apply order. See docs/qa/STAGING_SETUP.md for the rationale behind
// every inclusion/exclusion. Paths are relative to repo root.
const APPLY_ORDER = [
  // 1. Pre-baseline ad-hoc tables the baseline does NOT include
  "supabase/migrations/weak_topics_tables.sql",
  "supabase/migrations/learning_events.sql",
  "supabase/migrations/spaced_repetition_cards.sql", // before pyqs ALTERs it
  "supabase/migrations/generated_artifacts.sql",
  "supabase/migrations/20260515_create_mastery_topics.sql",
  "supabase/migrations/match_learning_events.sql",

  // 2. Baseline spine + RPCs
  "supabase/migrations/20260517000001_baseline_schema.sql",
  "supabase/migrations/20260517000002_rpcs.sql",

  // 3. Timestamped feature migrations (chronological)
  "supabase/migrations/20260517000003_doc_processing_realtime.sql",
  "supabase/migrations/20260517000004_pricing_v2.sql",
  "supabase/migrations/20260517000005_push_notifications.sql",
  "supabase/migrations/20260517000006_daily_briefings.sql",
  "supabase/migrations/20260517000007_cohorts_full.sql",
  "supabase/migrations/20260517000008_photo_doubts.sql",
  "supabase/migrations/20260517000009_payment_orders.sql",
  "supabase/migrations/20260517000010_streak_freeze.sql",
  "supabase/migrations/20260517000011_pyqs.sql",
  "supabase/migrations/20260519000001_rls_core_tables.sql",
  "supabase/migrations/20260519000002_storage_buckets.sql",
  "supabase/migrations/20260519000003_waitlist_emails.sql",
  "supabase/migrations/20260519000004_account_deletion.sql",
  "supabase/migrations/20260519000005_utm_referral_tracking.sql",
  "supabase/migrations/20260519000006_concept_graph.sql",
  "supabase/migrations/20260519000007_missing_tables.sql",
  "supabase/migrations/20260520000001_streak_eval_idempotency.sql",
  "supabase/migrations/20260520000002_race_condition_constraints.sql",
  "supabase/migrations/20260520000003_privacy_columns.sql",
  "supabase/migrations/20260523000001_activation_schema.sql",
  "supabase/migrations/20260527000001_ai_spend_tracking.sql",
  "supabase/migrations/20260528000001_pricing_ab_test.sql",

  // 4. Realtime publication wiring (after referenced tables exist)
  "supabase/migrations/enable_realtime_for_progress.sql",
  "supabase/migrations/20260429_enable_realtime_weak_topics.sql",

  // 5. focus_progress.document_name (baseline lacks it)
  "supabase/migrations/add_document_columns_to_focus_progress.sql",

  // 6. Latest consolidation (profiles onboarding/theme columns)
  "supabase/migrations/20260628000001_consolidate_profiles_onboarding.sql",

  // 6b. Reconcile prod drift (objects prod has but git lacked: cards.metadata,
  //     user_plans.expires_at/order_id, conversations.messages, documents bucket).
  "supabase/migrations/20260628000002_reconcile_prod_drift.sql",

  // 6c. F-015: add fsrs_learning_steps so SRS cards graduate learning->review.
  "supabase/migrations/20260628000003_fsrs_learning_steps.sql",

  // 6d. F-021..F-024: enable RLS on the 6 tables that shipped RLS-off (payment_orders
  //     S0 cross-user read/forge/tamper, family_invites, waitlist/lead PII, etc.).
  "supabase/migrations/20260629000001_enable_rls_open_tables.sql",

  // 6e. F-008/9/10/16/25/26: cohort RLS recursion fix, concept_edges to_id, briefing RPC,
  //     sr_next_due IST, recaps + pdfs buckets.
  "supabase/migrations/20260629000002_phase3_fixes.sql",

  // 7. Manual patches: objects the app uses that live ONLY in prod, not in git
  //    (conversations.messages, documents/recaps buckets, get_active_briefing_users,
  //     anonymise_profile's missing columns). See STAGING_SETUP.md §"Manual patches".
  "supabase/staging/_manual_patches.sql",

  // 8. Make signup triggers non-fatal (override; runs last)
  "scripts/fix-signup-triggers.sql",
];

// Excluded files (documented so an auditor sees what was deliberately dropped).
const EXCLUDED = {
  "supabase/migrations.sql": "superseded by baseline + missing_tables (conflicting table shapes)",
  "supabase/voice_migration.sql": "duplicate of voice_calls in 20260519000007_missing_tables.sql",
  "supabase/quickchat_migration.sql": "conflicts with baseline conversations; its messages col is added via _manual_patches.sql instead",
  "supabase/concept_graph_migration.sql": "superseded by 20260519000006_concept_graph.sql (::text RLS policies)",
  "supabase/migrations/20260504120000_add_theme_preference.sql": "ALTERs user_profiles which is never created -> would ERROR; theme_preference now on profiles via 20260628000001",
  "supabase/migrations/20260429_add_subject_to_exams.sql": "superseded: exams.subject already in baseline",
  "supabase/migrations/add_active_time_to_focus_progress.sql": "superseded: focus_progress.active_time_seconds already in baseline",
};

const banner = (title) =>
  `\n\n-- ======================================================================\n-- ${title}\n-- ======================================================================\n`;

let out = `-- AUTO-GENERATED by scripts/build-staging-schema.mjs — DO NOT EDIT BY HAND.
-- Curated, dependency-ordered schema for a FRESH staging Supabase project.
-- Apply against an EMPTY project only (never prod). See docs/qa/STAGING_SETUP.md.
--
-- Excluded files (and why):
${Object.entries(EXCLUDED).map(([f, why]) => `--   - ${f}: ${why}`).join("\n")}
`;

// Preamble: required extensions MUST exist before any file uses vector/ivfflat.
// (Section-1 ad-hoc files — learning_events, match_learning_events — use vector
// before the baseline's CREATE EXTENSION would run.)
out += banner("preamble — required extensions");
out += "CREATE EXTENSION IF NOT EXISTS vector;\nCREATE EXTENSION IF NOT EXISTS pgcrypto;\n";

// Strip lone "/" lines (sqlplus terminator, invalid in psql). Left in place they
// have no semicolon, so psql buffers them and prepends them to the NEXT file's
// first statement — silently breaking that CREATE. We sanitize during concat
// rather than editing the committed migrations (preserves their history).
const stripStraySlash = (sql) =>
  sql.split(/\r?\n/).filter((l) => !/^\s*\/\s*$/.test(l)).join("\n").trimEnd();

let missing = 0;
for (const rel of APPLY_ORDER) {
  const abs = join(REPO, rel);
  if (!existsSync(abs)) {
    missing++;
    out += banner(`MISSING FILE (skipped): ${rel}`);
    out += `-- !! Expected file not found. Investigate before applying. !!\n`;
    console.warn(`WARN  missing: ${rel}`);
    continue;
  }
  out += banner(rel);
  out += stripStraySlash(readFileSync(abs, "utf8")) + "\n";
  console.log(`ok    ${rel}`);
}

const outDir = join(REPO, "supabase/staging");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "_apply_all.sql");
writeFileSync(outPath, out, "utf8");

console.log(`\nWrote ${outPath}`);
console.log(`${APPLY_ORDER.length - missing} files concatenated, ${missing} missing.`);
if (missing) process.exitCode = 1;
