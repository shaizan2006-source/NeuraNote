// src/components/settings/AccountSection.jsx
"use client";
import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { SettingsCard, SettingsGroup, SettingsInput, GoldButton } from "./SettingsShell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function AccountSection({ user }) {
  const [name,      setName]      = useState(user?.user_metadata?.full_name ?? "");
  const [username,  setUsername]  = useState(user?.user_metadata?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveErr,   setSaveErr]   = useState(null);
  const [pwSent,    setPwSent]    = useState(false);
  const [pwErr,     setPwErr]     = useState(null);
  const [email,     setEmail]     = useState(user?.email ?? "");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailErr,  setEmailErr]  = useState(null);
  const [loAllBusy, setLoAllBusy] = useState(false);
  const [loAllErr,  setLoAllErr]  = useState(null);
  const fileRef = useRef(null);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveErr("Photo must be under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true); setSaveErr(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim(), username: username.trim(), avatar_url: avatarUrl },
      });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEmailChange() {
    setEmailBusy(true); setEmailErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      setEmailSent(true);
    } catch (err) {
      setEmailErr(err.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleLogoutAll() {
    setLoAllBusy(true); setLoAllErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/settings/logout-all", {
        method:  "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to sign out sessions");
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      setLoAllErr(err.message);
      setLoAllBusy(false);
    }
  }

  async function handlePasswordReset() {
    setPwErr(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      setPwSent(true);
    } catch (err) {
      setPwErr(err.message);
    }
  }

  const initials = (name || user?.email || "?")[0].toUpperCase();

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Your Account</h1>

      <SettingsGroup label="Profile">
        <SettingsCard>
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width: 72, height: 72, borderRadius: "50%", background: avatarUrl ? "transparent" : "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "var(--bg-base)", cursor: "pointer", overflow: "hidden", border: "2px solid var(--border-hairline)", flexShrink: 0, opacity: uploading ? 0.5 : 1, transition: "opacity 0.2s" }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Profile photo</p>
              <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                {uploading ? "Uploading…" : "Change photo"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SettingsInput label="Display name"  value={name}     onChange={setName}     placeholder="Your name" />
            <SettingsInput label="Username"       value={username} onChange={setUsername} placeholder="@handle" />
            <div>
              <SettingsInput label="Email" value={email} onChange={v => { setEmail(v); setEmailSent(false); setEmailErr(null); }} placeholder="you@example.com" />
              {emailSent ? (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--success)" }}>
                  ✓ Confirmation link sent to {email.trim()} — your email updates after you confirm.
                </p>
              ) : email.trim() && email.trim() !== (user?.email ?? "") ? (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <GoldButton outline onClick={handleEmailChange} disabled={emailBusy}>
                    {emailBusy ? "Sending…" : "Update email"}
                  </GoldButton>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>We&apos;ll send a confirmation link first.</span>
                </div>
              ) : null}
              {emailErr && <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--error)" }}>{emailErr}</p>}
            </div>
          </div>

          {saveErr && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--error)" }}>{saveErr}</p>}

          <div style={{ marginTop: 20 }}>
            <GoldButton onClick={handleSave} disabled={saving}>
              {saved ? "✓ Saved" : saving ? "Saving…" : "Save changes"}
            </GoldButton>
          </div>
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="Password">
        <SettingsCard>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Change your password</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-tertiary)" }}>We&apos;ll send a reset link to {user?.email}.</p>
          {pwSent
            ? <p style={{ fontSize: 13, color: "var(--success)", margin: 0 }}>✓ Check your inbox — link expires in 1 hour.</p>
            : <>
                {pwErr && <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--error)" }}>{pwErr}</p>}
                <GoldButton outline onClick={handlePasswordReset}>Send reset link</GoldButton>
              </>}
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="Sessions">
        <SettingsCard>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Log out everywhere</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-tertiary)" }}>
            Signs you out on every device, including this one. Use this if you left yourself logged in somewhere.
          </p>
          {loAllErr && <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--error)" }}>{loAllErr}</p>}
          <GoldButton outline onClick={handleLogoutAll} disabled={loAllBusy}>
            {loAllBusy ? "Signing out…" : "Log out of all devices"}
          </GoldButton>
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
