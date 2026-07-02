-- avatars: profile photos (public read — avatar URLs are shared in the UI)
-- support-screenshots: optional ticket attachments (private, own-folder)
-- Bucket-level MIME + size limits reject non-image uploads server-side,
-- regardless of what content type the client claims.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('support-screenshots', 'support-screenshots', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── avatars RLS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
CREATE POLICY "avatars_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- ── support-screenshots RLS ────────────────────────────────────
DROP POLICY IF EXISTS "support_screenshots_upload" ON storage.objects;
CREATE POLICY "support_screenshots_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-screenshots' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "support_screenshots_read" ON storage.objects;
CREATE POLICY "support_screenshots_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-screenshots' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
