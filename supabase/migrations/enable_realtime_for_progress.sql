-- =====================================================================
-- enable_realtime_for_progress
-- Adds the six progress-relevant tables to the supabase_realtime
-- publication so postgres_changes events stream to authenticated clients.
-- Companion: src/hooks/useRealtimeProgress.js
-- =====================================================================

-- 1. Add tables to the realtime publication.
--    Wrapping each ADD in DO blocks so re-running the migration is safe.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'learning_events'
  ) then
    alter publication supabase_realtime add table public.learning_events;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'focus_progress'
  ) then
    alter publication supabase_realtime add table public.focus_progress;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'mastery_topics'
  ) then
    alter publication supabase_realtime add table public.mastery_topics;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'study_streaks'
  ) then
    alter publication supabase_realtime add table public.study_streaks;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'exams'
  ) then
    alter publication supabase_realtime add table public.exams;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'spaced_repetition_cards'
  ) then
    alter publication supabase_realtime add table public.spaced_repetition_cards;
  end if;
end $$;

-- 2. REPLICA IDENTITY FULL on tables that get UPDATEs so the realtime
--    payload's `old` record contains all columns (needed for diff highlighting,
--    e.g. detecting mastery_score 49→51 crossing the 50 band).
--    learning_events stays default (append-only, INSERTs only).
alter table public.mastery_topics          replica identity full;
alter table public.study_streaks           replica identity full;
alter table public.focus_progress          replica identity full;
alter table public.exams                   replica identity full;
alter table public.spaced_repetition_cards replica identity full;

-- 3. Sanity check: realtime requires SELECT RLS policies for the authenticated
--    role on each table. The migrations that created these tables already do
--    this, but we verify here so a misconfigured prod project fails loudly.
--    (This block raises a notice; it doesn't fail the migration so we can
--    deploy first and audit second.)
do $$
declare
  t text;
  cnt int;
begin
  for t in
    select unnest(array[
      'learning_events','focus_progress','mastery_topics',
      'study_streaks','exams','spaced_repetition_cards'
    ])
  loop
    select count(*) into cnt
    from pg_policies
    where schemaname = 'public' and tablename = t and cmd = 'SELECT';
    if cnt = 0 then
      raise notice 'realtime: no SELECT policy on %, clients will receive zero rows', t;
    end if;
  end loop;
end $$;

