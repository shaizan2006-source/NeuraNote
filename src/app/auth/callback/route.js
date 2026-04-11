import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Handles:
 * 1. Google OAuth redirect  → exchanges code for session → dashboard
 * 2. Email confirmation link → verifies token → dashboard
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const token = searchParams.get("token");
  const type  = searchParams.get("type");   // "signup" | "recovery" | "email_change"
  const next  = searchParams.get("next") || "/dashboard";

  // ── OAuth code exchange ──────────────────────────────────
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth callback error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    // New user — check onboarding
    const onboardingDone = data.user?.user_metadata?.onboarding_completed;
    const dest = onboardingDone ? next : "/onboarding";
    return NextResponse.redirect(`${origin}${dest}`);
  }

  // ── Email verification / password recovery token ─────────
  if (token && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type });
    if (error) {
      console.error("OTP verify error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=link_expired`);
    }

    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/reset-password`);
    }
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // Fallback
  return NextResponse.redirect(`${origin}/login`);
}
