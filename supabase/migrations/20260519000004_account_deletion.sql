-- Supports 90-day grace period deletion flow
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS profiles_deletion_idx ON profiles(scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;
