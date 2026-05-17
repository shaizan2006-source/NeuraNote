-- Push notification infrastructure

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE (user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS push_subs_user_idx ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_enabled BOOLEAN DEFAULT TRUE,
  briefing_time INT DEFAULT 420,
  midday_enabled BOOLEAN DEFAULT TRUE,
  midday_time INT DEFAULT 780,
  focus_anchor_enabled BOOLEAN DEFAULT TRUE,
  focus_anchor_time INT DEFAULT 1080,
  night_closure_enabled BOOLEAN DEFAULT TRUE,
  night_closure_time INT DEFAULT 1260,
  cohort_updates_enabled BOOLEAN DEFAULT TRUE,
  care_nudges_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN,
  clicked_at TIMESTAMPTZ,
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS notification_log_user_sent_idx ON notification_log (user_id, sent_at DESC);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_owner_all" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_prefs_owner_all" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_log_owner_read" ON notification_log
  FOR SELECT USING (auth.uid() = user_id);

-- Auto-create default prefs on signup
CREATE OR REPLACE FUNCTION create_default_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_signup_create_notif_prefs ON auth.users;
CREATE TRIGGER on_user_signup_create_notif_prefs
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION create_default_notification_prefs();
