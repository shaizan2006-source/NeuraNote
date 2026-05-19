CREATE TABLE IF NOT EXISTS waitlist_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS waitlist_emails_created_idx ON waitlist_emails(created_at DESC);

-- No RLS needed — public write (unauthenticated), admin-only read via service_role
