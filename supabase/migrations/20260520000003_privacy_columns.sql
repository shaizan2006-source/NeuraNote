-- Privacy & GDPR columns added for Phase 13 hardening

-- profiles: track export timestamps for rate limiting + deletion state
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS last_export_at  timestamptz;

COMMENT ON COLUMN public.profiles.deleted_at IS
  'Set by anonymizeUser() when account is permanently deleted. Row kept for payment audit trail.';

COMMENT ON COLUMN public.profiles.last_export_at IS
  'Timestamp of last data export. Used to enforce 24h rate limit on /api/user/export.';

-- Partial index for the purge cron:
-- SELECT * FROM profiles WHERE scheduled_deletion_at <= now() AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS profiles_pending_deletion_idx
  ON public.profiles (scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL AND deleted_at IS NULL;

-- ── Anonymise SQL helper (callable from Supabase SQL editor for manual ops) ──
-- Mirrors the JS anonymizeUser() for emergency/admin use.
CREATE OR REPLACE FUNCTION public.anonymise_profile(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name             = '[deleted user]',
    display_name          = '[deleted]',
    phone                 = NULL,
    region                = NULL,
    city                  = NULL,
    timezone              = NULL,
    exam_date             = NULL,
    cohort_id             = NULL,
    scheduled_deletion_at = NULL,
    deleted_at            = now(),
    updated_at            = now()
  WHERE id = p_user_id;

  -- Retain payment records but null PII linkage
  UPDATE public.user_plans
  SET billing_email = NULL, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.anonymise_profile IS
  'Emergency manual anonymisation. Use anonymizeUser() JS helper for automated deletion.';
