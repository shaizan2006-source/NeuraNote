-- Create storage buckets required by the app.
-- user-pdfs: stores uploaded study PDFs
-- briefings: stores generated audio briefings
-- photo-doubts: stores photo doubt uploads (auto-cleaned after 24h)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('user-pdfs',     'user-pdfs',     false, 52428800,  ARRAY['application/pdf']),
  ('briefings',     'briefings',     false, 10485760,  ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav']),
  ('photo-doubts',  'photo-doubts',  false, 10485760,  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── user-pdfs RLS ──────────────────────────────────────────────
CREATE POLICY "user_pdfs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_pdfs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_pdfs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── briefings RLS ──────────────────────────────────────────────
CREATE POLICY "briefings_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'briefings' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- service_role writes briefings (server-side only, no client insert policy needed)

-- ── photo-doubts RLS ───────────────────────────────────────────
CREATE POLICY "photo_doubts_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photo-doubts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "photo_doubts_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photo-doubts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
