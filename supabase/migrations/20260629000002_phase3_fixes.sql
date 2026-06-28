-- 20260629000002_phase3_fixes.sql — Phase 3 remediations (schema/policy side).

-- F-026: cohort_members RLS was self-referential -> 42P17 infinite recursion (any
-- authenticated SELECT on cohort_members/cohorts/snapshots errored). Use a SECURITY
-- DEFINER helper (bypasses RLS, so no recursion) and rewrite the 3 cohort policies.
CREATE OR REPLACE FUNCTION public.user_cohort_ids()
RETURNS SETOF TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cohort_id FROM public.cohort_members WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.user_cohort_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_cohort_ids() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "cohorts_member_read" ON public.cohorts;
CREATE POLICY "cohorts_member_read" ON public.cohorts FOR SELECT
  USING (id IN (SELECT public.user_cohort_ids()));

DROP POLICY IF EXISTS "cohort_members_co_member_read" ON public.cohort_members;
CREATE POLICY "cohort_members_co_member_read" ON public.cohort_members FOR SELECT
  USING (cohort_id IN (SELECT public.user_cohort_ids()));

DROP POLICY IF EXISTS "leaderboard_member_read" ON public.cohort_leaderboard_snapshots;
CREATE POLICY "leaderboard_member_read" ON public.cohort_leaderboard_snapshots FOR SELECT
  USING (cohort_id IN (SELECT public.user_cohort_ids()));

-- F-025: concept_edges policy only validated from_id ownership, so a user could create an
-- edge pointing at ANOTHER user's concept (to_id). Require BOTH endpoints to be owned.
DROP POLICY IF EXISTS "own edges" ON public.concept_edges;
CREATE POLICY "own edges" ON public.concept_edges FOR ALL
  USING (EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = from_id AND c.user_id::text = auth.uid()::text))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = from_id AND c.user_id::text = auth.uid()::text)
    AND EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = to_id   AND c.user_id::text = auth.uid()::text)
  );

-- F-009: get_active_briefing_users RPC is called by the briefing cron but was missing
-- (cron silently fell back to streak>=1). Provide it: active = streak>=min OR a focus
-- session since min_session_date.
CREATE OR REPLACE FUNCTION public.get_active_briefing_users(
  min_streak INT DEFAULT 3,
  min_session_date DATE DEFAULT (now() - INTERVAL '3 days')::date
) RETURNS TABLE(user_id UUID) LANGUAGE sql STABLE AS $$
  SELECT DISTINCT u.user_id FROM (
    SELECT s.user_id FROM public.study_streaks s WHERE s.streak_count >= min_streak
    UNION
    SELECT f.user_id FROM public.focus_progress f WHERE f.session_date >= min_session_date
  ) u
$$;

-- F-016: sr_next_due.days_overdue truncated dates in the DB session tz (UTC) -> off-by-one
-- for IST users. Recompute in Asia/Kolkata. (Body otherwise identical; due selection still
-- uses absolute fsrs_due <= now().)
CREATE OR REPLACE FUNCTION sr_next_due(p_user_id uuid, p_limit int default 10)
RETURNS TABLE (
  id bigint, topic text, subject text, card_type text, fsrs_state text,
  fsrs_stability float, fsrs_difficulty float, fsrs_due timestamptz, fsrs_lapses int,
  fsrs_last_review timestamptz, fsrs_elapsed_days int, ease_factor float,
  interval_days int, repetition int, next_due_at timestamptz, days_overdue int
) LANGUAGE sql STABLE AS $$
  SELECT id, topic, subject, card_type, fsrs_state, fsrs_stability, fsrs_difficulty,
    fsrs_due, fsrs_lapses, fsrs_last_review, fsrs_elapsed_days, ease_factor,
    interval_days, repetition, next_due_at,
    greatest(0, ((now() AT TIME ZONE 'Asia/Kolkata')::date - (fsrs_due AT TIME ZONE 'Asia/Kolkata')::date)::int) AS days_overdue
  FROM public.spaced_repetition_cards
  WHERE user_id = p_user_id AND fsrs_due <= now()
  ORDER BY fsrs_due ASC, repetition ASC
  LIMIT p_limit;
$$;

-- F-008: recaps storage bucket (weekly-recap audio) was missing though the generator
-- uploads to it. Create it + folder-scoped owner-read RLS (writes are service-role).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recaps','recaps', false, 10485760, ARRAY['audio/mpeg','audio/mp4','image/png','image/jpeg'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS recaps_read ON storage.objects;
CREATE POLICY recaps_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'recaps' AND (storage.foldername(name))[1] = auth.uid()::text);

-- F-010: prod has an undocumented `pdfs` bucket not in git. Add for parity (private, pdf).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdfs','pdfs', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
