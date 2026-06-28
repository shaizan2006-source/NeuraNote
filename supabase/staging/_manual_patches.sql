-- _manual_patches.sql — STAGING-ONLY supplements (applied last by build-staging-schema.mjs).
--
-- Prod-confirmed schema drift is now handled by a committed migration:
--   supabase/migrations/20260628000002_reconcile_prod_drift.sql
-- (cards.metadata, user_plans.expires_at/order_id, conversations.messages, documents bucket).
--
-- This file holds ONLY staging-side RLS policies for the `documents` bucket, so Phase-3
-- isolation tests have folder-scoped policies to probe. (Prod's actual documents-bucket
-- policies could not be read over REST — verify them separately before trusting Phase-3
-- storage results.)
--
-- Deliberately NOT recreated here (prod LACKS them — staging mirrors prod so the gaps
-- are reproducible in testing): recaps bucket (F-008), get_active_briefing_users (F-009),
-- anonymise_profile's columns (F-011).

DROP POLICY IF EXISTS documents_upload ON storage.objects;
CREATE POLICY documents_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS documents_read ON storage.objects;
CREATE POLICY documents_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS documents_delete ON storage.objects;
CREATE POLICY documents_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
