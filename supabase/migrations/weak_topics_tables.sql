-- =====================================================================
-- weak_topics & topic_attempts — track user learning progression
-- Created: 2026-04-27
-- =====================================================================

-- topic_attempts: every attempt at a topic (frequent queries)
create table if not exists public.topic_attempts (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  topic        text not null,
  subject      text,
  count        int default 1,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

-- Backfill missing columns for pre-existing table
alter table public.topic_attempts add column if not exists updated_at timestamptz default now();
alter table public.topic_attempts add column if not exists created_at timestamptz default now();

create index if not exists topic_attempts_user_topic_idx
  on public.topic_attempts (user_id, topic);

-- weak_topics: promoted topics (user asking repeatedly about same thing)
create table if not exists public.weak_topics (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  topic        text not null,
  subject      text,
  count        int default 1,
  level        text default 'medium', -- easy | medium | hard
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

-- Backfill missing columns for pre-existing table
alter table public.weak_topics add column if not exists updated_at timestamptz default now();
alter table public.weak_topics add column if not exists created_at timestamptz default now();

create index if not exists weak_topics_user_topic_idx
  on public.weak_topics (user_id, topic);

create index if not exists weak_topics_user_created_idx
  on public.weak_topics (user_id, created_at desc);

-- RLS: users can only see their own data
alter table public.topic_attempts enable row level security;
alter table public.weak_topics enable row level security;

drop policy if exists "topic_attempts_user_own" on public.topic_attempts;
create policy "topic_attempts_user_own"
  on public.topic_attempts for all
  using (auth.uid() = user_id);

drop policy if exists "weak_topics_user_own" on public.weak_topics;
create policy "weak_topics_user_own"
  on public.weak_topics for all
  using (auth.uid() = user_id);
