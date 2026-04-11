-- ── Run this once in Supabase SQL Editor ─────────────────────

-- 0. profiles: auto-created for every new user via trigger
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- Trigger: create profile row when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();



-- 1. user_plans: tracks subscription tier per user
CREATE TABLE IF NOT EXISTS user_plans (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan       TEXT NOT NULL DEFAULT 'free',     -- free | student | pro | school
  order_id   TEXT,
  payment_id TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plan"
  ON user_plans FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can upsert (used by verify API)
CREATE POLICY "Service role can upsert plans"
  ON user_plans FOR ALL
  USING (true)
  WITH CHECK (true);


-- 2. qa_usage: tracks Q&A requests per user per day (for free tier limit)
CREATE TABLE IF NOT EXISTS qa_usage (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE qa_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to qa_usage"
  ON qa_usage FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast daily count queries
CREATE INDEX IF NOT EXISTS idx_qa_usage_user_date
  ON qa_usage (user_id, created_at DESC);

-- Auto-purge rows older than 2 days (keeps table small)
-- Run as a scheduled Supabase Edge Function or pg_cron if available:
-- DELETE FROM qa_usage WHERE created_at < NOW() - INTERVAL '2 days';

-- ── Sprint 2: Answer Feedback ──────────────────────────────────
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS answer_feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_hash TEXT NOT NULL,
  domain        TEXT,
  marks         SMALLINT,
  rating        SMALLINT CHECK (rating IN (1, -1)),
  flag_type     TEXT CHECK (flag_type IN ('inaccurate','incomplete','wrong_format','confusing') OR flag_type IS NULL),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE answer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback"
  ON answer_feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_domain ON answer_feedback(domain);
CREATE INDEX IF NOT EXISTS idx_feedback_user   ON answer_feedback(user_id);

-- ── qa_cache: server-side answer cache (TTL 7 days) ───────────
CREATE TABLE IF NOT EXISTS qa_cache (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key      TEXT NOT NULL UNIQUE,
  question       TEXT NOT NULL,
  domain         TEXT,
  marks          SMALLINT,
  answer_mode    TEXT,
  answer         TEXT NOT NULL,
  classification JSONB,
  hit_count      INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS — accessed via service role key only (server-side)
CREATE INDEX IF NOT EXISTS idx_qa_cache_key        ON qa_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_qa_cache_created_at ON qa_cache(created_at);

-- Auto-purge rows older than 7 days (run as a cron job or pg_cron)
-- DELETE FROM qa_cache WHERE created_at < NOW() - INTERVAL '7 days';
