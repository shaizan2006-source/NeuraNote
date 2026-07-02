-- SageLine: rebuilt voice tutor. Separate namespace from voice_calls so the
-- old /call-tutor flow keeps working until founder cutover (FEATURE flag).
-- Content FK adapted from the spec: there is no chapters table — sessions
-- ground against the student's uploaded document (RAG over document_chunks).

CREATE TABLE IF NOT EXISTS sageline_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'connecting'
    CHECK (state IN ('connecting','greeting','questioning','clarifying','wrapping_up','ended','failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  language_detected TEXT[] DEFAULT '{}',  -- languages actually used, for QA/analytics
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sageline_sessions_user ON sageline_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS sageline_transcript_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sageline_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student','sageline')),
  content TEXT NOT NULL,
  audio_latency_ms INT,   -- prior turn end → this turn's audio start; instrumented from day one
  turn_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sageline_turns_session ON sageline_transcript_turns(session_id, turn_index);

CREATE TABLE IF NOT EXISTS sageline_session_summaries (
  session_id UUID PRIMARY KEY REFERENCES sageline_sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  misconceptions_caught TEXT[] DEFAULT '{}',
  -- FSRS queue is spaced_repetition_cards (topic-based, what /api/cards/sr_due
  -- reads); its id is bigint. The `cards` table needs a concept_id we don't
  -- have, so SageLine pushes review items to spaced_repetition_cards.
  generated_srs_card_ids BIGINT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sageline_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sageline_transcript_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sageline_session_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sageline_sessions own" ON sageline_sessions;
CREATE POLICY "sageline_sessions own" ON sageline_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sageline_turns own" ON sageline_transcript_turns;
CREATE POLICY "sageline_turns own" ON sageline_transcript_turns FOR ALL
  USING (EXISTS (SELECT 1 FROM sageline_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sageline_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "sageline_summaries own" ON sageline_session_summaries;
CREATE POLICY "sageline_summaries own" ON sageline_session_summaries FOR ALL
  USING (EXISTS (SELECT 1 FROM sageline_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sageline_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
