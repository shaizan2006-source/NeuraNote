-- Consolidate onboarding/exam/theme data onto public.profiles.
-- The app split between `profiles` (exists; written by /api/onboarding/complete)
-- and a never-created `user_profiles` (read by ThemeContext, exam transitions,
-- brain-map snapshot). profiles is the canonical table (PK id -> auth.users,
-- RLS, signup trigger), so add the columns it was missing and point all readers
-- at profiles. Idempotent + additive (all nullable / defaulted) — safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exam_type                       TEXT,
  ADD COLUMN IF NOT EXISTS exam_year                       INTEGER,
  ADD COLUMN IF NOT EXISTS exam_date                       DATE,
  ADD COLUMN IF NOT EXISTS class_level                     TEXT,
  ADD COLUMN IF NOT EXISTS study_window                    TEXT,
  ADD COLUMN IF NOT EXISTS region                          TEXT,
  ADD COLUMN IF NOT EXISTS city                            TEXT,
  ADD COLUMN IF NOT EXISTS cohort_id                       TEXT,
  ADD COLUMN IF NOT EXISTS phone_number                    TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone_number             TEXT,
  ADD COLUMN IF NOT EXISTS is_repeat_aspirant              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exam_proximity_months_at_signup INTEGER,
  ADD COLUMN IF NOT EXISTS theme_preference                TEXT DEFAULT 'gradient';

-- theme_preference: constrain to the three supported themes (guarded so re-runs
-- don't error on an already-present constraint).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_theme_preference_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_theme_preference_check
      CHECK (theme_preference IN ('gradient', 'dark', 'light'));
  END IF;
END $$;
