-- Full cohort schema (extends stub from migration 000004)
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE cohort_members
  ADD COLUMN IF NOT EXISTS display_handle TEXT,
  ADD COLUMN IF NOT EXISTS handle_regenerated_at TIMESTAMPTZ;

ALTER TABLE cohort_members ADD CONSTRAINT cohort_handle_unique UNIQUE (cohort_id, display_handle) DEFERRABLE;

CREATE TABLE IF NOT EXISTS cohort_leaderboard_snapshots (
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
  snapshot_date DATE,
  rankings JSONB,
  PRIMARY KEY (cohort_id, snapshot_date)
);

-- RLS
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cohorts_member_read" ON cohorts FOR SELECT
  USING (id IN (SELECT cohort_id FROM cohort_members WHERE user_id = auth.uid()));
CREATE POLICY "cohort_members_co_member_read" ON cohort_members FOR SELECT
  USING (cohort_id IN (SELECT cohort_id FROM cohort_members WHERE user_id = auth.uid()));
CREATE POLICY "leaderboard_member_read" ON cohort_leaderboard_snapshots FOR SELECT
  USING (cohort_id IN (SELECT cohort_id FROM cohort_members WHERE user_id = auth.uid()));
