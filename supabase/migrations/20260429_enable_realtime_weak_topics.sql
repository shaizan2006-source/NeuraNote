-- supabase/migrations/20260429_enable_realtime_weak_topics.sql
-- Critical prerequisite: add weak_topics to Realtime publication.
-- Without this, the JS hook change in useRealtimeProgress is a no-op.
-- Identified by Codex adversarial review as a must-have before shipping.

-- 1. Add weak_topics to the Realtime publication (idempotent guard).
--    Mirrors the pattern from enable_realtime_for_progress.sql.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'weak_topics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.weak_topics;
  END IF;
END $$;

-- 2. REPLICA IDENTITY FULL so UPDATE payloads include the old row.
--    Required for the hook to detect which fields changed.
--    Trade-off: slightly more WAL volume; acceptable for this low-frequency table.
ALTER TABLE public.weak_topics REPLICA IDENTITY FULL;

-- Note: RLS SELECT policy is NOT added here.
-- weak_topics_tables.sql already creates a FOR ALL policy (weak_topics_user_own)
-- which covers SELECT. Adding a duplicate SELECT policy would cause confusion.
