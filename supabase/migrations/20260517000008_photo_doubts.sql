CREATE TABLE IF NOT EXISTS photo_doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  recognized_text TEXT,
  subject_detected TEXT,
  topic_detected TEXT,
  difficulty_estimate TEXT,
  image_clarity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delete_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS photo_doubts_user_idx ON photo_doubts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS photo_doubts_delete_idx ON photo_doubts (delete_after);

ALTER TABLE photo_doubts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_doubts_owner_all" ON photo_doubts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
