-- supabase/migrations/20260504120000_add_theme_preference.sql

-- Add theme_preference column to user_profiles table
-- Allows storing user's theme choice (gradient, dark, light)

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'gradient'
CHECK (theme_preference IN ('gradient', 'dark', 'light'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_theme_preference
ON public.user_profiles(theme_preference);

-- Comment for clarity
COMMENT ON COLUMN public.user_profiles.theme_preference IS 'User theme preference: gradient, dark, or light';
