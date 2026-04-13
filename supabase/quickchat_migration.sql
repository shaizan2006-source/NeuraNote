-- supabase/quickchat_migration.sql
-- Run once in Supabase SQL Editor

-- 1. Add dashboard_mode + active_pdf_id to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dashboard_mode TEXT NOT NULL DEFAULT 'study',
  ADD COLUMN IF NOT EXISTS active_pdf_id  UUID REFERENCES pdfs_metadata(id) ON DELETE SET NULL;

-- 2. conversations: persisted QuickChat + Ask AI threads
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT,
  messages   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass (needed by API routes using SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "Service role full access to conversations"
  ON conversations FOR ALL
  USING (true)
  WITH CHECK (true);
