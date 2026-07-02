-- Doubt threads: one isolated thread per specific Q&A answer.
-- conversations.messages is jsonb (no per-message UUIDs), so the parent is
-- content-addressed: parent_key = sha256(question || answer) hex slice.
-- Isolation is enforced by which rows are fetched (thread_id scoping),
-- never by prompt instructions.

CREATE TABLE IF NOT EXISTS doubt_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  parent_key TEXT NOT NULL,             -- 32-char hex, content-addressed
  original_question TEXT NOT NULL,
  original_answer TEXT NOT NULL,
  suggested_doubts JSONB,               -- [{label, prompt}] generated once, cached forever
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, conversation_id, parent_key)
);
CREATE INDEX IF NOT EXISTS idx_doubt_threads_user ON doubt_threads(user_id);

CREATE TABLE IF NOT EXISTS doubt_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES doubt_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doubt_thread_messages_thread ON doubt_thread_messages(thread_id);

-- Non-destructive edits: the original row is never overwritten; the renderer
-- overlays the edit for its owner with an "edited by you" tag + revert.
CREATE TABLE IF NOT EXISTS doubt_answer_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('main_answer','doubt_message')),
  target_key TEXT NOT NULL,             -- main_answer: thread parent_key · doubt_message: message uuid
  edited_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, target_type, target_key)
);

ALTER TABLE doubt_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_answer_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doubt_threads own" ON doubt_threads;
CREATE POLICY "doubt_threads own" ON doubt_threads FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "doubt_messages own" ON doubt_thread_messages;
CREATE POLICY "doubt_messages own" ON doubt_thread_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM doubt_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM doubt_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

DROP POLICY IF EXISTS "doubt_edits own" ON doubt_answer_edits;
CREATE POLICY "doubt_edits own" ON doubt_answer_edits FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
