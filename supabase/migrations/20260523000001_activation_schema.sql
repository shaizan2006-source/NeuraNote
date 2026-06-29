-- Phase 1: Growth Sprint — Activation + WhatsApp Infrastructure
-- Apply with: supabase db push

-- ─────────────────────────────────────────────────────────────
-- 1. Extend profiles for WhatsApp + activation tracking
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number            TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_phone_number     TEXT,
  ADD COLUMN IF NOT EXISTS is_repeat_aspirant      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exam_proximity_months_at_signup INT,
  ADD COLUMN IF NOT EXISTS preferred_language      TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'hi', 'hinglish'));

-- ─────────────────────────────────────────────────────────────
-- 2. Extend user_plans for trial tracking
--    (is_trial + trial_started_at needed by Phase 2 segmentation)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS is_trial         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- Backfill: rows that already have trial_ends_at are trials.
-- Use trial_ends_at - 7 days as proxy for trial_started_at.
UPDATE public.user_plans
SET
  is_trial         = true,
  trial_started_at = trial_ends_at - INTERVAL '7 days'
WHERE trial_ends_at IS NOT NULL
  AND is_trial = false;

-- ─────────────────────────────────────────────────────────────
-- 3. Trial segmentation (Day 3 activation signals)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trial_segments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_started_at      TIMESTAMPTZ NOT NULL,
  trial_ends_at         TIMESTAMPTZ NOT NULL,
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  segment               TEXT NOT NULL CHECK (segment IN ('high_intent', 'low_intent', 'dead', 'unevaluated')),
  signals               JSONB NOT NULL DEFAULT '{}'::jsonb,
  intervention_triggered TEXT CHECK (intervention_triggered IN (
    'high_intent_reinforce', 'low_intent_recover', 'dead_revive', 'failed_whatsapp', NULL
  )),
  intervention_sent_at  TIMESTAMPTZ,
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS trial_segments_segment_idx ON public.trial_segments (segment);
CREATE INDEX IF NOT EXISTS trial_segments_user_idx    ON public.trial_segments (user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. WhatsApp message log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number        TEXT NOT NULL,
  template_name       TEXT NOT NULL,
  template_variables  JSONB,
  idempotency_key     TEXT NOT NULL UNIQUE,
  provider_message_id TEXT,
  status              TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'replied', 'failed')),
  status_updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_response   JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_messages_user_idx        ON public.whatsapp_messages (user_id);
CREATE INDEX IF NOT EXISTS wa_messages_idempotency_idx ON public.whatsapp_messages (idempotency_key);
CREATE INDEX IF NOT EXISTS wa_messages_status_idx      ON public.whatsapp_messages (status);

-- ─────────────────────────────────────────────────────────────
-- 5. Growth telemetry events
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.growth_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name  TEXT NOT NULL,
  properties  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS growth_events_user_idx    ON public.growth_events (user_id);
CREATE INDEX IF NOT EXISTS growth_events_name_idx    ON public.growth_events (event_name);
CREATE INDEX IF NOT EXISTS growth_events_created_idx ON public.growth_events (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 6. Row-Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.trial_segments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_events    ENABLE ROW LEVEL SECURITY;

-- Users can read their own data; service role bypasses for crons
CREATE POLICY "users_read_own_segment"
  ON public.trial_segments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_wa_messages"
  ON public.whatsapp_messages FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_events"
  ON public.growth_events FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 7. Anonymise helper extension: null new PII columns on delete
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.anonymise_profile(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name                        = '[deleted user]',
    display_name                     = '[deleted]',
    phone                            = NULL,
    phone_number                     = NULL,
    parent_phone_number              = NULL,
    region                           = NULL,
    city                             = NULL,
    timezone                         = NULL,
    exam_date                        = NULL,
    cohort_id                        = NULL,
    whatsapp_opt_in                  = false,
    scheduled_deletion_at            = NULL,
    deleted_at                       = now(),
    updated_at                       = now()
  WHERE id = p_user_id;

  UPDATE public.user_plans
  SET billing_email = NULL, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;
