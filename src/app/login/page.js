"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  validateEmail,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  safeAuthError,
} from "@/lib/auth";
import { AuthSplitLayout, authStyles as styles, Divider, Spinner, GoogleIcon, EyeIcon } from "@/components/auth/AuthShell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const RL_KEY = "login";

export default function LoginPage() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [emailErr, setEmailErr]     = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Inline email validation on blur ──────────────────────
  const handleEmailBlur = () => {
    const err = validateEmail(email);
    setEmailErr(err || "");
  };

  // ── Email + password login ────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const emailError = validateEmail(email);
    if (emailError) { setEmailErr(emailError); return; }

    const { blocked, message } = checkRateLimit(RL_KEY);
    if (blocked) { setError(message); return; }

    setLoading(true);

    try {
      const loginPromise = supabase.auth.signInWithPassword({ email: email.trim(), password });
      const timeout      = new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Login timed out.")), 10000)
      );

      const { data, error: authError } = await Promise.race([loginPromise, timeout]);

      if (authError) {
        recordFailedAttempt(RL_KEY);
        setError(safeAuthError(authError));
        setLoading(false);
        return;
      }

      clearRateLimit(RL_KEY);
      window.location.href = "/dashboard";
    } catch (err) {
      recordFailedAttempt(RL_KEY);
      setError(safeAuthError(err));
      setLoading(false);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────
  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(safeAuthError(error));
      setGoogleLoading(false);
    }
    // On success, Supabase redirects — no need to handle here
  }

  return (
    <AuthSplitLayout>
      <div>
        {/* Heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={styles.title}>Welcome back</h1>
          <p style={styles.subtitle}>Sign in to continue to Ask My Notes</p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          style={styles.googleBtn}
        >
          {googleLoading ? (
            <span>Connecting…</span>
          ) : (
            <>
              <GoogleIcon />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <Divider />

        {/* Form */}
        <form onSubmit={handleLogin} noValidate>
          {/* Email */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }}
              onBlur={handleEmailBlur}
              placeholder="you@gmail.com"
              autoComplete="email"
              required
              style={{ ...styles.input, borderColor: emailErr ? "var(--error)" : "var(--border-strong)" }}
            />
            {emailErr && <p style={styles.fieldErr}>{emailErr}</p>}
          </div>

          {/* Password */}
          <div style={styles.fieldWrap}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={styles.label}>Password</label>
              <a href="/forgot-password" style={styles.forgotLink}>Forgot password?</a>
            </div>
            <div style={styles.passWrap}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
                style={{ ...styles.input, paddingRight: 44, marginBottom: 0, borderColor: "var(--border-strong)" }}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                style={styles.eyeBtn}
                aria-label="Toggle password visibility"
              >
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <span style={{ marginRight: 6 }}>⚠️</span>{error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <><Spinner /> Logging in…</> : "Login"}
          </button>
        </form>

        <p style={styles.switchText}>
          Don&apos;t have an account?{" "}
          <a href="/signup" style={styles.link}>Create one free</a>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
