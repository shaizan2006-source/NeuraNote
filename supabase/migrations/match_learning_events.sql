-- =====================================================================
-- match_learning_events  —  vector similarity search over learning_events.
-- Used by Phase 5 (conversational progress) and Phase 2 (semantic dedup).
-- Created: 2026-04-27
-- =====================================================================

-- Returns the N most similar events to a query embedding for a given user.
-- Filters to a specific event_type when supplied.
create or replace function match_learning_events(
  p_user_id    uuid,
  query_emb    vector(1536),
  match_count  int     default 10,
  event_filter text    default null          -- null = all types
)
returns table (
  id          bigint,
  event_type  text,
  topic       text,
  metadata    jsonb,
  created_at  timestamptz,
  similarity  float
)
language sql stable
as $$
  select
    le.id,
    le.event_type,
    le.topic,
    le.metadata,
    le.created_at,
    1 - (le.embedding <=> query_emb) as similarity
  from public.learning_events le
  where
    le.user_id  = p_user_id
    and le.embedding is not null
    and (event_filter is null or le.event_type = event_filter)
  order by le.embedding <=> query_emb
  limit match_count;
$$;
