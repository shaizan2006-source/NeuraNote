CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL,
  audio_url TEXT,
  transcript TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  listened_at TIMESTAMPTZ,
  duration_seconds INT,
  generation_cost_usd DECIMAL(10, 6),
  UNIQUE (user_id, briefing_date)
);
CREATE INDEX IF NOT EXISTS daily_briefings_user_date_idx ON daily_briefings (user_id, briefing_date DESC);

ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefings_owner_read" ON daily_briefings
  FOR SELECT USING (auth.uid() = user_id);
