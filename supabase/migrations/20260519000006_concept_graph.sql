-- Concept Graph: concepts, concept_edges, mastery_state, cards, questions
-- Moved from supabase/concept_graph_migration.sql into the migrations/ folder
-- so it is applied by `supabase db push`. All statements are idempotent.

CREATE EXTENSION IF NOT EXISTS vector;

-- ── concepts: typed nodes extracted from uploaded PDFs ──────────────────────
CREATE TABLE IF NOT EXISTS concepts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id    UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN (
                   'definition','theorem','procedure','formula','argument','case'
                 )),
  difficulty     SMALLINT NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  canonical_text TEXT,
  source_refs    JSONB NOT NULL DEFAULT '[]',
  embedding      vector(1536),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS concepts_user_doc_idx ON concepts (user_id, document_id);
CREATE INDEX IF NOT EXISTS concepts_embedding_idx ON concepts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE UNIQUE INDEX IF NOT EXISTS concepts_doc_title_uniq ON concepts (document_id, LOWER(title));

ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own concepts" ON concepts;
CREATE POLICY "own concepts" ON concepts
  FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- ── concept_edges ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concept_edges (
  from_id    UUID REFERENCES concepts(id) ON DELETE CASCADE NOT NULL,
  to_id      UUID REFERENCES concepts(id) ON DELETE CASCADE NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('prerequisite_of','related_to','specializes')),
  strength   REAL NOT NULL DEFAULT 0.5 CHECK (strength BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (from_id, to_id, kind),
  CHECK (from_id <> to_id)
);

CREATE INDEX IF NOT EXISTS concept_edges_from_idx ON concept_edges (from_id);
CREATE INDEX IF NOT EXISTS concept_edges_to_idx   ON concept_edges (to_id);

ALTER TABLE concept_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own edges" ON concept_edges;
CREATE POLICY "own edges" ON concept_edges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM concepts c WHERE c.id = from_id AND c.user_id::text = auth.uid()::text)
  );

-- ── mastery_state: per-user retention overlay ─────────────────────────────
CREATE TABLE IF NOT EXISTS mastery_state (
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concept_id       UUID REFERENCES concepts(id) ON DELETE CASCADE NOT NULL,
  strength         REAL NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 1),
  confidence       REAL NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  last_reviewed_at TIMESTAMPTZ,
  next_due_at      TIMESTAMPTZ,
  lapses           INT NOT NULL DEFAULT 0,
  exposures        INT NOT NULL DEFAULT 0,
  fsrs_state       JSONB,
  signal_log       JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS mastery_due_idx  ON mastery_state (user_id, next_due_at) WHERE next_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS mastery_weak_idx ON mastery_state (user_id, strength) WHERE strength < 0.5;

ALTER TABLE mastery_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own mastery" ON mastery_state;
CREATE POLICY "own mastery" ON mastery_state
  FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- ── cards: pre-generated review items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('concept','formula','question','reasoning','cloze')),
  front      TEXT NOT NULL,
  back       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cards_user_concept_idx ON cards (user_id, concept_id);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own cards" ON cards;
CREATE POLICY "own cards" ON cards
  FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- ── questions: pre-generated quiz items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concept_id      UUID REFERENCES concepts(id) ON DELETE CASCADE NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('mcq','short','application','derivation')),
  stem            TEXT NOT NULL,
  answer          TEXT NOT NULL,
  distractors     JSONB,
  rubric          JSONB,
  feedback        TEXT,
  difficulty      REAL NOT NULL DEFAULT 0.5 CHECK (difficulty BETWEEN 0 AND 1),
  validator_score REAL NOT NULL DEFAULT 1.0 CHECK (validator_score BETWEEN 0 AND 1),
  source_refs     JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS questions_user_concept_idx ON questions (user_id, concept_id);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own questions" ON questions;
CREATE POLICY "own questions" ON questions
  FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS concepts_touch ON concepts;
CREATE TRIGGER concepts_touch BEFORE UPDATE ON concepts
  FOR EACH ROW EXECUTE PROCEDURE touch_updated_at();

DROP TRIGGER IF EXISTS mastery_touch ON mastery_state;
CREATE TRIGGER mastery_touch BEFORE UPDATE ON mastery_state
  FOR EACH ROW EXECUTE PROCEDURE touch_updated_at();
