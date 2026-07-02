-- Extend support_requests into a full ticket table (additive; table is live)
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE support_requests DROP CONSTRAINT IF EXISTS support_requests_category_check;
ALTER TABLE support_requests ADD CONSTRAINT support_requests_category_check
  CHECK (category IN ('billing','bug','feature_request','account','other'));
ALTER TABLE support_requests DROP CONSTRAINT IF EXISTS support_requests_status_check;
ALTER TABLE support_requests ADD CONSTRAINT support_requests_status_check
  CHECK (status IN ('open','in_progress','resolved'));

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);

-- Users can now view their own tickets (status visibility). Updates stay service-role only.
DROP POLICY IF EXISTS "users select own support_requests" ON support_requests;
CREATE POLICY "users select own support_requests"
  ON support_requests FOR SELECT USING (auth.uid() = user_id);

-- FAQ: editable without a deploy
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faq public read" ON faq_items;
CREATE POLICY "faq public read" ON faq_items FOR SELECT USING (published = true);
-- writes: service role only (edited via Supabase dashboard — no in-app editor at launch)

INSERT INTO faq_items (question, answer, sort_order) VALUES
  ('How do I upload my notes?', 'Open Sage and use the attach button, or go to your dashboard and upload a PDF. We extract the text, index it, and your notes become answerable within a minute.', 1),
  ('Why did Sage stop answering my questions?', 'Free accounts have a daily question limit. It resets at midnight IST — or upgrade for unlimited questions.', 2),
  ('How do I change my email or password?', 'Settings → Account. Email changes need a confirmation link sent to the new address; passwords are changed via a reset link for security.', 3),
  ('How do I cancel my plan?', 'Settings → Plan → Cancel. You keep access until the end of the period you paid for. No hidden steps.', 4),
  ('How do I delete my account?', 'Settings → Privacy → Delete account. There is a 7-day grace period during which you can change your mind; after that your data is permanently removed.', 5),
  ('My PDF failed to process. What do I do?', 'Scanned or image-heavy PDFs can fail text extraction. Try a text-based PDF, or report it below with the file name and we will look at it.', 6)
ON CONFLICT DO NOTHING;
