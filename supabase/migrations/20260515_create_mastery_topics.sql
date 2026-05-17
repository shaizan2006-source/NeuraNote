-- =====================================================================
-- mastery_topics — track topic mastery scores per user
-- Created: 2026-05-15
-- =====================================================================

create table if not exists public.mastery_topics (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  topic        text not null,
  subject      text,
  mastery_score numeric default 0,
  last_updated timestamptz default now(),
  created_at   timestamptz default now(),

  unique(user_id, topic)
);

create index if not exists mastery_topics_user_topic_idx
  on public.mastery_topics (user_id, topic);

alter table public.mastery_topics enable row level security;

drop policy if exists "mastery_topics_user_own" on public.mastery_topics;
create policy "mastery_topics_user_own"
  on public.mastery_topics for all
  using (auth.uid() = user_id);
