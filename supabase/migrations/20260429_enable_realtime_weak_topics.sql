-- supabase/migrations/20260429_enable_realtime_weak_topics.sql

-- 1. Add weak_topics to the Realtime publication so postgres_changes
--    events fire for INSERT / UPDATE / DELETE.
ALTER PUBLICATION supabase_realtime ADD TABLE public.weak_topics;

-- 2. REPLICA IDENTITY FULL gives UPDATE payloads the old row data,
--    needed so the hook can detect what changed.
ALTER TABLE public.weak_topics REPLICA IDENTITY FULL;

-- 3. RLS SELECT policy so authenticated users can read their own rows.
--    CREATE POLICY IF NOT EXISTS is idempotent — safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weak_topics' AND policyname = 'weak_topics_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY weak_topics_select_own
        ON public.weak_topics
        FOR SELECT
        USING (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;
