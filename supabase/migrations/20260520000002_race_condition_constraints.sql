-- =====================================================================
-- Race condition guardrails — unique constraints + idempotency support
-- Deployed alongside: 20260520000001_streak_eval_idempotency.sql
-- =====================================================================

-- 1. weak_topics: no unique constraint existed — concurrent quiz submissions
--    or AI answer scoring could insert duplicate (user_id, topic, subject) rows.
--
--    Three fixes applied in order:
--      a) Deduplicate existing rows (keep highest count per group).
--      b) Add UNIQUE NULLS NOT DISTINCT constraint.
--         Standard UNIQUE allows multiple NULLs (NULL ≠ NULL in PG).
--         NULLS NOT DISTINCT (Postgres 15 / Supabase) treats all NULLs as
--         equal, so (user_id, topic, NULL) is truly unique.
--      c) Constraint creation is wrapped in a DO block for idempotency —
--         ADD CONSTRAINT has no IF NOT EXISTS in PostgreSQL.

-- a) Deduplicate: keep the row with the highest count per (user, topic, subject).
--    COALESCE in DISTINCT ON groups NULLs together so they are de-duped too.
DELETE FROM weak_topics
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, topic, COALESCE(subject, ''))
    id
  FROM weak_topics
  -- ORDER BY must lead with the same expressions as DISTINCT ON.
  -- count DESC ensures the highest-count row is selected per group.
  ORDER BY user_id, topic, COALESCE(subject, ''), count DESC, id ASC
);

-- b) + c) Add constraint idempotently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weak_topics_user_topic_subject_unique'
      AND conrelid = 'public.weak_topics'::regclass
  ) THEN
    ALTER TABLE public.weak_topics
      ADD CONSTRAINT weak_topics_user_topic_subject_unique
      UNIQUE NULLS NOT DISTINCT (user_id, topic, subject);
  END IF;
END $$;

COMMENT ON CONSTRAINT weak_topics_user_topic_subject_unique ON public.weak_topics IS
  'NULLS NOT DISTINCT: treats (user_id, topic, NULL) as a single unique value. '
  'Prevents duplicate rows from TOCTOU race in concurrent answer scoring.';


-- 2. spaced_repetition_cards: UNIQUE(user_id, topic) already exists in
--    spaced_repetition_cards.sql (sr_cards_user_topic_idx). No new index needed.
--    Removing the duplicate index that was previously defined here.


-- 3. daily_briefings already has UNIQUE(user_id, briefing_date)  — verified.
--    weekly_recaps  already has UNIQUE(user_id, week_starting)   — verified.
--    user_plans     already has UNIQUE(user_id)                  — verified.
--    No schema changes needed for those tables.
