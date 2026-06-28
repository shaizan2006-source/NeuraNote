# Staging Setup Runbook — Ask My Notes

**Purpose:** stand up an isolated staging environment that mirrors production, so QA Phases 1–4 can run **without ever touching prod or real customer data**. Produced in Phase 0.

> **Golden rule:** apply everything here to a **fresh, empty Supabase project** and **Razorpay test mode** only. Never point these scripts at production.

---

## 0. What's in this kit

| Artifact | What it does | Runs now without creds? |
|---|---|---|
| `scripts/build-staging-schema.mjs` | Concatenates the curated, ordered migrations + patches into `supabase/staging/_apply_all.sql` | **Yes** (filesystem only) |
| `supabase/staging/_apply_all.sql` | The single SQL file to apply to a fresh project (generated) | n/a |
| `supabase/staging/_manual_patches.sql` | Objects the app uses that exist only in prod, not git (see §4) | n/a |
| `scripts/seed-staging.mjs` | Seeds 6 personas + per-exam content into staging | No — needs staging creds |
| `tests/e2e/baseline-capture.spec.js` | Captures happy-path baseline (screenshots + API JSON) | No — needs running app |

---

## 1. Why a from-git rebuild is NOT turn-key (release findings)

Reconstructing the schema surfaced **real drift between the repo and prod** — log these as Phase 0 observations (they describe repo state; prod presumably has the objects via out-of-band changes, which is itself the risk):

1. **`conversations.messages` missing from migrations.** `src/app/api/conversations/[id]/route.js:13` selects `messages`, but `20260517000001_baseline_schema.sql` creates `conversations` without it. The column only exists in the **un-applied** root `supabase/quickchat_migration.sql`. → patched in `_manual_patches.sql`.
2. **`documents` and `recaps` storage buckets missing from migrations.** Code uses `storage.from("documents")` and `storage.from("recaps")`, but only `user-pdfs`/`briefings`/`photo-doubts` are defined. → patched.
3. **`get_active_briefing_users(min_streak, min_session_date)` not in repo.** Called by the briefing generator (`.catch()`-wrapped, falls back to streak≥1). → reconstructed in `_manual_patches.sql` (best-effort; verify vs prod).
4. **`anonymise_profile()` references columns that no migration creates** (`profiles.display_name/phone/timezone`, `user_plans.billing_email`). The function is created fine but **fails at call time** (account-deletion / purge cron). → columns added in `_manual_patches.sql`.
5. **A dead migration:** `20260504120000_add_theme_preference.sql` ALTERs `user_profiles`, a table that is never created → it would **ERROR**. Excluded (theme lives on `profiles` via `20260628000001`).
6. **Conflicting/duplicate root files** (`migrations.sql`, `voice_migration.sql`, `quickchat_migration.sql`, `concept_graph_migration.sql`) define tables with **different shapes** than the canonical migrations. Excluded (see §3).

> These mean: **the production schema cannot be reproduced from `git` alone today** — a disaster-recovery / new-environment risk worth fixing by committing the prod-only objects (this kit's `_manual_patches.sql` is the concrete fix to fold back into migrations once verified).

---

## 2. Provision the staging Supabase project (you do this)

1. Create a new Supabase project named **`ask-my-notes-staging`** (separate from prod). Choose the same region as prod.
2. Note its **Project URL**, **anon key**, **service_role key** (Project Settings → API).
3. Confirm the `vector` (pgvector) extension is available (the baseline migration runs `CREATE EXTENSION vector`).

---

## 3. Apply the schema (ordered)

### Generate the single SQL file
```bash
node scripts/build-staging-schema.mjs
# → writes supabase/staging/_apply_all.sql (36 files, 0 missing)
```

### Apply it
- **Option A (SQL editor):** open `supabase/staging/_apply_all.sql`, paste into the staging project's SQL editor, run. (It's idempotent — safe to re-run.)
- **Option B (CLI/psql):** `psql "<staging connection string>" -f supabase/staging/_apply_all.sql`

### Ordered apply list (encoded in `build-staging-schema.mjs` — source of truth)
Pre-baseline tables the baseline lacks → baseline + RPCs → timestamped feature migrations (chronological) → realtime wiring → `focus_progress.document_name` → profiles consolidation → **manual patches** → non-fatal signup triggers (last).

### Excluded files (and why)
| File | Reason |
|---|---|
| `supabase/migrations.sql` | superseded by baseline + missing_tables; conflicting table shapes (`user_plans` PK, `qa_usage`, `qa_cache`, `answer_feedback`) |
| `supabase/voice_migration.sql` | duplicate of `voice_calls` in `20260519000007_missing_tables.sql` |
| `supabase/quickchat_migration.sql` | conflicts with baseline `conversations`; its `messages` col is re-added via `_manual_patches.sql` |
| `supabase/concept_graph_migration.sql` | superseded by `20260519000006_concept_graph.sql` (the `::text` RLS policies prod uses) |
| `supabase/migrations/20260504120000_add_theme_preference.sql` | ALTERs non-existent `user_profiles` → would ERROR |
| `supabase/migrations/20260429_add_subject_to_exams.sql` | superseded: `exams.subject` already in baseline |
| `supabase/migrations/add_active_time_to_focus_progress.sql` | superseded: `focus_progress.active_time_seconds` already in baseline |

### Verify after apply
- `select count(*) from information_schema.tables where table_schema='public';` → expect ~55.
- `select tablename, rowsecurity from pg_tables where schemaname='public' and rowsecurity=false;`
  → expect only: `payment_orders`, `family_invites`, `cancellation_reasons`, `coaching_institute_pilots`, `decompression_triggers`, `waitlist_emails`. **Anything else with RLS off is a Phase 3 finding.**
- `select id from storage.buckets;` → expect `user-pdfs, briefings, photo-doubts, documents, recaps`.

---

## 4. Manual patches (`_manual_patches.sql`)

Applied automatically as part of `_apply_all.sql`. Recreates the 4 prod-only object groups from §1 (conversations.messages, documents/recaps buckets, get_active_briefing_users, anonymise_profile columns). Each is idempotent and documented inline. **Verify each against prod** before treating staging as a faithful mirror.

---

## 5. Wire the app to staging (you provide test-mode creds)

Create `.env.staging.local` (git-ignored) — **never reuse prod secrets**:

| Var | Value for staging |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | staging project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service_role key |
| `OPENAI_API_KEY` | a **dedicated low-budget** key |
| `AI_BUDGET_FREE_USD` / `_STUDENT_USD` / `_PRO_USD` | tiny (e.g. `0.05`) to cap spend |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` | **`rzp_test_…`** test-mode keys |
| `RAZORPAY_WEBHOOK_SECRET` | test webhook secret (point webhook at the staging URL) |
| `WHATSAPP_*` | leave unset / use a dry-run stub — **no real sends in staging** |
| `CRON_SECRET` | any staging value |
| `ADMIN_EMAILS` | include a staging admin you control |

Run locally against staging: `next dev` with the staging env loaded, **or** deploy a Vercel preview with staging env vars.

---

## 6. Seed test data

```bash
STAGING_SUPABASE_URL=https://<ref>.supabase.co \
STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging service_role> \
ALLOW_SEED=1 node scripts/seed-staging.mjs
```
Safety: the script refuses to run unless both `STAGING_*` vars are set and `ALLOW_SEED=1`, and **refuses if the staging URL equals the app's prod URL**. All writes are scoped to `@staging.askmynotes.test` users and `seed-` PYQ slugs.

**Personas** (password `StagingPass!23`): `free` (JEE), `trial` (NEET, active), `student` ₹199 (UPSC), `pro` ₹399 (GATE), `family` ₹4,499/yr (CA), `expired` (raw lapsed trial — see TV-13). Each gets a profile+cohort, streak, today's progress, a document, 3 due FSRS cards; paid personas also get a completed mock test. Plus 5 global sample PYQs (one per exam). The `free` persona is pre-loaded with 18/20 daily Q&A to exercise the paywall.

---

## 7. Capture the baseline

App must be running against staging and seeded.
```bash
# mobile-first (Pixel 5) — the product's primary surface
npx playwright test tests/e2e/baseline-capture.spec.js --project=mobile-chrome
# desktop too
npx playwright test tests/e2e/baseline-capture.spec.js --project=chromium
```
Output: `tests/baseline/<project>/<persona>/{<route>.png, api.json}`. These are the reference artifacts Phase 1+ regressions are compared against. Commit them once reviewed.

---

## 8. Definition of done for staging

- [ ] `_apply_all.sql` applied to a fresh staging project with no errors.
- [ ] RLS-off table list matches the 6 expected (§3 verify).
- [ ] All 5 storage buckets present.
- [ ] `seed-staging.mjs` ran; 6 personas + PYQs exist.
- [ ] App boots against staging; login works for each persona.
- [ ] Baseline screenshots + API JSON captured for both projects.
- [ ] Razorpay confirmed **test mode**; OpenAI budget caps tiny; WhatsApp not sending.

Only when this checklist is green is it safe to begin **Phase 1**.
