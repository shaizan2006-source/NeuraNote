-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Pricing A/B test infrastructure
-- Date: 2026-05-28
-- Purpose: Supports Phase 10.5 — Pro pricing A/B test (₹199 vs ₹399 vs ₹499/mo)
-- Variants:
--   'a' → ₹199/mo  (low-price volume hypothesis)
--   'b' → ₹399/mo  (control — current price)
--   'c' → ₹499/mo  (high-price quality-signal hypothesis)
--
-- Assignment is stable (1 row per user, written on first pricing-page visit).
-- Variant persists for the lifetime of the test so the same user always sees
-- the same price. Cleared when the test ends by setting ab_test_name = NULL.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pricing_variant   TEXT    DEFAULT NULL,  -- 'a' | 'b' | 'c'
  ADD COLUMN IF NOT EXISTS pricing_ab_test   TEXT    DEFAULT NULL,  -- test name / epoch (e.g. 'pro-price-2026-05')
  ADD COLUMN IF NOT EXISTS pricing_variant_at TIMESTAMPTZ DEFAULT NULL;

-- Fast lookup: admin dashboard queries by variant to compute conversion rates
CREATE INDEX IF NOT EXISTS profiles_pricing_variant_idx
  ON profiles (pricing_variant, pricing_ab_test)
  WHERE pricing_variant IS NOT NULL;
