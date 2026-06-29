# Release Hygiene & DR Runbook (F-007)

The QA engagement found the repo **not cleanly deployable**: `main` was stale, ~180
fixes lived only in an uncommitted working tree, the prod schema was **not reproducible
from git** (applied ad-hoc via the Supabase SQL editor), and a second abandoned remote
(`ask-my-notes-main`) created ambiguity about what actually ships. This is the standing
process to keep prod recoverable.

## 1. Schema is code (the DR-critical part)

- **Every** prod schema change ships as a committed migration in `supabase/migrations/`.
  No more SQL-editor-only changes — if it isn't in git, it doesn't survive a rebuild.
- The migrations added during QA are committed on this branch:
  - `20260628000002_reconcile_prod_drift.sql`
  - `20260628000003_fsrs_learning_steps.sql`
  - `20260629000001_enable_rls_open_tables.sql`
  - `20260629000002_phase3_fixes.sql`
- **DR check (quarterly):** rebuild staging from migrations only
  (`node scripts/build-staging-schema.mjs` → apply) and diff against prod. Any drift is a bug.

## 2. One canonical remote

- `origin` is the single source of truth. Remove the abandoned `ask-my-notes-main` remote:
  `git remote remove ask-my-notes-main`.

## 3. Branch → PR → deploy flow

1. Branch off `origin/main` (never commit straight to `main`).
2. Keep the working tree clean — commit or stash WIP before starting release work.
   (Large uncommitted WIP is how the "fixes ride the working tree" problem happened.)
3. Open a PR → CI (`ci.yml`: lint + unit + build) must be green.
4. For risky changes, run **QA Regression** (`qa-regression.yml`, manual dispatch) against
   staging before merge.
5. Merge to `main` → Vercel auto-deploys. Migrations applied to prod **before** the deploy
   that depends on them.

## 4. Secrets

- All secrets (OpenAI, Razorpay live + webhook, Supabase service-role, AiSensy) live in
  Vercel/GitHub env settings — never committed. `.env*` is gitignored; `.env.staging`
  holds **test-mode** keys only.
- Rotate immediately if a secret is ever printed to a log or shell output.

## 5. Pre-push checklist

- [ ] Working tree clean (no stray WIP riding the release).
- [ ] Schema changes are committed migrations, applied to prod.
- [ ] `npm run build` clean; `ci.yml` green.
- [ ] Money/scoring/FSRS touched? → `qa-regression.yml` green against staging.
- [ ] Single `origin` remote.
