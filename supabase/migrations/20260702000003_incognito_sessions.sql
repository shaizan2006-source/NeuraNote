-- Ephemeral chat sessions: survive refresh, live max 7 days, fully walled
-- off from conversations / qa_cache / weak-topics / any personalization.
-- One row per session; messages are an append-only jsonb array so the
-- hourly purge is a single-row delete (no cascades).

CREATE TABLE IF NOT EXISTS incognito_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  closed_at TIMESTAMPTZ,
  messages JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_incognito_sessions_user ON incognito_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_incognito_sessions_expires ON incognito_sessions(expires_at);

ALTER TABLE incognito_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incognito own select" ON incognito_sessions;
CREATE POLICY "incognito own select" ON incognito_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "incognito own insert" ON incognito_sessions;
CREATE POLICY "incognito own insert" ON incognito_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "incognito own update" ON incognito_sessions;
CREATE POLICY "incognito own update" ON incognito_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- deletes: service role only (hourly purge cron)
