CREATE TABLE IF NOT EXISTS payment_orders (
  order_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  cycle TEXT NOT NULL,
  amount INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family tier columns on user_plans
ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS family_role TEXT,
  ADD COLUMN IF NOT EXISTS family_primary_id UUID REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Cancellation reasons log
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly recaps
CREATE TABLE IF NOT EXISTS weekly_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_starting DATE NOT NULL,
  audio_url TEXT,
  image_url TEXT,
  transcript TEXT,
  key_stats JSONB,
  delivered_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_starting)
);
CREATE INDEX IF NOT EXISTS weekly_recaps_user_idx ON weekly_recaps (user_id, week_starting DESC);
ALTER TABLE weekly_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recaps_owner_read" ON weekly_recaps FOR SELECT USING (auth.uid() = user_id);
