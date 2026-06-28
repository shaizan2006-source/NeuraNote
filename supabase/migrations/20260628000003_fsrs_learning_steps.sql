-- 20260628000003_fsrs_learning_steps.sql
--
-- F-015 fix: persist the ts-fsrs learning-step cursor on spaced_repetition_cards.
-- Without it, src/lib/fsrs/scheduler.js reset the step to 0 on every review, so
-- learning/relearning cards never graduated to 'review' and the interval stayed
-- frozen at the first ~10-minute learning step (only 'easy' ever graduated).
-- The scheduler now reads/writes this column (learning_steps cursor).
ALTER TABLE public.spaced_repetition_cards
  ADD COLUMN IF NOT EXISTS fsrs_learning_steps INT NOT NULL DEFAULT 0;
