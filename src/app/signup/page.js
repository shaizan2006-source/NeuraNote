"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  safeAuthError,
} from "@/lib/auth";
import { captureUtm, getStoredUtm, clearStoredUtm, utmToProfileFields } from "@/lib/utmCapture";
import { AuthSplitLayout, authStyles as styles, Divider, Spinner, GoogleIcon, EyeIcon } from "@/components/auth/AuthShell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SignupPage() {
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailErr, setEmailErr]       = useState("");
  const [passErr, setPassErr]         = useState("");
  const [confirmErr, setConfirmErr]   = useState("");
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const strength = getPasswordStrength(password);

  // Capture UTM params on mount (first-touch attribution)
  useEffect(() => { captureUtm(); }, []);

  const handleEmailBlur  = () => setEmailErr(validateEmail(email) || "");
  const handlePassBlur   = () => setPassErr(validatePassword(password) || "");
  const handleConfirmBlur = () =>
    setConfirmErr(confirm && confirm !== password ? "Passwords do not match." : "");

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = password !== confirm ? "Passwords do not match." : null;

    setEmailErr(eErr || "");
    setPassErr(pErr || "");
    setConfirmErr(cErr || "");
    if (eErr || pErr || cErr) return;

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (authError) {
        setError(safeAuthError(authError));
        setLoading(false);
        return;
      }


      if (data.session) {
        // Persist UTM to profile then go to onboarding
        const utm = getStoredUtm();
        if (utm.utm_source && data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            ...utmToProfileFields(utm),
          }, { onConflict: "id" }).then(() => clearStoredUtm());
        }
        window.location.href = "/onboarding";
      } else {
        setSuccess("Account created! Check your email to confirm, then log in.");
        setLoading(false);
      }
    } catch (err) {
      setError(safeAuthError(err));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    // Store UTM in sessionStorage before redirect — auth callback will pick it up
    captureUtm();
    const utm = getStoredUtm();
    const redirectUrl = new URL(`${window.location.origin}/auth/callback`);
    if (utm.utm_source) redirectUrl.searchParams.set("utm_source", utm.utm_source);
    if (utm.utm_medium) redirectUrl.searchParams.set("utm_medium", utm.utm_medium);
    if (utm.utm_campaign) redirectUrl.searchParams.set("utm_campaign", utm.utm_campaign);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl.toString() },
    });
    if (error) {
      setError(safeAuthError(error));
      setGoogleLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <div>
        {/* Heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>Start your AI study journey — it&apos;s free</p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading || googleLoading}
          style={styles.googleBtn}
        >
          {googleLoading ? <span>Connecting…</span> : <><GoogleIcon /><span>Sign up with Google</span></>}
        </button>

        <Divider />

        {/* Form */}
        <form onSubmit={handleSignup} noValidate>
          {/* Email */}
          <div style={styles.fieldWrap}>
            <label htmlFor="signup-email" style={styles.label}>Email</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }}
              onBlur={handleEmailBlur}
              placeholder="you@gmail.com"
              autoComplete="email"
              style={{ ...styles.input, borderColor: emailErr ? "var(--error)" : "var(--border-strong)" }}
            />
            {emailErr && <p style={styles.fieldErr}>{emailErr}</p>}
          </div>

          {/* Password */}
          <div style={styles.fieldWrap}>
            <label htmlFor="signup-password" style={styles.label}>Password</label>
            <div style={styles.passWrap}>
              <input
                id="signup-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPassErr(""); }}
                onBlur={handlePassBlur}
                placeholder="Min. 8 chars, uppercase, number"
                autoComplete="new-password"
                style={{ ...styles.input, paddingRight: 44, borderColor: passErr ? "var(--error)" : "var(--border-strong)" }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={styles.eyeBtn} aria-label="Toggle password visibility">
                <EyeIcon open={showPass} />
              </button>
            </div>

            {/* Strength meter */}
            {password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength.score ? strength.color : "var(--bg-surface-2)",
                      transition: "background 0.3s",
                    }} />
                  ))}
                </div>
                {strength.label && (
                  <p style={{ margin: 0, fontSize: 11, color: strength.color }}>{strength.label} password</p>
                )}
              </div>
            )}
            {passErr && <p style={styles.fieldErr}>{passErr}</p>}
          </div>

          {/* Confirm password */}
          <div style={styles.fieldWrap}>
            <label htmlFor="signup-confirm" style={styles.label}>Confirm Password</label>
            <div style={styles.passWrap}>
              <input
                id="signup-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setConfirmErr(""); }}
                onBlur={handleConfirmBlur}
                placeholder="Repeat your password"
                autoComplete="new-password"
                style={{ ...styles.input, paddingRight: 44, borderColor: confirmErr ? "var(--error)" : "var(--border-strong)" }}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)} style={styles.eyeBtn} aria-label="Toggle password visibility">
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {confirmErr && <p style={styles.fieldErr}>{confirmErr}</p>}
            {confirm && !confirmErr && confirm === password && (
              <p style={{ ...styles.fieldErr, color: "var(--success)", margin: "4px 0 0" }}>✓ Passwords match</p>
            )}
          </div>

          {/* Password rules hint */}
          <div style={styles.rulesBox}>
            <Rule met={password.length >= 8}    text="At least 8 characters" />
            <Rule met={/[A-Z]/.test(password)}  text="One uppercase letter" />
            <Rule met={/[a-z]/.test(password)}  text="One lowercase letter" />
            <Rule met={/[0-9]/.test(password)}  text="One number" />
          </div>

          {error   && <div style={styles.errorBox}><span style={{ marginRight: 6 }}>⚠️</span>{error}</div>}
          {success && <div style={styles.successBox}><span style={{ marginRight: 6 }}>✅</span>{success}</div>}

          <button
            type="submit"
            disabled={loading || googleLoading}
            style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <><Spinner /> Creating account…</> : "Create Account"}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{" "}
          <a href="/login" style={styles.link}>Log in</a>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

function Rule({ met, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <span style={{ color: met ? "var(--success)" : "var(--text-tertiary)", fontSize: 12 }}>{met ? "✓" : "○"}</span>
      <span style={{ color: met ? "var(--success)" : "var(--text-tertiary)", fontSize: 12 }}>{text}</span>
    </div>
  );
}
