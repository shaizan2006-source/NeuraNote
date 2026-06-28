-- 20260629000001_enable_rls_open_tables.sql
--
-- SECURITY FIX (Phase 3, F-021..F-024). These 6 tables shipped with ROW LEVEL
-- SECURITY OFF. Proven on staging: any ordinary authenticated user could READ,
-- FORGE, and TAMPER other users' rows — including payment_orders (read another
-- user's order and rewrote its amount 49900->1 = S0), family_invites (leak the
-- secret invite_code + role escalation), and lead/waitlist PII.
--
-- Every one of these tables is written/read ONLY server-side via the service-role
-- key (create-order/verify, family invite/redeem, subscription/cancel, the
-- decompression detector, and /api/waitlist all use SERVICE_ROLE_KEY). Service-role
-- BYPASSES RLS, so enabling RLS with owner-scoped (or no) policies closes the
-- cross-user holes WITHOUT breaking any application flow.

-- Tables WITH user ownership → enable RLS + owner-only SELECT. No INSERT/UPDATE/DELETE
-- policy for users (writes are service-role only), so cross-user writes are denied.
ALTER TABLE public.payment_orders        ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_orders_owner_read ON public.payment_orders;
CREATE POLICY payment_orders_owner_read ON public.payment_orders
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.family_invites        ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_invites_owner_read ON public.family_invites;
CREATE POLICY family_invites_owner_read ON public.family_invites
  FOR SELECT USING (auth.uid() = primary_user_id OR auth.uid() = used_by);

ALTER TABLE public.cancellation_reasons  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cancellation_reasons_owner_read ON public.cancellation_reasons;
CREATE POLICY cancellation_reasons_owner_read ON public.cancellation_reasons
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.decompression_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS decompression_triggers_owner_read ON public.decompression_triggers;
CREATE POLICY decompression_triggers_owner_read ON public.decompression_triggers
  FOR SELECT USING (auth.uid() = user_id);

-- No user ownership column; only the server (service-role) touches these.
-- Enable RLS with NO policy → fully locked to service-role; anon/authenticated get nothing.
-- (/api/waitlist inserts via service-role, so public signup keeps working.)
ALTER TABLE public.coaching_institute_pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_emails           ENABLE ROW LEVEL SECURITY;
