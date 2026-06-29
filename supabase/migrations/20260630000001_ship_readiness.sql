-- Ship-readiness foundation. Apply to PROD + staging.
-- (PYQs + Mock Test ALSO need 20260517000011_pyqs.sql applied to prod — pyqs / pyq_attempts /
--  mock_tests / search_pyqs_semantic. That file is fully IF NOT EXISTS-guarded; apply it too.)

-- /study card generation: persistCards inserts cards.document_id, but no migration ever added
-- the column -> the insert fails on a clean schema, leaving the spaced-repetition review queue
-- permanently empty. (Verified missing in prod: 42703 column cards.document_id does not exist.)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS document_id UUID;
CREATE INDEX IF NOT EXISTS cards_document_id_idx ON cards (document_id);

-- Git/staging parity: prod already has these via drift (probe = 200), so these are no-ops on
-- prod, but they were never in a migration -> a from-git/staging rebuild lacked them, which
-- broke the Progress summary route (exams.status filter; focus_progress.task/difficulty select).
ALTER TABLE exams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS task TEXT;
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS difficulty TEXT;
