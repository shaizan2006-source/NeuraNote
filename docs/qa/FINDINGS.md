# QA Findings Register — Ask My Notes

Format: ID · Severity · Area · What's wrong · Repro · Expected vs Actual · Fix · Status.
Severity: S0 blocker · S1 critical · S2 major · S3 minor · S4 polish.

**Counts (Phase 0):** S0 **0** · S1 **1** · S2 **3** · S3 **7**.  **Fixed & verified: 5** (F-001/2/3/4/11) · **Open: 6** (F-005/6/7/8/9/10).

Method note: found by rebuilding the schema **from git** on an isolated staging project, exercising it, and a **read-only prod schema introspection** (catalog only, no customer data, 2026-06-28). Prod truth let me finalize severities — most "drift" items don't affect prod today.

---

## F-011 · **S1** · Privacy / Account deletion  ✅ FIXED
**What's wrong:** account deletion silently failed in **production**. `anonymizeUser()` ([anonymize.js](../../src/lib/privacy/anonymize.js)) updated `profiles` with `display_name`/`phone`/`timezone` and `user_plans.billing_email` — **none exist in prod** (the real column is `phone_number`; the others were never created). PostgREST rejects the whole update → `profileErr` → `profileFailed=true` → **auth identity NOT deleted and zero PII scrubbed**; the `user_plans` step is a *critical* error so `anonymised:false` always.
**Repro:** prod introspection shows `profiles.display_name/phone/timezone` + `user_plans.billing_email` MISSING. On staging (mirrors prod): `UPDATE profiles SET display_name=… ` → `ERROR: column "display_name" does not exist`. So the deletion path errors and preserves the account.
**Expected vs actual:** deleting an account scrubs PII (name/phone/region/city/exam) and removes the auth login. Actual: PII retained, auth login retained, deletion reports failure.
**Fix:** corrected `anonymize.js` to the real schema (`email/avatar_url/phone_number/parent_phone_number/region/city/exam_date/cohort_id` + `deleted_at`); removed the dead `user_plans.billing_email` update. Verified at data layer (corrected `UPDATE`→`UPDATE 1`, rolled back).
**Status:** **FIXED** in code. Follow-ups: full end-to-end deletion test (Phase 3 privacy); audit how many prior prod deletion requests failed and re-run them.

## F-005 · S2 · Revenue / Trial expiry  ⛔ OPEN
**What's wrong:** `getUserPlan()` ([planLimits.js:48,54](../../src/lib/planLimits.js#L48)) downgrades only on `expires_at < now`; it ignores `is_trial`/`trial_ends_at`. A lapsed trial (`trial_ends_at` past, `expires_at` NULL) keeps its `plan` (pro).
**Repro:** `expired@staging` persona: `plan=pro, is_trial=t, trial_ends=2026-06-23 (past), expires_at=NULL` → `getUserPlan` returns `pro` → full Pro after trial end.
**Fix (proposed):** treat `is_trial && trial_ends_at < now` as expired→`free` in `getUserPlan`, OR ensure a trial-expiry cron writes `expires_at`/downgrades `plan`.
**Status:** OPEN. **Phase 1:** confirm whether a cron compensates; if not → revenue leak (paid features free post-trial). Same logic runs in prod.

## F-007 · S2 · Migrations / DR  🔶 PARTIALLY ADDRESSED
**What's wrong:** schema not reproducible from git in one clean pass: dead `20260504120000_add_theme_preference.sql` (ALTERs non-existent `user_profiles` → ERROR); root `supabase/{migrations,voice_migration,quickchat_migration,concept_graph_migration}.sql` conflict with the timestamped set; many `CREATE POLICY`/`ADD CONSTRAINT`/`ALTER PUBLICATION` lack `IF NOT EXISTS` (not re-run-idempotent); plus the drift in F-001/2/3/4.
**Fix:** committed `20260628000002_reconcile_prod_drift.sql` + curated ordered apply (`build-staging-schema.mjs`) now rebuild a prod-matching schema. **Still recommend:** delete the dead migration, reconcile/remove the root `.sql` files.
**Status:** staging reproducible; clean committed migration set still recommended.

## F-008 · S2 · Storage / Weekly recaps  ⛔ OPEN
**What's wrong:** prod has **no `recaps` bucket**, but [recaps/generator.js:81-82](../../src/lib/recaps/generator.js#L81) `storage.from("recaps").upload(...)` then `createSignedUrl(...)` **without checking the upload error** → null signed URL → throws. The weekly-recap cron (`generate-weekly-recaps`, Sundays) generates the OpenAI TTS audio first, so cost is incurred then the upload fails.
**Repro:** prod bucket list = `briefings, documents, pdfs, photo-doubts, user-pdfs` (no `recaps`). Code uploads to `recaps`.
**Expected vs actual:** weekly recap audio saved + delivered. Actual: upload fails for every user weekly; wasted TTS spend.
**Fix (proposed):** create the `recaps` bucket in prod (+ folder-scoped RLS), OR handle the upload error and fall back to the text recap.
**Status:** OPEN. **Verify** whether the cron is enabled in prod and whether each user error is caught (degraded vs noisy).

## F-001 · S3 (was potential S1) · Payments schema drift  ✅ FIXED
`user_plans.expires_at`/`order_id` read by `getUserPlan` and written by both Razorpay grant paths ([webhook:100-101](../../src/app/api/payments/webhook/route.js#L100), [verify:42-43](../../src/app/api/payments/verify/route.js#L42)) were absent from migrations. **Prod HAS both** → prod works; risk was DR/rebuild only. **Fixed** via `20260628000002_reconcile_prod_drift.sql` (IF NOT EXISTS; no-op on prod).

## F-002 · S3 · Q&A schema drift  ✅ FIXED
`conversations.messages` read by [conversations/[id]:13](../../src/app/api/conversations/[id]/route.js#L13), absent from migrations; **prod HAS it**. **Fixed** via reconcile migration.

## F-003 · S3 · Storage drift (documents bucket)  ✅ FIXED
`documents` bucket used in code, absent from migrations; **prod HAS it**. **Fixed** via reconcile migration (bucket row; staging RLS in `_manual_patches.sql`). (`recaps` split to F-008.)

## F-004 · S3 (was potential S1) · FSRS / cards.due  ✅ FIXED
`GET /api/cards/due` 500'd because it selects `cards.metadata`, absent from the git `cards` table. **Prod HAS `cards.metadata`** → prod works; the break was staging/from-git only. **Fixed** via reconcile migration (`cards.metadata jsonb`); **verified `/api/cards/due` → HTTP 200 `{"cards":[]}`**, other 4 baseline APIs still 200.

## F-006 · S3 · DB integrity / idempotency  ⛔ OPEN
No `UNIQUE(user_id)` on `user_plans` or `study_streaks` (only PK on `id`); app `.upsert()`s these and `getUserPlan` uses `.maybeSingle()` → duplicates possible → `maybeSingle` errors; payment upserts may not dedupe.
**Fix (proposed):** add `UNIQUE(user_id)` and use as upsert target (after de-duping existing rows).
**Status:** OPEN. Prod constraints **UNVERIFIED** over REST — needs prod DB connection or Phase-3 check.

## F-009 · S3 · Briefings / dead RPC  ⛔ OPEN
`get_active_briefing_users(min_streak,min_session_date)` is called by [briefings/generator.js:135](../../src/lib/briefings/generator.js#L135) but **missing in prod** → the `.catch()` fallback (streak≥1, cap 500) runs instead of the intended "streak≥3 OR recent session". Briefings target a broader set than designed (possible extra TTS cost).
**Fix (proposed):** create the RPC, or delete the dead call and make the fallback the intended rule.
**Status:** OPEN (no crash — graceful fallback).

## F-010 · S3 · Storage inventory drift  ⛔ OPEN
Prod has an undocumented **`pdfs`** bucket not defined in any migration (code uses `documents` + `user-pdfs`). Likely legacy.
**Fix (proposed):** confirm usage; either document it in a migration or remove it.
**Status:** OPEN.

---

### Cross-cutting
- **Schema drift is the theme** (F-001/2/3/4/8/9/10/11): the committed migrations have diverged from prod in both directions — prod has columns/buckets git lacks (F-001/2/3/4), and code references objects/columns prod lacks (F-008/9/11). The reconcile migration + curated apply fix the "git behind prod" side; the "code ahead of prod" side (F-008/9/11) needs prod changes or code fixes (F-011 done).
- **Prod NOT mutated.** Only read-only catalog introspection was run against prod. All writes/fixes are on staging + the repo. F-001/2/3/4 migration is a verified no-op on prod; F-011 is a code change pending deploy.
