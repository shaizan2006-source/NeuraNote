"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { validatePassword, getPasswordStrength } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [passErr, setPassErr]     = useState("");
  const [confirmErr, setConfirmErr] = useState("");
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [validLink, setValidLink] = useState(false);

  const strength = getPasswordStrength(password);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — it will
    // auto-exchange it and fire onAuthStateChange with event "PASSWORD_RECOVERY"
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setValidLink(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    const pErr = validatePassword(password);
    const cErr = password !== confirm ? "Passwords do not match." : null;
    setPassErr(pErr || "");
    setConfirmErr(cErr || "");
    if (pErr || cErr) return;

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Could not update password. Please request a new reset link.");
      return;
    }
    setDone(true);
    setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
  }

  if (done) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center" }}>
          <p style={{ fontSize: 48 }}>✅</p>
          <h2 style={{ color: "white" }}>Password updated!</h2>
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  if (!validLink) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center" }}>
          <p style={{ fontSize: 48 }}>⏳</p>
          <h2 style={{ color: "white" }}>Verifying reset link…</h2>
          <p style={{ color: "#9ca3af", fontSize: 13 }}>
            If this takes too long, your link may have expired.{" "}
            <a href="/forgot-password" style={{ color: "#3b82f6" }}>Request a new one</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 36, margin: "0 0 10px" }}>🔒</p>
          <h1 style={styles.title}>Set new password</h1>
          <p style={styles.subtitle}>Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleReset} noValidate>
          <div style={{ marginBottom: 14 }}>
            <label style={styles.label}>New Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPassErr(""); }}
                placeholder="Min. 8 chars, uppercase, number"
                style={{ ...styles.input, paddingRight: 44, borderColor: passErr ? "#ef4444" : "#2d3748" }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : "#1f2937" }} />
                  ))}
                </div>
                {strength.label && <p style={{ margin: 0, fontSize: 11, color: strength.color }}>{strength.label} password</p>}
              </div>
            )}
            {passErr && <p style={styles.fieldErr}>{passErr}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setConfirmErr(""); }}
              placeholder="Repeat password"
              style={{ ...styles.input, borderColor: confirmErr ? "#ef4444" : "#2d3748" }}
            />
            {confirmErr && <p style={styles.fieldErr}>{confirmErr}</p>}
            {confirm && !confirmErr && confirm === password && (
              <p style={{ ...styles.fieldErr, color: "#22c55e" }}>✓ Passwords match</p>
            )}
          </div>

          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Updating…" : "Set New Password"}
          </button>
        </form>
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
  eyeBtn: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: 16 },
  fieldErr: { color: "#f87171", fontSize: 12, margin: "4px 0 0" },
  errorBox: { background: "#2d1515", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 14 },
  primaryBtn: { width: "100%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
};
