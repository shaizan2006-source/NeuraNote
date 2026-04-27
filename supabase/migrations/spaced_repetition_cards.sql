-- =====================================================================
-- spaced_repetition_cards  —  SM-2 scheduler state per topic.
-- Created: 2026-04-27
--
-- Why: Unlike mastery_topics (which track overall proficiency), this
-- table models the recall schedule. A topic may have 85% mastery but
-- still be "due" for review if not seen in 14 days.
--
-- SM-2 algorithm (Supermemo 2):
--   - EF (ease factor) = how hard the topic is [1.3 to 2.5] (2.5 = easy)
--   - interval = days until next review
--   - quality = 0-5 (4-5 = correct, 2-3 = partial, 0-1 = fail)
--
-- When user reviews (answers a question correctly on this topic):
--   1. Compute quality score (inferred from mastery_score or explicit)
--   2. Update EF = max(1.3, EF + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
--   3. Update interval: if quality >= 4, then interval *= EF; else interval = 1
--   4. Update next_due = today + interval
-- =====================================================================

create table if not exists public.spaced_repetition_cards (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  topic           text not null,
  subject         text,

  -- SM-2 state
  ease_factor     float not null default 2.5,          -- 1.3 to 2.5
  interval_days   int not null default 1,              -- days until next review
  repetition      int not null default 0,              -- how many times reviewed

  -- Scheduling
  last_reviewed_at  timestamptz,                       -- when user last answered on this
  next_due_at       timestamptz not null default now(),  -- when to show next

  -- Tracking
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique(user_id, topic)
);

create index if not exists sr_cards_user_due_idx
  on public.spaced_repetition_cards (user_id, next_due_at asc);

create index if not exists sr_cards_user_topic_idx
  on public.spaced_repetition_cards (user_id, topic);

-- RLS: users can only see/update their own cards.
alter table public.spaced_repetition_cards enable row level security;

drop policy if exists "sr_cards_select_own" on public.spaced_repetition_cards;
create policy "sr_cards_select_own"
  on public.spaced_repetition_cards for select
  using (auth.uid() = user_id);

drop policy if exists "sr_cards_update_own" on public.spaced_repetition_cards;
create policy "sr_cards_update_own"
  on public.spaced_repetition_cards for update
  using (auth.uid() = user_id);

drop policy if exists "sr_cards_insert_own" on public.spaced_repetition_cards;
create policy "sr_cards_insert_own"
  on public.spaced_repetition_cards for insert
  with check (auth.uid() = user_id);

-- Function to get N next-due topics for a user.
create or replace function sr_next_due(
  p_user_id  uuid,
  p_limit    int default 10
)
returns table (
  topic            text,
  subject          text,
  ease_factor      float,
  interval_days    int,
  repetition       int,
  next_due_at      timestamptz,
  days_overdue     int
)
language sql stable
as $$
  select
    topic,
    subject,
    ease_factor,
    interval_days,
    repetition,
    next_due_at,
    (now()::date - next_due_at::date)::int as days_overdue
  from public.spaced_repetition_cards
  where user_id = p_user_id and next_due_at <= now()
  order by next_due_at asc, repetition asc
  limit p_limit;
$$;
