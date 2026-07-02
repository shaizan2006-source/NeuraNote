# Account Layer / Support / Incognito / Doubt Sidebar — ship notes (2026-07-02)

Built per the master build prompt, adapted to this codebase (see
`docs/superpowers/plans/2026-07-02-account-support-incognito-doubt.md`
for the locked adaptation decisions). All four phases on `deploy/launch-prep`.

## Manual ops before/at deploy

1. **Apply 4 new migrations** (in order) to prod Supabase:
   - `20260702000001_avatars_support_screenshots_buckets.sql`
   - `20260702000002_support_tickets_faq.sql`
   - `20260702000003_incognito_sessions.sql`
   - `20260702000004_doubt_threads.sql`
2. **Register cron** in Vercel dashboard: `/api/cron/purge-incognito`, schedule `0 * * * *` (hourly), same `CRON_SECRET` auth as existing crons.
3. **Env (optional kill switches):** `NEXT_PUBLIC_FEATURE_SUPPORT`, `NEXT_PUBLIC_FEATURE_INCOGNITO`, `NEXT_PUBLIC_FEATURE_DOUBT_SIDEBAR` — set to `0` to disable a feature (default on; changing them requires a redeploy since they're inlined into the client bundle).
4. **Avatar note:** existing avatars uploaded to the old `avatars/{uid}.{ext}` path (inside the bucket root) still resolve via their stored public URL; new uploads go to `{uid}/avatar.{ext}` where storage RLS applies.

## Verified locally (2026-07-02/03)

- `npm run build` clean; `node scripts/grep-gate.mjs` green; full unit suite green (support/incognito/doubt suites added to `test` + `test:unit`).
- Authed screenshots NOT captured — Supabase signup broken since 2026-06-27 (existing blocker).

## Adversarial items pending staging (no staging env — existing blocker)

- RLS cross-user probes: `incognito_sessions`, `doubt_threads`, `doubt_thread_messages`, `doubt_answer_edits`, `support_requests` SELECT policy (service-role routes already enforce ownership in app logic; RLS is the second wall).
- Incognito leak sweep with live data: after an incognito Q&A, confirm zero new rows in `conversations`, `qa_cache`, `weak_topics`, `topic_attempts`; confirm `incognito_sessions.messages` grew.
- Purge cron actually deletes (run `/api/cron/purge-incognito` with `CRON_SECRET` against staging; verify expired/closed rows are gone).
- Doubt isolation payload check: open doubts on two different answers; `[doubt] llm context` log lines must show each call scoped to its own thread id with the expected prior-message count.

## Email adaptation (decision, not a gap)

No outbound mail vendor is wired (Supabase SMTP handles auth mail only) and the
ground rules forbid adding a vendor. Ticket acknowledgement/notification emails
are replaced by: in-app submit confirmation, user-visible status list
(Settings → Support and `/support`), and the `/admin/tickets` triage view.
