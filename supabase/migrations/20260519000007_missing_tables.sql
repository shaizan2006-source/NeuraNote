-- Tables that existed only in orphaned SQL files outside migrations/.
-- concept_nodes, user_activity, voice_calls, qa_cache, answer_feedback
-- + handle_new_user trigger (auto-creates profile rows on auth signup)

-- ── concept_nodes: brain-map UI nodes (different from concepts table) ────────
-- Used by /api/brain-map and /api/brain-map/snapshot
CREATE TABLE IF NOT EXISTS concept_nodes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doc_id       UUID REFERENCES documents(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  type         TEXT DEFAULT 'concept',
  subject      TEXT,
  mastery_score REAL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 1),
  x            REAL,
  y            REAL,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS concept_nodes_user_idx   ON concept_nodes (user_id);
CREATE INDEX IF NOT EXISTS concept_nodes_doc_idx    ON concept_nodes (doc_id);
CREATE INDEX IF NOT EXISTS concept_nodes_subject_idx ON concept_nodes (user_id, subject);

ALTER TABLE concept_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concept_nodes_owner_all" ON concept_nodes
  FOR ALL USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- ── user_activity: last-active tracking ──────────────────────────────────────
-- Used by /api/activity and /api/daily-plan
CREATE TABLE IF NOT EXISTS user_activity (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_activity_owner_all" ON user_activity
  FOR ALL USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- ── voice_calls: voice session tracking ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_calls (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_seconds INT,
  messages_count   INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_calls_user_day_idx ON voice_calls (user_id, started_at DESC);

ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice_calls_owner_read" ON voice_calls
  FOR SELECT USING (user_id::text = auth.uid()::text);

-- ── qa_cache: cached AI answers to avoid repeat OpenAI calls ─────────────────
CREATE TABLE IF NOT EXISTS qa_cache (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key  TEXT UNIQUE NOT NULL,
  response   TEXT NOT NULL,
  model      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count  INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS qa_cache_key_idx ON qa_cache (cache_key);

-- Service role only — no user RLS needed
ALTER TABLE qa_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_cache_service_only" ON qa_cache
  FOR ALL USING (auth.role() = 'service_role');

-- ── answer_feedback: user thumbs up/down on AI answers ───────────────────────
CREATE TABLE IF NOT EXISTS answer_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT,
  rating      SMALLINT CHECK (rating IN (1, -1)),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS answer_feedback_user_idx ON answer_feedback (user_id, created_at DESC);

ALTER TABLE answer_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answer_feedback_owner_all" ON answer_feedback
  FOR ALL USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- ── handle_new_user trigger: auto-create profile on signup ───────────────────
-- Without this, profiles only get created in onboarding (deferred).
-- With this, the row is available immediately after auth.users insert.
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
