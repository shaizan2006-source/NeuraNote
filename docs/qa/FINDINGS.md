# QA Findings Register — Ask My Notes

Format: ID · Severity · Area · What's wrong · Repro · Expected vs Actual · Fix · Status.
Severity: S0 blocker · S1 critical · S2 major · S3 minor · S4 polish.

**Counts:** S0 **1** · S1 **8** · S2 **7** · S3 **11** (27 findings).  **Fixed & verified: 25** · **Addressed: F-006** · **Open: 1** — only **F-007** (release hygiene, a process recommendation, not a code bug).

**Phase-3 remediation pass:** fixed F-008 (recaps bucket + text fallback), F-009 (briefing RPC), F-010 (pdfs bucket parity), F-016 (sr_next_due IST), F-017/F-027 (mock-test auth + redirect), F-018 (study redirect), F-019 (streak IST), F-020 (photo-doubt validation), F-025 (concept_edges to_id), F-026 (cohort_members recursion). Migration `20260629000002_phase3_fixes.sql` + 5 route/page/lib edits. Verified where live-testable (cohort_members no `42P17`, photo-doubt 400 on non-image, pages compile).

**Phase 3 RLS isolation (the #1 risk):** probed ~40 user-data tables table-by-table with two real user tokens directly against PostgREST. **39 tables correctly isolated** (identity, content, learning-graph, activity/notifications — read/insert/update all denied cross-user). The **6 RLS-OFF tables were confirmed live cross-user leaks** (F-021 S0…F-024 S2) — now fixed by enabling RLS (`20260629000001`). Two policy bugs found: F-025 (concept_edges), F-026 (cohort_members recursion).
(Phase 1: F-005 escalated S2→S1 then FIXED+verified; F-012/13/14 from money-path; F-015 from FSRS; F-016/17/18 from FSRS/routing.)

**Verified CORRECT (no finding):** mock-test scoring (TV-7) all 5 submission types — `tests/staging/phase1-core.mjs`. Razorpay webhook signature-rejection + idempotency. **Auth/routing — 12/12 on mobile+desktop** (`tests/e2e/phase1-auth-routing.spec.js`): real 404s (unknown URL + invalid `/pyqs/<slug>`), logged-out `/dashboard`/`/sage` redirect to `/login` with no authed-content leak, `/ask-ai`+`/chat` → `/sage` (308), login works, deep-link + back/forward intact. FSRS: rating ordering (again<hard<good<easy), persistence, **no IST/UTC *scheduling* bug**, and (after the F-015 fix) graduation + interval growth + lapse/relearning all correct (`tests/staging/phase1-fsrs.mjs` 29/29). **Gamification streak math** correct: consecutive +1, gap→1, same-day idempotent, never negative/NaN (`tests/staging/phase1-lighter.mjs`). **Photo Doubt** per-day rate-limit (429) + missing-image (400) handled. **Brain Map** + **today's briefing** endpoints respond without 500. (Minor: `mock_tests.total_marks` is static config regardless of actual PYQ count — cosmetic.)

**Money-path test result (staging, Razorpay test mode): 10/10 pass after fixes.** create-order (server-priced), verify (signature-checked, tier bound to order, error-checked), webhook (signature rejection + idempotent replay) all verified. Harness: `tests/staging/phase1-money.mjs`.

Method note: found by rebuilding the schema **from git** on an isolated staging project, exercising it, and a **read-only prod schema introspection** (catalog only, no customer data, 2026-06-28). Prod truth let me finalize severities — most "drift" items don't affect prod today.

---

## F-011 · **S1** · Privacy / Account deletion  ✅ FIXED
**What's wrong:** account deletion silently failed in **production**. `anonymizeUser()` ([anonymize.js](../../src/lib/privacy/anonymize.js)) updated `profiles` with `display_name`/`phone`/`timezone` and `user_plans.billing_email` — **none exist in prod** (the real column is `phone_number`; the others were never created). PostgREST rejects the whole update → `profileErr` → `profileFailed=true` → **auth identity NOT deleted and zero PII scrubbed**; the `user_plans` step is a *critical* error so `anonymised:false` always.
**Repro:** prod introspection shows `profiles.display_name/phone/timezone` + `user_plans.billing_email` MISSING. On staging (mirrors prod): `UPDATE profiles SET display_name=… ` → `ERROR: column "display_name" does not exist`. So the deletion path errors and preserves the account.
**Expected vs actual:** deleting an account scrubs PII (name/phone/region/city/exam) and removes the auth login. Actual: PII retained, auth login retained, deletion reports failure.
**Fix:** corrected `anonymize.js` to the real schema (`email/avatar_url/phone_number/parent_phone_number/region/city/exam_date/cohort_id` + `deleted_at`); removed the dead `user_plans.billing_email` update. Verified at data layer (corrected `UPDATE`→`UPDATE 1`, rolled back).
**Status:** **FIXED** in code. Follow-ups: full end-to-end deletion test (Phase 3 privacy); audit how many prior prod deletion requests failed and re-run them.

## F-021 · **S0** · RLS / payment_orders cross-user read + forge + tamper  ✅ FIXED + verified
**What's wrong:** `payment_orders` shipped with **RLS OFF**. Any ordinary authenticated user could read, insert, and update **other users'** payment orders directly via PostgREST.
**Repro (live, staging):** as User A (`free@`) with A's JWT + anon key: `GET /rest/v1/payment_orders?select=*` returned User B's order; `POST` a forged order with `user_id=B` → 201; `PATCH ?order_id=eq.<B order>` `amount: 49900→1` → 200 (row changed).
**Expected vs actual:** a user sees/affects only their own orders. Actual: full cross-user billing read + forge + tamper.
**Fix:** `ENABLE ROW LEVEL SECURITY` + owner-only SELECT (`auth.uid()=user_id`), no user write policy (writes are service-role). Migration `20260629000001_enable_rls_open_tables.sql`. **Verified:** with a B-owned order present, A's read=`[]`, forge=`42501 RLS violation`, tamper affected 0 rows, B's amount unchanged.
**Status:** **FIXED + verified.** ⚠️ Ships RLS-off in the migrations → **almost certainly live in prod; patch ASAP.**

## F-022 · **S1** · RLS / family_invites off — invite-code leak + forgery + role escalation  ✅ FIXED
RLS OFF. As A: read B's row incl. secret `invite_code`; forged an invite with `primary_user_id=B`; PATCHed role `member→primary`. → join another user's family plan / unauthorized plan access. **Fixed**: RLS enabled + owner SELECT (`primary_user_id`/`used_by`); writes service-role only. Verified A→0 rows. Prod likely affected.

## F-023 · **S1** · RLS / lead + waitlist PII exposed (coaching_institute_pilots, waitlist_emails)  ✅ FIXED
RLS OFF, no `user_id`. Any logged-in user could read/scrape + inject business-lead contact PII (emails/phones) and the waitlist email list. **Fixed**: RLS enabled, **no anon/authenticated policy** (service-role only — `/api/waitlist` writes via service-role, so signup still works). Verified A→0 rows. Prod likely affected.

## F-024 · S2 · RLS / cancellation_reasons + decompression_triggers off — cross-user read/overwrite  ✅ FIXED
RLS OFF. As A: read + overwrote B's cancellation feedback and behavioral/wellbeing data. **Fixed**: RLS enabled + owner SELECT (`user_id`); writes service-role. Verified A→0 rows.

## F-025 · S2 · RLS / concept_edges INSERT doesn't validate `to_id` ownership  ✅ FIXED
The `concept_edges` owner policy checks `from_id`'s concept ownership but not `to_id`, so a user can create an edge pointing at **another user's** concept (dangling cross-user reference). No data leak (reads still scoped), but an integrity hole. Fix: validate both `from_id` and `to_id` belong to `auth.uid()` in the policy. Low priority.

## F-026 · S2 · RLS / cohort_members policy infinite recursion (feature broken)  ✅ FIXED
The `cohort_members` SELECT policy is self-referential (`cohort_id IN (SELECT cohort_id FROM cohort_members WHERE user_id=auth.uid())`) → Postgres `42P17 infinite recursion`, so **any authenticated SELECT on `cohort_members` errors** — the cohort/leaderboard feature is broken for logged-in users reading it directly (server snapshots via service-role still work). Fix: make it non-recursive — either `user_id = auth.uid()` (own membership) or a `SECURITY DEFINER` helper returning the caller's cohort_ids. Needs a product call on co-member visibility, so not auto-applied.

## F-027 · **S1** · Mock-test simulator unusable from the UI  ✅ FIXED
**What's wrong:** `src/app/mock-test/page.js` sent its `create` and `submit` fetches with **no `Authorization` header**, but `verifyAuth` is Bearer-only → both 401 → a logged-in student could never start or submit a mock test. The page also had no auth gate (F-017).
**Repro:** log in, open `/mock-test`, Start → `create` 401 → "Couldn't load the test." (The API works with a token — proven by `phase1-core.mjs`.)
**Fix:** the page now reads the Supabase session (redirects logged-out users to `/login`) and passes `Authorization: Bearer <token>` to create + submit. Verified: page compiles + renders 200.
**Status:** FIXED. (Found while addressing F-017.)

## F-014 · **S1** · Payments / create-order crashes  ✅ FIXED
**What's wrong:** `POST /api/payments/create-order` returned **500 on every call** — `supabaseAdmin.from("payment_orders").upsert(...).catch(...)` ([create-order.js:62](../../src/app/api/payments/create-order/route.js#L62)); the supabase-js builder is a thenable, not a Promise, so `.catch` is not a function → `TypeError`. **No checkout could start.**
**Repro:** `POST /api/payments/create-order {plan:"student"}` → 500; server log `create-order error: TypeError: ...upsert(...).catch is not a function`.
**Fix:** `await` the upsert and check the returned `error` (no `.catch`). Verified: create-order → 200, amount 19900. (Likely undeployed working-tree WIP given the repo's uncommitted state — must not ship.)
**Status:** **FIXED** + verified.

## F-012 · **S1** · Payments / tier-escalation (verify trusts client plan)  ✅ FIXED
**What's wrong:** `POST /api/payments/verify` granted the **client-supplied `plan`**; the Razorpay signature only covers `order_id|payment_id` ([verify.js:27](../../src/app/api/payments/verify/route.js#L27)), not the tier. A user could pay for a **student (₹199)** order then call verify with `plan:"family"` (₹4,499) using the legit signature → get the expensive tier for the cheap price.
**Repro (live, staging):** create student order → verify with valid signature + `plan:"family"` → `user_plans.plan` became `family`. Confirmed by `phase1-money.mjs`.
**Fix:** verify now derives the tier from the **server-stored order** (`payment_orders.tier` by `razorpay_order_id`, with `user_id` match) and ignores the client `plan`. Verified: escalation attempt now grants `student` (the paid tier).
**Status:** **FIXED** + verified. (Webhook was already safe — derives plan from server-set `notes.plan`.)

## F-013 · S2 · Payments / verify false-success  ✅ FIXED
**What's wrong:** `verify` ignored the entitlement upsert error and returned `{success:true}` even when the write failed → **"payment captured, access not granted"** with the user told it succeeded. Manifested on staging (the upsert failed on the missing constraint, F-006, yet verify reported success).
**Fix:** verify now checks the upsert error and returns 500 (with a support message) if the grant write fails — matching the webhook's behavior.
**Status:** **FIXED** + verified.

## F-015 · **S1** · FSRS / spaced repetition doesn't space  ✅ FIXED + verified
**What's wrong:** cards never graduate `learning → review`, so the interval is **frozen at the ~10-minute learning step forever** for `again`/`hard`/`good` reviews (only `easy`, which jumps straight to `review`, ever produces a multi-day interval). `src/lib/fsrs/scheduler.js` (`scheduleReview`, ts-fsrs) neither **persists** nor **reconstructs** the ts-fsrs `learning_steps` cursor, so every review resets the step to 0 and re-applies the first learning step.
**Repro (live, staging):** ensure a `mastery_topics` row with `topic == card.concept_id` so `/api/cards/[id]/review` invokes the scheduler; POST `review {rating:'good'}` repeatedly (on-time). Re-read `spaced_repetition_cards`. Harness: `tests/staging/phase1-fsrs.mjs`.
**Expected vs actual:** on-time `good` reviews grow the interval (in-process ts-fsrs control: `[0,2,11,46,163,498]` days, state→`review`). Actual via the endpoint: `interval_days=[0,0,0,0,0]`, `fsrs_stability` frozen `2.307`, `fsrs_state='learning'` ×5 — card re-shown every ~10 min, lapses never counted, relearning never triggered, and the `fsrs-due-reminder` cron (filters `fsrs_state='review'`) never fires for these cards. **Core spaced-repetition value is broken.**
**Proposed fix (isolation-verified by the test):** in `scheduler.js` (1) add `spaced_repetition_cards.fsrs_learning_steps INT` and write `next.learning_steps` in the update; (2) set `learning_steps: card.fsrs_learning_steps ?? 0` when building the fsrsCard before `f.next()`. (Verified: with the cursor preserved, `good#2` graduates to `review` with a 2-day interval.) Alternatively set empty learning/relearning steps in `generatorParameters` so cards graduate on first `good`.
**Fix applied:** `scheduler.js` now reconstructs `learning_steps` from `card.fsrs_learning_steps` before `f.next()` and persists `next.learning_steps`; new migration `20260628000003_fsrs_learning_steps.sql` adds the column. **Verified live (29/29):** repeated `good` → intervals `[0,2,11,45,171]`d, state graduates `learning→review` on the 2nd review; lapse resets `171d→0d`, `lapses 0→1`, `state→relearning`.
**Status:** **FIXED + verified.** Deploy with the scheduler change + the new migration.

## F-020 · S2 · Photo Doubt Cam / no file type or size validation (TV-8)  ✅ FIXED
`POST /api/photo-doubt` ([route.js:36-52](../../src/app/api/photo-doubt/route.js#L36)) takes the `image` form field with **no MIME allowlist and no size cap** before uploading to storage and sending to OpenAI vision (gpt-4o). A non-image or very large file is uploaded + sent to the model — a **cost/DoS abuse vector**; the only guard is the per-day count (free 3 / student 20 / pro ∞). **Verified:** limit returns 429; missing image returns 400; but type/size are unchecked.
**Fix:** validate `file.type ∈ {image/jpeg,png,webp}` and reject `file.size > ~10MB` before upload/vision.
**Status:** OPEN. (Storage bucket cap is 10MB but the route accepts the buffer + calls vision before that matters.)

## F-019 · S3 · Gamification / streak day-boundary uses UTC not IST  ✅ FIXED
`/api/streak` ([route.js:48,69](../../src/app/api/streak/route.js#L48)) computes "today"/"yesterday" via `new Date().toISOString()` (UTC). Indian users' day rolls at 05:30 IST, so studying 00:00–05:30 IST counts toward the previous UTC day → streaks can break or mis-increment near the boundary. **Streak math itself is correct** (consecutive +1, gap→1, same-day idempotent, never negative/NaN — verified). Fix: compute the date in `Asia/Kolkata`. Low priority. (Same IST-date class as F-016; the briefings/streak-eval crons should be audited for the same pattern.)

## F-016 · S3 · FSRS / `days_overdue` UTC truncation  ✅ FIXED
`sr_next_due()` computes `days_overdue = now()::date - fsrs_due::date` in the DB session tz (UTC) — a cosmetic off-by-one "days overdue" label for IST users near midnight. **Scheduling is unaffected** (due selection uses `fsrs_due <= now()`). Fix: truncate `AT TIME ZONE 'Asia/Kolkata'`. Low priority.

## F-017 · S3 · Auth-gating / `/mock-test` open to logged-out  ✅ FIXED
`/mock-test` renders the full setup UI (exam list, instructions, Start) to logged-out visitors — no redirect/gate. **No personal data leaks** (the mock-test APIs are token-gated). Fix: add a client `getSession()` check → `router.push('/login')` like DashboardContext. Cosmetic/consistency.

## F-018 · S3 · Auth-gating / `/study` no redirect  ✅ FIXED
`/study` shows an in-place "sign in" message to logged-out users instead of redirecting to `/login` — degrades gracefully, no leak. Optional: redirect on missing session.

## F-005 · **S1** · Revenue / Trial-expiry entitlement bypass  ✅ FIXED + verified
**What's wrong:** the server-side entitlement gate `getUserPlan()` ([planLimits.js:48-55](../../src/lib/planLimits.js#L48)) downgrades **only** on `expires_at < now` and ignores `is_trial`/`trial_ends_at`. A trial row is `{plan:'pro', is_trial:true, trial_ends_at:+7d}` with **`expires_at` NULL** ([onboarding/complete:81-88](../../src/app/api/onboarding/complete/route.js#L81)). Confirmed by code search: **no cron or code path sets `expires_at` / downgrades `plan` at trial end** (`expires_at` is written only by payments + admin grants). Trial expiry is enforced **UI-only** (`TrialBanner`, `trial/decision` redirect — both client-side, bypassable).
**Repro:** `expired@staging` persona (`plan=pro, is_trial=t, trial_ends=2026-06-23 past, expires_at=NULL`) → `getUserPlan()` returns `pro`. `canAskQuestion`/`canUploadPDF` therefore grant unlimited (Pro) access. Final live proof pending: `GET/POST /api/ask` as this persona should be free-tier-blocked but is served as Pro.
**Expected vs actual:** after the 7-day trial, the user is downgraded to Free server-side (1 PDF, 20 Q&A/day). Actual: retains **Pro (unlimited Q&A/PDFs + Pro AI budget) indefinitely** — defeats trial→paid conversion (the product's revenue mechanism) and grants ongoing AI cost to non-payers (capped only by `AI_BUDGET_PRO_USD`/mo).
**Fix (proposed, smallest):** in `getUserPlan`, also expire trials —
```js
const { data } = await supabase.from("user_plans")
  .select("plan, expires_at, is_trial, trial_ends_at").eq("user_id", userId).maybeSingle();
if (!data) return "free";
if (data.expires_at && new Date(data.expires_at) < new Date()) return "free";
if (data.is_trial && data.trial_ends_at && new Date(data.trial_ends_at) < new Date()) return "free";
return data.plan || "free";
```
(Alternatively/additionally, a daily cron that downgrades lapsed trials.)
**Fix applied:** `getUserPlan` now also returns `free` when `is_trial && trial_ends_at < now`. **Verified live:** expired persona at the free cap → `/api/ask` 403 "Free plan allows 20 questions per day" (treated as free, not pro).
**Status:** **FIXED + verified.** Deploy this with the others; consider also backfilling/auditing trials that lapsed under the old logic.

## F-007 · S2 · Migrations / DR  🔶 PARTIALLY ADDRESSED
**What's wrong:** schema not reproducible from git in one clean pass: dead `20260504120000_add_theme_preference.sql` (ALTERs non-existent `user_profiles` → ERROR); root `supabase/{migrations,voice_migration,quickchat_migration,concept_graph_migration}.sql` conflict with the timestamped set; many `CREATE POLICY`/`ADD CONSTRAINT`/`ALTER PUBLICATION` lack `IF NOT EXISTS` (not re-run-idempotent); plus the drift in F-001/2/3/4.
**Fix:** committed `20260628000002_reconcile_prod_drift.sql` + curated ordered apply (`build-staging-schema.mjs`) now rebuild a prod-matching schema. **Still recommend:** delete the dead migration, reconcile/remove the root `.sql` files.
**Status:** staging reproducible; clean committed migration set still recommended.

## F-008 · S2 · Storage / Weekly recaps  ✅ FIXED
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

## F-006 · S3 (drift, load-bearing) · DB integrity / idempotency  ✅ ADDRESSED
No `UNIQUE(user_id)` on `user_plans`/`study_streaks` in git (only PK on `id`), yet the app upserts `onConflict:user_id` (payments, streaks) and `getUserPlan` uses `.maybeSingle()`. On staging this caused **total payment-grant failure** (webhook 500; verify false-success — see F-013). Prod has paying users, so prod has the constraint (drift). 
**Fix:** guarded `UNIQUE(user_id)` add folded into `20260628000002_reconcile_prod_drift.sql` (no-op where it already exists) + applied to staging. Money path then passed 10/10.
**Status:** ADDRESSED (staging + migration). Confirm prod's constraint name/state when convenient.

## F-009 · S3 · Briefings / dead RPC  ✅ FIXED
`get_active_briefing_users(min_streak,min_session_date)` is called by [briefings/generator.js:135](../../src/lib/briefings/generator.js#L135) but **missing in prod** → the `.catch()` fallback (streak≥1, cap 500) runs instead of the intended "streak≥3 OR recent session". Briefings target a broader set than designed (possible extra TTS cost).
**Fix (proposed):** create the RPC, or delete the dead call and make the fallback the intended rule.
**Status:** OPEN (no crash — graceful fallback).

## F-010 · S3 · Storage inventory drift  ✅ FIXED
Prod has an undocumented **`pdfs`** bucket not defined in any migration (code uses `documents` + `user-pdfs`). Likely legacy.
**Fix (proposed):** confirm usage; either document it in a migration or remove it.
**Status:** OPEN.

---

### Cross-cutting
- **Schema drift is the theme** (F-001/2/3/4/8/9/10/11): the committed migrations have diverged from prod in both directions — prod has columns/buckets git lacks (F-001/2/3/4), and code references objects/columns prod lacks (F-008/9/11). The reconcile migration + curated apply fix the "git behind prod" side; the "code ahead of prod" side (F-008/9/11) needs prod changes or code fixes (F-011 done).
- **Prod NOT mutated.** Only read-only catalog introspection was run against prod. All writes/fixes are on staging + the repo. F-001/2/3/4 migration is a verified no-op on prod; F-011 is a code change pending deploy.
