-- =====================================================================
-- learning_events  —  canonical event log for the Progress system.
-- Every future learning-tracking feature writes here. No per-feature tables.
-- Created: 2026-04-27
-- =====================================================================

create table if not exists public.learning_events (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  event_type   text not null,
  surface      text,                                -- dashboard | ask_ai | focus_mode | quiz | coach | voice | pdf
  topic        text,                                -- normalized lowercase, nullable
  subject      text,                                -- nullable
  metadata     jsonb not null default '{}'::jsonb,
  session_id   uuid,                                -- groups events into a session
  duration_ms  int,                                 -- nullable, for events with duration
  created_at   timestamptz not null default now()
);

-- Hot-path indexes
create index if not exists learning_events_user_created_idx
  on public.learning_events (user_id, created_at desc);

create index if not exists learning_events_user_type_created_idx
  on public.learning_events (user_id, event_type, created_at desc);

create index if not exists learning_events_user_session_idx
  on public.learning_events (user_id, session_id);

create index if not exists learning_events_metadata_gin_idx
  on public.learning_events using gin (metadata);

-- Reserve a column for Phase 2 embeddings; pgvector extension already enabled
-- in this project. Filled lazily by an embedding worker, never blocks insert.
alter table public.learning_events
  add column if not exists embedding vector(1536);

create index if not exists learning_events_embedding_idx
  on public.learning_events using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RLS: a user can only see and write their own events.
alter table public.learning_events enable row level security;

drop policy if exists "learning_events_select_own" on public.learning_events;
create policy "learning_events_select_own"
  on public.learning_events for select
  using (auth.uid() = user_id);

drop policy if exists "learning_events_insert_own" on public.learning_events;
create policy "learning_events_insert_own"
  on public.learning_events for insert
  with check (auth.uid() = user_id);

-- No update / delete policies on purpose: the event log is append-only.
-- The service-role key (server side) bypasses RLS for admin compaction jobs.
/