-- Add RLS to the 18 core tables created in baseline_schema that were missing it.
-- All tables follow the same pattern: user_id references auth.users(id).
-- profiles uses id = auth.uid() directly.

-- ── profiles ──────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_owner_all" ON profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── documents ─────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_owner_all" ON documents
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── document_chunks (no direct user_id — access via parent document) ─
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_chunks_owner_read" ON document_chunks
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id AND d.user_id = auth.uid()
    )
  );

-- ── daily_progress ─────────────────────────────────────────────
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_progress_owner_all" ON daily_progress
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── study_streaks ──────────────────────────────────────────────
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_streaks_owner_all" ON study_streaks
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── exams ─────────────────────────────────────────────────────
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams_owner_all" ON exams
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── focus_progress ─────────────────────────────────────────────
ALTER TABLE focus_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "focus_progress_owner_all" ON focus_progress
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── chat_messages ──────────────────────────────────────────────
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_owner_all" ON chat_messages
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── user_memory ────────────────────────────────────────────────
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_memory_owner_all" ON user_memory
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── revision_topics ────────────────────────────────────────────
ALTER TABLE revision_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revision_topics_owner_all" ON revision_topics
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── syllabus_topics ────────────────────────────────────────────
ALTER TABLE syllabus_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "syllabus_topics_owner_all" ON syllabus_topics
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── pdfs_metadata ──────────────────────────────────────────────
ALTER TABLE pdfs_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdfs_metadata_owner_all" ON pdfs_metadata
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── pdfs ───────────────────────────────────────────────────────
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdfs_owner_all" ON pdfs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── quizzes ────────────────────────────────────────────────────
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_owner_all" ON quizzes
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── user_plans ─────────────────────────────────────────────────
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_plans_owner_all" ON user_plans
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── qa_usage ───────────────────────────────────────────────────
ALTER TABLE qa_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_usage_owner_all" ON qa_usage
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── conversations ──────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_owner_all" ON conversations
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── messages (access via parent conversation) ──────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_owner_all" ON messages
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );
