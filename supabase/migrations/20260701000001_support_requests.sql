CREATE TABLE IF NOT EXISTS support_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users insert own support_requests" ON support_requests;
CREATE POLICY "users insert own support_requests"
  ON support_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
