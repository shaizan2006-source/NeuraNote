# Phase 2 — Regression Suite

Repeatable, automated coverage of the critical paths that unit tests can't reach
end-to-end. Built from the Phase 1/3 harnesses; runs against **staging only**.

## What it covers

| Harness | Critical path | Findings it guards |
| --- | --- | --- |
| `tests/staging/phase1-money.mjs` | create-order → verify → webhook, signature, idempotency, plan-binding | F-012, F-013, F-014 |
| `tests/staging/phase1-core.mjs` | trial expiry → free downgrade; mock-test scoring | F-005, scoring TV-7 |
| `tests/staging/phase1-fsrs.mjs` | FSRS interval correctness across ratings/lapses | F-015, TV-6 |
| `tests/staging/phase1-lighter.mjs` | streak math (IST), photo-doubt limits, brain-map/briefings | F-019, F-020 |
| `tests/staging/phase3-db.mjs` | double-submit idempotency, streak race, connection-pool burst | F-017, concurrency |
| `tests/e2e/phase1-auth-routing.spec.js` | logged-out redirects, `/ask-ai`→`/sage`, mobile + desktop | F-018, routing |

Unit/lint/build regressions are already covered by **`.github/workflows/ci.yml`** on every
push/PR. This suite adds the integration layer on top.

## Run locally

```bash
# 1. Point at staging + load test secrets (never prod)
set -a; . ./.env.staging; set +a
export APP=http://localhost:3000          # or your staging URL

# 2. Ensure staging is seeded (6 personas)
ALLOW_SEED=1 node scripts/seed-staging.mjs

# 3. Run the whole suite (exits non-zero if any check fails)
npm run test:regression

# Individual harness:
node tests/staging/phase1-money.mjs
```

`run-regression.mjs` runs all five API harnesses in sequence, prints a summary table,
and exits non-zero if **any** check fails or a harness crashes — so it gates CI.

## Run in CI

`.github/workflows/qa-regression.yml` runs **nightly (01:30 UTC)** and on manual
**workflow_dispatch**. It re-seeds personas, runs `test:regression`, then the Playwright
auth/routing spec against the deployed staging URL. It is deliberately **not** on
`pull_request` (needs live staging + Razorpay-test secrets; must not block contributor PRs).

### Required GitHub Actions secrets

```
STAGING_APP_URL                      # https://<staging>.vercel.app
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
STAGING_SUPABASE_SERVICE_ROLE_KEY
STAGING_RAZORPAY_KEY_ID              # rzp_test_…
STAGING_RAZORPAY_KEY_SECRET
STAGING_RAZORPAY_WEBHOOK_SECRET
```

## Adding a new regression

1. Add assertions to the matching harness using its `ok(name, condition, detail)` helper
   (keeps the `=== N pass, M fail ===` summary the runner parses).
2. If it's a brand-new path, add a harness under `tests/staging/` and append it to the
   `HARNESSES` array in `scripts/run-regression.mjs`.
3. Every regression must trace to a finding ID or a TV (test-vector) number.
