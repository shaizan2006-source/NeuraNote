-- RPC functions that exist in production
-- Drop existing versions first to allow return type changes
DROP FUNCTION IF EXISTS match_documents(vector, integer, uuid);
DROP FUNCTION IF EXISTS match_documents_multi(vector, integer, uuid[]);
DROP FUNCTION IF EXISTS increment_memory_weight(uuid, float);

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  doc_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE (doc_id IS NULL OR dc.document_id = doc_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION match_documents_multi(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  doc_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE (doc_ids IS NULL OR dc.document_id = ANY(doc_ids))
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add updated_at to user_memory if it doesn't exist
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION increment_memory_weight(memory_id UUID, delta FLOAT DEFAULT 0.1)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE user_memory
  SET weight = LEAST(weight + delta, 5.0),
      updated_at = NOW()
  WHERE id = memory_id;
$$;
