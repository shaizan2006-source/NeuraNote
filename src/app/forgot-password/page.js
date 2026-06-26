"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { validateEmail } from "@/lib/auth";
import { AuthSplitLayout, authStyles as styles } from "@/components/auth/AuthShell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const err = validateEmail(email);
    if (err) { setEmailErr(err); return; }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setLoading(false);

    if (resetError) {
      // Generic message — don't reveal if email exists
      setError("Could not send reset email. Please try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthSplitLayout>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 48, margin: "0 0 12px" }}>📬</p>
          <h2 style={styles.title}>Check your inbox</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            If <strong style={{ color: "var(--text-primary)" }}>{email}</strong> is registered, you&apos;ll receive a password reset link shortly.
          </p>
          <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 16 }}>
            Didn&apos;t get it? Check spam, or{" "}
            <button
              onClick={() => setSent(false)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}
            >
              try again
            </button>.
          </p>
          <a href="/login" style={{ display: "block", marginTop: 24, color: "var(--text-tertiary)", fontSize: 14 }}>
            ← Back to Login
          </a>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <div>
        <div style={{ marginBottom: 28 }}>
          <h1 style={styles.title}>Forgot password?</h1>
          <p style={styles.subtitle}>Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.fieldWrap}>
            <label htmlFor="forgot-email" style={styles.label}>Email address</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }}
              onBlur={() => setEmailErr(validateEmail(email) || "")}
              placeholder="you@gmail.com"
              autoComplete="email"
              style={{ ...styles.input, borderColor: emailErr ? "var(--error)" : "var(--border-strong)" }}
            />
            {emailErr && <p style={styles.fieldErr}>{emailErr}</p>}
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span style={{ marginRight: 6 }}>⚠️</span>{error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <p style={styles.switchText}>
          <a href="/login" style={styles.link}>← Back to Login</a>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
