"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { validateEmail } from "@/lib/auth";

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
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>📬</p>
            <h2 style={{ color: "white", margin: "0 0 10px" }}>Check your inbox</h2>
            <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6 }}>
              If <strong style={{ color: "white" }}>{email}</strong> is registered, you&apos;ll receive a password reset link shortly.
            </p>
            <p style={{ color: "#6b7280", fontSize: 12, marginTop: 16 }}>
              Didn&apos;t get it? Check spam, or{" "}
              <button
                onClick={() => setSent(false)}
                style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 12 }}
              >
                try again
              </button>.
            </p>
            <a href="/login" style={{ display: "block", marginTop: 24, color: "#3b82f6", fontSize: 14 }}>
              ← Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 36, margin: "0 0 10px" }}>🔑</p>
          <h1 style={styles.title}>Forgot password?</h1>
          <p style={styles.subtitle}>Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }}
              onBlur={() => setEmailErr(validateEmail(email) || "")}
              placeholder="you@gmail.com"
              autoComplete="email"
              style={{ ...styles.input, borderColor: emailErr ? "#ef4444" : "#2d3748" }}
            />
            {emailErr && <p style={styles.fieldErr}>{emailErr}</p>}
          </div>

          {error && (
            <div style={styles.errorBox}>⚠️ {error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/login" style={{ color: "#6b7280", fontSize: 14 }}>← Back to Login</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Arial" },
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: "36px 32px", width: "100%", maxWidth: 400, boxShadow: "0 24px 48px rgba(0,0,0,0.5)" },
  title: { color: "white", fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
  subtitle: { color: "#9ca3af", fontSize: 14, margin: 0 },
  label: { display: "block", color: "#9ca3af", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", background: "#1a2332", border: "1.5px solid #2d3748", borderRadius: 9, padding: "11px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" },
  fieldErr: { color: "#f87171", fontSize: 12, margin: "4px 0 0" },
  errorBox: { background: "#2d1515", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 14 },
  primaryBtn: { width: "100%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
};
