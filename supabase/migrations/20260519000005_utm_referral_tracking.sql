-- UTM and referral tracking on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_source   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_medium        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_campaign      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer_url      TEXT;

-- Index for analytics queries (group by source)
CREATE INDEX IF NOT EXISTS profiles_referral_source_idx ON profiles(referral_source)
  WHERE referral_source IS NOT NULL;

-- Signups over time by source (used by /api/admin/referrals)
CREATE INDEX IF NOT EXISTS profiles_created_at_source_idx ON profiles(created_at, referral_source);
