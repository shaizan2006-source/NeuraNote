-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Adds nullable document tracking columns to focus_progress table
ALTER TABLE focus_progress
  ADD COLUMN IF NOT EXISTS document_id   uuid,
  ADD COLUMN IF NOT EXISTS document_name text;
