-- =====================================================================
-- generated_artifacts  —  Flashcards and micro-quizzes auto-generated
-- from weak-topic clusters.
-- Created: 2026-04-27
--
-- Why: Phase 2 identifies weak clusters semantically (e.g., "Thermodynamics"
-- mastery < 50%). Phase 4 auto-generates practice artifacts (flashcards,
-- quizzes) on-demand to make weak areas actionable and reduce study friction.
--
-- Artifact types:
--   flashcard  — { front: string, back: string, topic: string }[]
--   micro_quiz — { question: string, options: [string], correct: int, explanation: string, topic: string }[]
--
-- One artifact per user+cluster pair; regenerating overwrites.
-- =====================================================================

create table if not exists public.generated_artifacts (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  cluster_id      text not null,                     -- Weak cluster identifier (e.g., "thermodynamics_cluster")
  artifact_type   text not null check (artifact_type in ('flashcard', 'micro_quiz')),
  content         jsonb not null,                    -- Array of cards/questions
  metadata        jsonb,                             -- { topics: [], avg_mastery: 34, generated_at: timestamp }

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique(user_id, cluster_id, artifact_type)
);

create index if not exists artifacts_user_cluster_idx
  on public.generated_artifacts (user_id, cluster_id, artifact_type);

create index if not exists artifacts_user_created_idx
  on public.generated_artifacts (user_id, created_at desc);

-- RLS: users can only see/update their own artifacts.
alter table public.generated_artifacts enable row level security;

drop policy if exists "artifacts_select_own" on public.generated_artifacts;
create policy "artifacts_select_own"
  on public.generated_artifacts for select
  using (auth.uid() = user_id);

drop policy if exists "artifacts_update_own" on public.generated_artifacts;
create policy "artifacts_update_own"
  on public.generated_artifacts for update
  using (auth.uid() = user_id);

drop policy if exists "artifacts_insert_own" on public.generated_artifacts;
create policy "artifacts_insert_own"
  on public.generated_artifacts for insert
  with check (auth.uid() = user_id);

drop policy if exists "artifacts_delete_own" on public.generated_artifacts;
create policy "artifacts_delete_own"
  on public.generated_artifacts for delete
  using (auth.uid() = user_id);
