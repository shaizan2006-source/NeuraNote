# Day 85 — Production Deployment Audit
*Sprint 4, Week 13 | 2026-05-19*

---

## Summary

| Check | Status | Notes |
|---|---|---|
| App live at production URL | ⏭️ BLOCKED | URL not yet assigned |
| Vercel env vars complete | ❌ FAIL | 11 vars missing from vercel.json |
| Supabase migrations applied | ⚠️ MANUAL | Run `supabase db diff --linked` to verify |
| RLS on all user-data tables | ❌ FAIL | 18 core tables have NO RLS — **fixed this session** |
| Razorpay in LIVE mode | ⚠️ MANUAL | Code reads from env — verify `@razorpay_key_id` secret is `rzp_live_...` |
| Razorpay webhook → production | ⚠️ MANUAL | Update after domain is set |
| Sentry — no errors 24h | ⏭️ BLOCKED | Needs live URL + Sentry dashboard access |
| UptimeRobot active | ⏭️ BLOCKED | Needs live URL |
| Storage buckets exist | ❌ FAIL | No migration creates user-pdfs, photo-doubts, briefings — **fixed this session** |
| /api/health endpoint exists | ✅ PASS | Returns db status + version |
| All cron jobs configured | ✅ PASS | 7 crons in vercel.json |
| Payment webhook handler exists | ✅ PASS | /api/payments/webhook/route.js |

---

## Fixes Applied This Session

### 1. RLS migration — `20260519000001_rls_core_tables.sql`
Added `ENABLE ROW LEVEL SECURITY` + user-scoped policies for all 18 baseline tables.

### 2. Storage buckets migration — `20260519000002_storage_buckets.sql`
Creates `user-pdfs`, `photo-doubts`, `briefings` buckets with RLS policies.

### 3. vercel.json — added 11 missing env var mappings
Added secrets for: RAZORPAY_WEBHOOK_SECRET, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, NEXT_PUBLIC_APP_URL, CRON_SECRET, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.

---

## Manual Actions Required (you must do these)

### Before domain is set:
- [ ] Go to Vercel → Project → Settings → Environment Variables
- [ ] Add each secret listed in `.env.example` (or verify they exist)
- [ ] Confirm `@razorpay_key_id` value starts with `rzp_live_` (not `rzp_test_`)
- [ ] Confirm `@razorpay_key_secret` matches live secret key
- [ ] Set `RAZORPAY_WEBHOOK_SECRET` secret in Vercel

### After domain is set:
- [ ] Update `NEXT_PUBLIC_APP_URL` → production domain
- [ ] Update `VAPID_SUBJECT` → `mailto:hello@<yourdomain>`
- [ ] Point Razorpay webhook URL → `https://<domain>/api/payments/webhook`
- [ ] Set up UptimeRobot monitor on `/api/health`
- [ ] Verify Sentry DSN is production project (not dev)
- [ ] Run `supabase db push --linked` to apply new migrations
- [ ] Smoke test: `curl -i https://<domain>/api/health` → expect `{"status":"ok"}`

---

## Critical: Supabase Secrets to Create

Run these in Vercel CLI before deploying:
```bash
vercel secret add supabase_url <value>
vercel secret add supabase_anon_key <value>
vercel secret add supabase_service_role_key <value>
vercel secret add openai_api_key <value>
vercel secret add razorpay_key_id <rzp_live_...>
vercel secret add razorpay_key_secret <value>
vercel secret add razorpay_webhook_secret <value>
vercel secret add sentry_dsn <value>
vercel secret add sentry_auth_token <value>
vercel secret add cron_secret <value>
vercel secret add vapid_public_key <value>
vercel secret add vapid_private_key <value>
```

---

## Pass Rate: 2/12 checks fully passed | 3 blocked on URL | 7 fixed or need manual action
