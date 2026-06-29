-- =====================================================================
-- spaced_repetition_cards  —  FSRS scheduler state per topic.
-- Created:      2026-04-27 (SM-2)
-- Migrated:     2026-05-20 (FSRS via ts-fsrs)
--
-- Why: Unlike mastery_topics (overall proficiency), this table models
-- the recall schedule. A topic at 85% mastery can still be "due" if
-- not seen in 14 days.
--
-- Algorithm: FSRS (Free Spaced Repetition Scheduler) via ts-fsrs.
-- SM-2 columns (ease_factor, interval_days, repetition) are kept for
-- backwards-compat and used by migrateSM2Card().
-- =====================================================================

create table if not exists public.spaced_repetition_cards (
  id              bigserial primary key,
  user_id         uuid    not null references auth.users(id) on delete cascade,
  topic           text    not null,
  subject         text,
  card_type       text    not null default 'note_chunk',

  -- FSRS state (ts-fsrs)
  fsrs_state        text        not null default 'new',        -- new | learning | relearning | review
  fsrs_stability    float       not null default 0,
  fsrs_difficulty   float       not null default 0,
  fsrs_due          timestamptz not null default now(),
  fsrs_lapses       int         not null default 0,
  fsrs_last_review  timestamptz,
  fsrs_elapsed_days int         not null default 0,

  -- SM-2 columns kept for migration compatibility
  ease_factor     float not null default 2.5,
  interval_days   int   not null default 1,
  repetition      int   not null default 0,

  -- Canonical due timestamp (kept in sync with fsrs_due)
  last_review_at  timestamptz,
  next_due_at     timestamptz not null default now(),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique(user_id, topic)
);

-- ── Backfill for tables created before FSRS migration ────────────────────────
alter table public.spaced_repetition_cards
  add column if not exists card_type        text        not null default 'note_chunk',
  add column if not exists fsrs_state       text        not null default 'new',
  add column if not exists fsrs_stability   float       not null default 0,
  add column if not exists fsrs_difficulty  float       not null default 0,
  add column if not exists fsrs_due         timestamptz not null default now(),
  add column if not exists fsrs_lapses      int         not null default 0,
  add column if not exists fsrs_last_review timestamptz,
  add column if not exists fsrs_elapsed_days int        not null default 0;

-- Rename last_reviewed_at → last_review_at if the old column still exists.
-- DO block is used so the rename is idempotent (no error if already renamed).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'spaced_repetition_cards'
      and column_name  = 'last_reviewed_at'
  ) then
    alter table public.spaced_repetition_cards
      rename column last_reviewed_at to last_review_at;
  end if;
end $$;

-- Add last_review_at if it never existed under either name
alter table public.spaced_repetition_cards
  add column if not exists last_review_at timestamptz;

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists sr_cards_user_due_idx
  on public.spaced_repetition_cards (user_id, next_due_at asc);

create index if not exists sr_cards_user_fsrs_due_idx
  on public.spaced_repetition_cards (user_id, fsrs_due asc);

create index if not exists sr_cards_user_topic_idx
  on public.spaced_repetition_cards (user_id, topic);

create index if not exists sr_cards_fsrs_state_idx
  on public.spaced_repetition_cards (user_id, fsrs_state, fsrs_due asc);

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists sr_cards_updated_at on public.spaced_repetition_cards;
create trigger sr_cards_updated_at
  before update on public.spaced_repetition_cards
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.spaced_repetition_cards enable row level security;

drop policy if exists "sr_cards_select_own"  on public.spaced_repetition_cards;
drop policy if exists "sr_cards_insert_own"  on public.spaced_repetition_cards;
drop policy if exists "sr_cards_update_own"  on public.spaced_repetition_cards;
drop policy if exists "sr_cards_delete_own"  on public.spaced_repetition_cards;

create policy "sr_cards_select_own"
  on public.spaced_repetition_cards for select
  using (auth.uid() = user_id);

create policy "sr_cards_insert_own"
  on public.spaced_repetition_cards for insert
  with check (auth.uid() = user_id);

create policy "sr_cards_update_own"
  on public.spaced_repetition_cards for update
  using (auth.uid() = user_id);

create policy "sr_cards_delete_own"
  on public.spaced_repetition_cards for delete
  using (auth.uid() = user_id);

-- ── sr_next_due — FSRS-aware helper function ─────────────────────────────────
-- Returns due cards for a user with all FSRS columns needed by the scheduler.
-- Replaces the stale SM-2-only version.
create or replace function sr_next_due(
  p_user_id  uuid,
  p_limit    int default 10
)
returns table (
  id               bigint,
  topic            text,
  subject          text,
  card_type        text,
  fsrs_state       text,
  fsrs_stability   float,
  fsrs_difficulty  float,
  fsrs_due         timestamptz,
  fsrs_lapses      int,
  fsrs_last_review timestamptz,
  fsrs_elapsed_days int,
  ease_factor      float,
  interval_days    int,
  repetition       int,
  next_due_at      timestamptz,
  days_overdue     int
)
language sql stable
as $$
  select
    id,
    topic,
    subject,
    card_type,
    fsrs_state,
    fsrs_stability,
    fsrs_difficulty,
    fsrs_due,
    fsrs_lapses,
    fsrs_last_review,
    fsrs_elapsed_days,
    ease_factor,
    interval_days,
    repetition,
    next_due_at,
    greatest(0, (now()::date - fsrs_due::date)::int) as days_overdue
  from public.spaced_repetition_cards
  where user_id = p_user_id
    and fsrs_due <= now()
  order by fsrs_due asc, repetition asc
  limit p_limit;
$$;
