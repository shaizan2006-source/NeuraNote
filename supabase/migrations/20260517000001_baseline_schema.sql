-- Safe baseline migration.
-- Every CREATE TABLE has only (id, created_at).
-- Every other column is added via ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- Every index is created AFTER all columns are added.
-- Safe on both fresh and existing production databases.

CREATE EXTENSION IF NOT EXISTS vector;

-- ── profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dashboard_mode TEXT DEFAULT 'study';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_pdf_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── documents ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INT DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS concept_count INT DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS concept_extraction_status TEXT DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'ready';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_progress INT DEFAULT 100;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- ── document_chunks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS page_number INT DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

-- ── daily_progress ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE daily_progress ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE daily_progress ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE daily_progress ADD COLUMN IF NOT EXISTS questions INT DEFAULT 0;
ALTER TABLE daily_progress ADD COLUMN IF NOT EXISTS study_minutes INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, date);

-- ── study_streaks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE study_streaks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE study_streaks ADD COLUMN IF NOT EXISTS streak_count INT DEFAULT 0;
ALTER TABLE study_streaks ADD COLUMN IF NOT EXISTS last_active_date DATE;
ALTER TABLE study_streaks ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
ALTER TABLE study_streaks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── exams ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject TEXT;
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams(user_id);

-- ── focus_progress ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS focus_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS session_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 0;
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS cards_reviewed INT DEFAULT 0;
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS active_time_seconds INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_focus_progress_user_date ON focus_progress(user_id, session_date);

-- ── chat_messages ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- ── user_memory ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS memory_type TEXT;
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);

-- ── revision_topics ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revision_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE revision_topics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE revision_topics ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE revision_topics ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE revision_topics ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE revision_topics ADD COLUMN IF NOT EXISTS ease_factor FLOAT DEFAULT 2.5;
ALTER TABLE revision_topics ADD COLUMN IF NOT EXISTS interval_days INT DEFAULT 1;
ALTER TABLE revision_topics ADD COLUMN IF NOT EXISTS repetitions INT DEFAULT 0;
ALTER TABLE revision_topics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_revision_topics_user_id ON revision_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_topics_due_date ON revision_topics(due_date);

-- ── syllabus_topics ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS syllabus_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE syllabus_topics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE syllabus_topics ADD COLUMN IF NOT EXISTS exam_type TEXT;
ALTER TABLE syllabus_topics ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE syllabus_topics ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE syllabus_topics ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE syllabus_topics ADD COLUMN IF NOT EXISTS weightage FLOAT DEFAULT 1.0;

-- ── pdfs_metadata ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdfs_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pdfs_metadata ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE pdfs_metadata ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE pdfs_metadata ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE pdfs_metadata ADD COLUMN IF NOT EXISTS size_bytes INT;

-- ── pdfs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS file_url TEXT;

-- ── quizzes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]';
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS score INT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);

-- ── user_plans ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS billing_cycle TEXT;
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS family_member_ids UUID[] DEFAULT '{}';
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── qa_usage ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qa_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE qa_usage ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE qa_usage ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE qa_usage ADD COLUMN IF NOT EXISTS count INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_qa_usage_user_date ON qa_usage(user_id, date);

-- ── conversations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- ── messages ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
