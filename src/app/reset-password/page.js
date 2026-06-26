"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { validatePassword, getPasswordStrength } from "@/lib/auth";
import { AuthSplitLayout, authStyles as styles, Spinner, EyeIcon } from "@/components/auth/AuthShell";

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
      <AuthSplitLayout>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 48 }}>✅</p>
          <h1 style={styles.title}>Password updated!</h1>
          <p style={styles.subtitle}>Redirecting to dashboard…</p>
        </div>
      </AuthSplitLayout>
    );
  }

  if (!validLink) {
    return (
      <AuthSplitLayout>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 48 }}>⏳</p>
          <h1 style={styles.title}>Verifying reset link…</h1>
          <p style={styles.subtitle}>
            If this takes too long, your link may have expired.{" "}
            <a href="/forgot-password" style={styles.link}>Request a new one</a>.
          </p>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={styles.title}>Set new password</h1>
          <p style={styles.subtitle}>Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleReset} noValidate>
          <div style={styles.fieldWrap}>
            <label htmlFor="reset-password" style={styles.label}>New Password</label>
            <div style={styles.passWrap}>
              <input
                id="reset-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPassErr(""); }}
                placeholder="Min. 8 chars, uppercase, number"
                style={{ ...styles.input, paddingRight: 44, borderColor: passErr ? "var(--error)" : "var(--border-strong)" }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={styles.eyeBtn} aria-label="Toggle password visibility">
                <EyeIcon open={showPass} />
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : "var(--bg-surface-2)" }} />
                  ))}
                </div>
                {strength.label && <p style={{ margin: 0, fontSize: 11, color: strength.color }}>{strength.label} password</p>}
              </div>
            )}
            {passErr && <p style={styles.fieldErr}>{passErr}</p>}
          </div>

          <div style={styles.fieldWrap}>
            <label htmlFor="reset-confirm" style={styles.label}>Confirm Password</label>
            <input
              id="reset-confirm"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setConfirmErr(""); }}
              placeholder="Repeat password"
              style={{ ...styles.input, borderColor: confirmErr ? "var(--error)" : "var(--border-strong)" }}
            />
            {confirmErr && <p style={styles.fieldErr}>{confirmErr}</p>}
            {confirm && !confirmErr && confirm === password && (
              <p style={{ ...styles.fieldErr, color: "var(--success)" }}>✓ Passwords match</p>
            )}
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span style={{ marginRight: 6 }}>⚠️</span>{error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Spinner /> Updating…</> : "Set New Password"}
          </button>
        </form>
      </div>
    </AuthSplitLayout>
  );
}
