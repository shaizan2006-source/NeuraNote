-- supabase/migrations/add_active_time_to_focus_progress.sql
ALTER TABLE focus_progress ADD COLUMN IF NOT EXISTS active_time_seconds integer DEFAULT 0;
