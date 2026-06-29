-- ────────────────────────────────────────────────────────────────────────────
-- Migration: AI Spend Tracking
-- Date: 2026-05-27
-- Purpose: Per-user daily AI cost accumulator used by the monthly budget
--          circuit breaker. Prevents a single abusive Pro user from costing
--          ₹11k/mo in OpenAI spend against a ₹399/mo subscription.
-- ────────────────────────────────────────────────────────────────────────────

-- Daily spend rows — one row per (user_id, date). UPSERT'd after each AI call.
CREATE TABLE IF NOT EXISTS user_ai_spend_daily (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date        NOT NULL DEFAULT CURRENT_DATE,
  tokens_in    integer     NOT NULL DEFAULT 0,   -- prompt tokens consumed
  tokens_out   integer     NOT NULL DEFAULT 0,   -- completion tokens produced
  tts_chars    integer     NOT NULL DEFAULT 0,   -- TTS input characters
  whisper_secs numeric     NOT NULL DEFAULT 0,   -- Whisper audio seconds
  cost_usd     numeric(10,6) NOT NULL DEFAULT 0, -- total cost in USD (6 dp)
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Fast monthly-sum query: WHERE user_id = ? AND date >= first_of_month
CREATE INDEX IF NOT EXISTS user_ai_spend_daily_uid_date
  ON user_ai_spend_daily (user_id, date);

-- Helpful view: rolling 30-day spend per user (for admin dashboard, Phase 5)
CREATE OR REPLACE VIEW user_ai_spend_monthly AS
SELECT
  user_id,
  date_trunc('month', date)::date AS month,
  SUM(tokens_in)    AS tokens_in,
  SUM(tokens_out)   AS tokens_out,
  SUM(tts_chars)    AS tts_chars,
  SUM(whisper_secs) AS whisper_secs,
  SUM(cost_usd)     AS cost_usd
FROM user_ai_spend_daily
GROUP BY user_id, date_trunc('month', date);

-- Enable RLS: service role can read/write; users can read their own rows.
ALTER TABLE user_ai_spend_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spend"
  ON user_ai_spend_daily FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (used server-side for all writes and admin reads).

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: atomic upsert for daily spend (avoids race conditions between
--      concurrent AI calls by the same user)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_ai_spend_daily(
  p_user_id      uuid,
  p_date         date,
  p_cost_usd     numeric,
  p_tokens_in    integer,
  p_tokens_out   integer,
  p_tts_chars    integer,
  p_whisper_secs numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as the function owner (postgres), bypasses RLS
AS $$
BEGIN
  INSERT INTO user_ai_spend_daily
    (user_id, date, cost_usd, tokens_in, tokens_out, tts_chars, whisper_secs, updated_at)
  VALUES
    (p_user_id, p_date, p_cost_usd, p_tokens_in, p_tokens_out, p_tts_chars, p_whisper_secs, now())
  ON CONFLICT (user_id, date) DO UPDATE SET
    cost_usd     = user_ai_spend_daily.cost_usd     + EXCLUDED.cost_usd,
    tokens_in    = user_ai_spend_daily.tokens_in    + EXCLUDED.tokens_in,
    tokens_out   = user_ai_spend_daily.tokens_out   + EXCLUDED.tokens_out,
    tts_chars    = user_ai_spend_daily.tts_chars    + EXCLUDED.tts_chars,
    whisper_secs = user_ai_spend_daily.whisper_secs + EXCLUDED.whisper_secs,
    updated_at   = now();
END;
$$;
