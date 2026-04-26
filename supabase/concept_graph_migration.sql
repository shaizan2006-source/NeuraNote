-- ============================================================================
-- Concept Graph Migration (Phase 0 — Foundations)
-- ============================================================================
-- Adds the spine for Focus Mode, AI Coach, Quiz, and Cards:
--   - concepts         → typed nodes extracted from uploaded PDFs
--   - concept_edges    → prerequisite / relatedness graph between concepts
--   - mastery_state    → per-user retention + confidence overlay
--   - cards            → pre-generated review cards (populated in Phase 2)
--   - questions        → pre-generated quiz items (populated in Phase 2)
--
-- Additive only. Does NOT modify existing tables destructively.
-- Safe to re-run (all creates use IF NOT EXISTS; ALTERs are idempotent).
-- ============================================================================

create extension if not exists vector;

-- ── 1. concepts: typed nodes ────────────────────────────────────────────────
create table if not exists concepts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  document_id    uuid references documents(id) on delete cascade not null,
  title          text not null,
  type           text not null check (type in (
                   'definition','theorem','procedure','formula','argument','case'
                 )),
  difficulty     smallint not null default 3 check (difficulty between 1 and 5),
  canonical_text text,
  source_refs    jsonb not null default '[]',
  embedding      vector(1536),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists concepts_user_doc_idx
  on concepts (user_id, document_id);

create index if not exists concepts_embedding_idx
  on concepts using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Prevent duplicate titles within the same document (idempotent backfill)
create unique index if not exists concepts_doc_title_uniq
  on concepts (document_id, lower(title));

-- ── 2. concept_edges: dependency + relatedness graph ────────────────────────
create table if not exists concept_edges (
  from_id     uuid references concepts(id) on delete cascade not null,
  to_id       uuid references concepts(id) on delete cascade not null,
  kind        text not null check (kind in (
                'prerequisite_of','related_to','specializes'
              )),
  strength    real not null default 0.5 check (strength between 0 and 1),
  created_at  timestamptz not null default now(),
  primary key (from_id, to_id, kind),
  check (from_id <> to_id)
);

create index if not exists concept_edges_from_idx on concept_edges (from_id);
create index if not exists concept_edges_to_idx   on concept_edges (to_id);

-- ── 3. mastery_state: per-user overlay ──────────────────────────────────────
-- Rows created empty at concept-extraction time. Written to starting Phase 1.
create table if not exists mastery_state (
  user_id          uuid references auth.users(id) on delete cascade not null,
  concept_id       uuid references concepts(id) on delete cascade not null,
  strength         real not null default 0 check (strength between 0 and 1),
  confidence       real not null default 0 check (confidence between 0 and 1),
  last_reviewed_at timestamptz,
  next_due_at      timestamptz,
  lapses           int  not null default 0,
  exposures        int  not null default 0,
  fsrs_state       jsonb,
  signal_log       jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, concept_id)
);

create index if not exists mastery_due_idx
  on mastery_state (user_id, next_due_at) where next_due_at is not null;

create index if not exists mastery_weak_idx
  on mastery_state (user_id, strength) where strength < 0.5;

-- ── 4. cards: pre-generated review items ────────────────────────────────────
-- Populated at concept-extraction time (Phase 0.5). Used by Cards + in-flow Recall.
create table if not exists cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  concept_id   uuid references concepts(id) on delete cascade not null,
  type         text not null check (type in (
                 'concept','formula','question','reasoning','cloze'
               )),
  front        text not null,
  back         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists cards_user_concept_idx on cards (user_id, concept_id);

-- ── 5. questions: pre-generated quiz items ──────────────────────────────────
-- Validated at generation time. difficulty refined by population performance.
create table if not exists questions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  concept_id      uuid references concepts(id) on delete cascade not null,
  type            text not null check (type in (
                    'mcq','short','application','derivation'
                  )),
  stem            text not null,
  answer          text not null,
  distractors     jsonb,
  rubric          jsonb,
  feedback        text,
  difficulty      real not null default 0.5 check (difficulty between 0 and 1),
  validator_score real not null default 1.0 check (validator_score between 0 and 1),
  source_refs     jsonb not null default '[]',
  created_at      timestamptz not null default now()
);

create index if not exists questions_user_concept_idx on questions (user_id, concept_id);

-- ── 6. Extend documents table with extraction status ────────────────────────
alter table documents
  add column if not exists concept_extraction_status text
    check (concept_extraction_status in ('pending','running','done','failed','skipped_ocr'))
    default 'pending';

alter table documents
  add column if not exists concept_extraction_error text;

alter table documents
  add column if not exists concepts_count int not null default 0;

alter table documents
  add column if not exists concept_extraction_started_at timestamptz;

alter table documents
  add column if not exists concept_extraction_finished_at timestamptz;

-- ── 7. updated_at auto-trigger ──────────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists concepts_touch on concepts;
create trigger concepts_touch before update on concepts
  for each row execute procedure touch_updated_at();

drop trigger if exists mastery_touch on mastery_state;
create trigger mastery_touch before update on mastery_state
  for each row execute procedure touch_updated_at();

-- ── 8. Row-level security ───────────────────────────────────────────────────
alter table concepts       enable row level security;
alter table concept_edges  enable row level security;
alter table mastery_state  enable row level security;
alter table cards          enable row level security;
alter table questions      enable row level security;

drop policy if exists "own concepts" on concepts;
create policy "own concepts" on concepts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own edges" on concept_edges;
create policy "own edges" on concept_edges
  for all using (
    exists (select 1 from concepts c where c.id = from_id and c.user_id = auth.uid())
  );

drop policy if exists "own mastery" on mastery_state;
create policy "own mastery" on mastery_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own cards" on cards;
create policy "own cards" on cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own questions" on questions;
create policy "own questions" on questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- END — Concept Graph Migration
-- ============================================================================
