-- Adds last_evaluated_date to study_streaks so the nightly cron can detect
-- double-fire (Vercel can invoke a cron more than once on network retry).
-- The column records the IST date on which the streak was last evaluated,
-- letting the cron skip users it already processed in the same IST day.

ALTER TABLE study_streaks
  ADD COLUMN IF NOT EXISTS last_evaluated_date date;

COMMENT ON COLUMN study_streaks.last_evaluated_date IS
  'IST calendar date on which evaluate-streaks last ran for this user. Used for cron idempotency.';

-- Index used by the cron''s idempotency pre-check:
-- SELECT COUNT(*) FROM study_streaks WHERE last_evaluated_date = $1
CREATE INDEX IF NOT EXISTS idx_study_streaks_last_eval
  ON study_streaks (last_evaluated_date);
