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
    console.log("LOGIN ATTEMPT:", email);

    try {
      const loginPromise = supabase.auth.signInWithPassword({ email: email.trim(), password });
      const timeout      = new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Login timed out.")), 10000)
      );

      const { data, error: authError } = await Promise.race([loginPromise, timeout]);

      if (authError) {
        recordFailedAttempt(RL_KEY);
        console.log("LOGIN ERROR:", authError.message);
        setError(safeAuthError(authError));
        setLoading(false);
        return;
      }

      clearRateLimit(RL_KEY);
      console.log("LOGIN SUCCESS:", data.user?.email);
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
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={styles.logo}>📖</div>
          <h1 style={styles.title}>Welcome back</h1>
          <p style={styles.subtitle}>Sign in to Ask My Notes</p>
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
              style={{ ...styles.input, borderColor: emailErr ? "#ef4444" : "#2d3748" }}
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
                style={{ ...styles.input, paddingRight: 44, marginBottom: 0, borderColor: "#2d3748" }}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                style={styles.eyeBtn}
                aria-label="Toggle password visibility"
              >
                {showPass ? "🙈" : "👁️"}
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
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
      <span style={{ color: "#4b5563", fontSize: 12 }}>or</span>
      <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 14,
      height: 14,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "white",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      marginRight: 8,
      verticalAlign: "middle",
    }} />
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 20,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
  },
  logo: {
    fontSize: 36,
    marginBottom: 10,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 6px",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    margin: 0,
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: 10,
    padding: "12px 16px",
    color: "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "#1a2332",
    border: "1.5px solid #2d3748",
    borderRadius: 9,
    padding: "11px 14px",
    color: "white",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    marginBottom: 0,
  },
  passWrap: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    lineHeight: 1,
  },
  forgotLink: {
    color: "#3b82f6",
    fontSize: 12,
    textDecoration: "none",
  },
  fieldErr: {
    color: "#f87171",
    fontSize: 12,
    margin: "4px 0 0",
  },
  errorBox: {
    background: "#2d1515",
    border: "1px solid #7f1d1d",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#fca5a5",
    fontSize: 13,
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
  },
  primaryBtn: {
    width: "100%",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s",
    marginTop: 4,
  },
  switchText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    marginTop: 20,
  },
  link: {
    color: "#3b82f6",
    fontWeight: 600,
    textDecoration: "none",
  },
};
