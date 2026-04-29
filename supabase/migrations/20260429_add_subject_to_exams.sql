-- supabase/migrations/20260429_add_subject_to_exams.sql
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS subject TEXT;

COMMENT ON COLUMN public.exams.subject IS
  'Normalized subject key (e.g. "dbms", "physics") from SUBJECT_MAP. NULL for exams created before this migration.';
