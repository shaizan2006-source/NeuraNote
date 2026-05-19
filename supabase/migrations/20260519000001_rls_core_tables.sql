-- Add RLS to the 18 core tables created in baseline_schema that were missing it.
-- Cast both sides to text to handle databases where user_id is TEXT vs UUID.

-- ── profiles ──────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_owner_all" ON profiles
  USING (id::text = auth.uid()::text) WITH CHECK (id::text = auth.uid()::text);

-- ── documents ─────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_owner_all" ON documents
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── document_chunks (no direct user_id — access via parent document) ─
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_chunks_owner_read" ON document_chunks
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id AND d.user_id::text = auth.uid()::text
    )
  );

-- ── daily_progress ─────────────────────────────────────────────
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_progress_owner_all" ON daily_progress
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── study_streaks ──────────────────────────────────────────────
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_streaks_owner_all" ON study_streaks
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── exams ─────────────────────────────────────────────────────
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams_owner_all" ON exams
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── focus_progress ─────────────────────────────────────────────
ALTER TABLE focus_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "focus_progress_owner_all" ON focus_progress
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── chat_messages ──────────────────────────────────────────────
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_owner_all" ON chat_messages
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── user_memory ────────────────────────────────────────────────
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_memory_owner_all" ON user_memory
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── revision_topics ────────────────────────────────────────────
ALTER TABLE revision_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revision_topics_owner_all" ON revision_topics
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── syllabus_topics ────────────────────────────────────────────
ALTER TABLE syllabus_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "syllabus_topics_owner_all" ON syllabus_topics
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── pdfs_metadata ──────────────────────────────────────────────
ALTER TABLE pdfs_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdfs_metadata_owner_all" ON pdfs_metadata
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── pdfs ───────────────────────────────────────────────────────
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdfs_owner_all" ON pdfs
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── quizzes ────────────────────────────────────────────────────
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_owner_all" ON quizzes
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── user_plans ─────────────────────────────────────────────────
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_plans_owner_all" ON user_plans
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── qa_usage ───────────────────────────────────────────────────
ALTER TABLE qa_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_usage_owner_all" ON qa_usage
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── conversations ──────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_owner_all" ON conversations
  USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- ── messages (access via parent conversation) ──────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_owner_all" ON messages
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id::text = auth.uid()::text
    )
  );
