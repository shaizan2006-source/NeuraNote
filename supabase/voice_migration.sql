-- ============================================================
-- Voice Calls Tracking Table
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_calls (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at       timestamptz DEFAULT now() NOT NULL,
  ended_at         timestamptz,
  duration_seconds int,
  messages_count   int         DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

-- Index for fast daily call counting per user
CREATE INDEX IF NOT EXISTS voice_calls_user_day_idx
  ON voice_calls (user_id, started_at DESC);

-- Row Level Security
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;

-- Users can read only their own call logs
CREATE POLICY "Users can view own call logs"
  ON voice_calls FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (used by backend routes)
CREATE POLICY "Service role full access on voice_calls"
  ON voice_calls FOR ALL
  USING (auth.role() = 'service_role');
