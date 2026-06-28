-- 20260628000002_reconcile_prod_drift.sql
--
-- Reconciles the committed migrations with the PRODUCTION schema. The objects
-- below exist in prod but were absent from git, so a from-git rebuild diverged
-- and broke (e.g. /api/cards/due 500'd because cards.metadata was missing).
-- Confirmed present in prod via read-only schema introspection on 2026-06-28.
--
-- Every statement is IF NOT EXISTS / ON CONFLICT → a safe no-op on production,
-- and makes a fresh `build-staging-schema.mjs` rebuild match prod. Fixes findings
-- F-001 (expires_at/order_id), F-002 (conversations.messages), F-003 (documents
-- bucket), F-004 (cards.metadata).
--
-- NOT included on purpose — these are referenced by code but ALSO absent in prod
-- (real product gaps, tracked as findings; adding them is a prod decision):
--   • recaps storage bucket            (F-008)  weekly-recap media writes
--   • get_active_briefing_users() RPC  (F-009)  briefing targeting (cron falls back)
--   • profiles.display_name/phone/timezone, user_plans.billing_email (F-011)
--                                       used by anonymise_profile() — deletion/GDPR

ALTER TABLE public.user_plans    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.user_plans    ADD COLUMN IF NOT EXISTS order_id   TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS messages   JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.cards         ADD COLUMN IF NOT EXISTS metadata   JSONB;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- F-006: user_plans / study_streaks have no UNIQUE(user_id) in git, yet the app
-- upserts onConflict:user_id (payments, streaks). Prod must have it (payments work);
-- without it, payment grants fail (webhook 500; verify silently no-ops). Guarded so
-- this is a no-op where a unique constraint on the table already exists.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.user_plans'::regclass AND contype='u') THEN
    ALTER TABLE public.user_plans ADD CONSTRAINT user_plans_user_id_key UNIQUE (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.study_streaks'::regclass AND contype='u') THEN
    ALTER TABLE public.study_streaks ADD CONSTRAINT study_streaks_user_id_key UNIQUE (user_id);
  END IF;
END $$;
