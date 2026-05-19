import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/serverAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Handles:
 * 1. Google OAuth redirect  → exchanges code for session → onboarding/dashboard
 * 2. Email confirmation link → verifies token → onboarding
 *
 * UTM tracking: signup page appends utm_* params to the redirectTo URL so they
 * survive the OAuth round-trip. We persist them to profiles here for new users.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const token = searchParams.get("token");
  const type  = searchParams.get("type");
  const next  = searchParams.get("next") || "/dashboard";

  // UTM params forwarded from the signup page via redirectTo
  const utmSource   = searchParams.get("utm_source")   ?? null;
  const utmMedium   = searchParams.get("utm_medium")   ?? null;
  const utmCampaign = searchParams.get("utm_campaign") ?? null;

  // ── OAuth code exchange ──────────────────────────────────
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth callback error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    // Persist UTM to profile for new OAuth users (upsert is safe for existing users)
    if (utmSource && data.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: data.user.id,
        referral_source: utmSource.slice(0, 200),
        utm_medium:      utmMedium?.slice(0, 200)   ?? null,
        utm_campaign:    utmCampaign?.slice(0, 200) ?? null,
        referrer_url:    request.headers.get("referer")?.slice(0, 500) ?? null,
      }, { onConflict: "id" }).catch(err => {
        console.error("[auth/callback] UTM persist error:", err.message);
      });
    }

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

  return NextResponse.redirect(`${origin}/login`);
}
