"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  safeAuthError,
} from "@/lib/auth";

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
    console.log("SIGNUP ATTEMPT:", email);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (authError) {
        console.log("SIGNUP ERROR:", authError.message);
        setError(safeAuthError(authError));
        setLoading(false);
        return;
      }

      console.log("SIGNUP SUCCESS:", data.user?.email);

      if (data.session) {
        // Email confirmation disabled — logged in immediately
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(safeAuthError(error));
      setGoogleLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📖</div>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>Start your AI study journey — it&apos;s free</p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading || googleLoading}
          style={styles.googleBtn}
        >
          {googleLoading ? "Connecting…" : <><GoogleIcon /><span>Sign up with Google</span></>}
        </button>

        <Divider />

        {/* Form */}
        <form onSubmit={handleSignup} noValidate>
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
              style={{ ...styles.input, borderColor: emailErr ? "#ef4444" : "#2d3748" }}
            />
            {emailErr && <p style={styles.fieldErr}>{emailErr}</p>}
          </div>

          {/* Password */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPassErr(""); }}
                onBlur={handlePassBlur}
                placeholder="Min. 8 chars, uppercase, number"
                autoComplete="new-password"
                style={{ ...styles.input, paddingRight: 44, borderColor: passErr ? "#ef4444" : "#2d3748" }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Strength meter */}
            {password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength.score ? strength.color : "#1f2937",
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
            <label style={styles.label}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setConfirmErr(""); }}
                onBlur={handleConfirmBlur}
                placeholder="Repeat your password"
                autoComplete="new-password"
                style={{ ...styles.input, paddingRight: 44, borderColor: confirmErr ? "#ef4444" : "#2d3748" }}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)} style={styles.eyeBtn}>
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {confirmErr && <p style={styles.fieldErr}>{confirmErr}</p>}
            {confirm && !confirmErr && confirm === password && (
              <p style={{ ...styles.fieldErr, color: "#22c55e", margin: "4px 0 0" }}>✓ Passwords match</p>
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
    </div>
  );
}

function Rule({ met, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <span style={{ color: met ? "#22c55e" : "#4b5563", fontSize: 12 }}>{met ? "✓" : "○"}</span>
      <span style={{ color: met ? "#86efac" : "#6b7280", fontSize: 12 }}>{text}</span>
    </div>
  );
}

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
      display: "inline-block", width: 14, height: 14,
      border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
      marginRight: 8, verticalAlign: "middle",
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

const styles = {
  page: { minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Arial, sans-serif" },
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: "36px 32px", width: "100%", maxWidth: 420, boxShadow: "0 24px 48px rgba(0,0,0,0.5)" },
  title: { color: "white", fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
  subtitle: { color: "#9ca3af", fontSize: 14, margin: 0 },
  googleBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#1f2937", border: "1px solid #374151", borderRadius: 10, padding: "12px 16px", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  fieldWrap: { marginBottom: 14 },
  label: { display: "block", color: "#9ca3af", fontSize: 13, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", background: "#1a2332", border: "1.5px solid #2d3748", borderRadius: 9, padding: "11px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" },
  eyeBtn: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: 16 },
  fieldErr: { color: "#f87171", fontSize: 12, margin: "4px 0 0" },
  rulesBox: { background: "#0d1117", borderRadius: 8, padding: "10px 12px", marginBottom: 14 },
  errorBox: { background: "#2d1515", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center" },
  successBox: { background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "10px 14px", color: "#86efac", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center" },
  primaryBtn: { width: "100%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 },
  switchText: { textAlign: "center", color: "#6b7280", fontSize: 14, marginTop: 20 },
  link: { color: "#3b82f6", fontWeight: 600, textDecoration: "none" },
};
