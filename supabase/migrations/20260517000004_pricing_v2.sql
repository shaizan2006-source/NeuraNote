-- Pricing v2 schema: new tier columns + coaching institute table

ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS family_member_ids UUID[] DEFAULT '{}';

-- Accept new plan values (if plan is TEXT column, no migration needed)
-- If plan is an enum, uncomment:
-- ALTER TYPE user_plan_enum ADD VALUE IF NOT EXISTS 'student';
-- ALTER TYPE user_plan_enum ADD VALUE IF NOT EXISTS 'family';

CREATE TABLE IF NOT EXISTS coaching_institute_pilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  student_count INT,
  status TEXT DEFAULT 'inquiry',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cohorts tables for peer percentile + onboarding
CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  exam_type TEXT,
  exam_year INT,
  region TEXT,
  class_level TEXT,
  member_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cohort_id, user_id)
);

-- pg_cron: daily trial expiration (run once after migrations)
-- SELECT cron.schedule('trial-expiration-check', '0 1 * * *', $$
--   UPDATE user_plans SET plan = 'free', updated_at = NOW()
--   WHERE plan = 'pro' AND trial_ends_at < NOW() AND payment_id IS NULL;
-- $$);
