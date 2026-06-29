-- Phase 4 / F-039 (S1): document_chunks.embedding had NO ANN index, so the RAG path
-- (match_documents / match_documents_multi — the hottest query in the product) did an
-- EXACT cosine KNN: a sequential scan computing 1536-dim distances over the candidate
-- chunk set on every PDF-grounded question. The RPCs order by `embedding <=> query`
-- (cosine), so an HNSW index with vector_cosine_ops is directly usable.
--
-- NOTE for a LARGE prod table: a plain CREATE INDEX takes an ACCESS EXCLUSIVE lock and
-- can be slow/memory-heavy. If document_chunks is already large, run the CONCURRENTLY
-- form manually OUTSIDE a migration/transaction instead:
--   CREATE INDEX CONCURRENTLY document_chunks_embedding_hnsw_idx
--     ON public.document_chunks USING hnsw (embedding vector_cosine_ops);
-- Keep idx_document_chunks_document_id (btree) so single-doc queries still pre-filter.

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);
