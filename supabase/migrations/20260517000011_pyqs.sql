CREATE TABLE IF NOT EXISTS pyqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS exam_type TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS exam_year INT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS exam_session TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS concepts TEXT[];
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS question_image_url TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS solution_text TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS solution_image_url TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS mark_weight INT DEFAULT 4;
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'mcq';
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE pyqs ADD COLUMN IF NOT EXISTS source_attribution TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS pyqs_slug_idx ON pyqs (slug);
CREATE INDEX IF NOT EXISTS pyqs_exam_year_subject_idx ON pyqs (exam_type, exam_year, subject);
CREATE INDEX IF NOT EXISTS pyqs_chapter_idx ON pyqs (chapter);
CREATE INDEX IF NOT EXISTS pyqs_concepts_idx ON pyqs USING GIN (concepts);

ALTER TABLE pyqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pyqs_public_read" ON pyqs;
CREATE POLICY "pyqs_public_read" ON pyqs FOR SELECT USING (true);

-- PYQ attempts
CREATE TABLE IF NOT EXISTS pyq_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pyq_attempts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE pyq_attempts ADD COLUMN IF NOT EXISTS pyq_id UUID REFERENCES pyqs(id) ON DELETE CASCADE;
ALTER TABLE pyq_attempts ADD COLUMN IF NOT EXISTS user_answer TEXT;
ALTER TABLE pyq_attempts ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE pyq_attempts ADD COLUMN IF NOT EXISTS time_taken_seconds INT;

CREATE INDEX IF NOT EXISTS pyq_attempts_user_idx ON pyq_attempts (user_id, attempted_at DESC);

ALTER TABLE pyq_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pyq_attempts_owner_all" ON pyq_attempts;
CREATE POLICY "pyq_attempts_owner_all" ON pyq_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mock tests
CREATE TABLE IF NOT EXISTS mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS exam_type TEXT;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS total_questions INT;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS questions JSONB;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]';
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS score INT;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS marks_obtained INT;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS total_marks INT;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS topic_breakdown JSONB;
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS predicted_rank_range INT[];
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS duration_seconds INT;

CREATE INDEX IF NOT EXISTS mock_tests_user_idx ON mock_tests (user_id, completed_at DESC NULLS LAST);

ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mock_tests_owner_all" ON mock_tests;
CREATE POLICY "mock_tests_owner_all" ON mock_tests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Decompression triggers
CREATE TABLE IF NOT EXISTS decompression_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE decompression_triggers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE decompression_triggers ADD COLUMN IF NOT EXISTS trigger_type TEXT;
ALTER TABLE decompression_triggers ADD COLUMN IF NOT EXISTS context JSONB;
ALTER TABLE decompression_triggers ADD COLUMN IF NOT EXISTS user_response TEXT;
ALTER TABLE decompression_triggers ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE decompression_triggers ADD COLUMN IF NOT EXISTS shadow_mode BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS decompression_user_idx ON decompression_triggers (user_id, triggered_at DESC);

-- Semantic search RPC for PYQs
DROP FUNCTION IF EXISTS search_pyqs_semantic(vector, integer, text, text);
CREATE OR REPLACE FUNCTION search_pyqs_semantic(
  query_embedding vector(1536),
  match_count INT DEFAULT 10,
  filter_exam TEXT DEFAULT NULL,
  filter_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  exam_type TEXT,
  exam_year INT,
  subject TEXT,
  chapter TEXT,
  question_text TEXT,
  difficulty TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id, p.slug, p.exam_type, p.exam_year, p.subject, p.chapter, p.question_text, p.difficulty,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM pyqs p
  WHERE p.embedding IS NOT NULL
    AND (filter_exam IS NULL OR p.exam_type = filter_exam)
    AND (filter_subject IS NULL OR p.subject = filter_subject)
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- IVFFlat index for fast ANN search (create after data is loaded)
-- CREATE INDEX IF NOT EXISTS pyqs_embedding_idx ON pyqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- FSRS columns on spaced_repetition_cards
-- Note: existing columns topic, repetition, next_due_at, ease_factor, interval_days are kept as-is.
-- FSRS scheduler reads/writes those plus the columns below.
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS fsrs_stability FLOAT;
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS fsrs_difficulty FLOAT;
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS fsrs_state TEXT DEFAULT 'new';
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS fsrs_last_review TIMESTAMPTZ;
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS fsrs_lapses INT DEFAULT 0;
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS fsrs_due TIMESTAMPTZ;
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS fsrs_elapsed_days FLOAT DEFAULT 0;
ALTER TABLE spaced_repetition_cards ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'note_chunk';
