"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Helpers ───────────────────────────────────────────────────────────
function getInitials(name, email) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function getDisplayName(user) {
  return (
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User"
  );
}

function getUsername(user) {
  return (
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    ""
  );
}

function getPlan(user) {
  return user?.user_metadata?.plan || "Free";
}

// ── Avatar circle ─────────────────────────────────────────────────────
function Avatar({ user, avatarUrl, size = 34, fontSize = 13 }) {
  const initials = getInitials(getDisplayName(user), user?.email);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: avatarUrl ? "transparent" : "linear-gradient(135deg, #16a34a, #15803d)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize, fontWeight: 700, color: "#fff", overflow: "hidden",
      border: "2px solid rgba(255,255,255,0.12)",
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials
      }
    </div>
  );
}

// ── Icon set ──────────────────────────────────────────────────────────
function IconPlus() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconHelp() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconPencil() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

// ── Dropdown menu item ────────────────────────────────────────────────
function DropdownItem({ icon, label, onClick, danger = false, badge }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", textAlign: "left", padding: "8px 12px",
        background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none", borderRadius: 8, cursor: "pointer",
        color: danger ? (hovered ? "#fca5a5" : "#f87171") : (hovered ? "#f4f4f5" : "#a1a1aa"),
        fontSize: 13, transition: "background 120ms, color 120ms",
      }}
    >
      <span style={{ flexShrink: 0, display: "flex", opacity: 0.8 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
          background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        }}>{badge}</span>
      )}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />;
}

// ════════════════════════════════════════════════════════════════
// PROFILE MODAL
// ════════════════════════════════════════════════════════════════
function ProfileModal({ user, avatarUrl, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(getDisplayName(user));
  const [username, setUsername]       = useState(getUsername(user));
  const [localAvatar, setLocalAvatar] = useState(avatarUrl || null);
  const [avatarFile, setAvatarFile]   = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const fileInputRef                  = useRef(null);
  const overlayRef                    = useRef(null);

  // Close on ESC
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close on overlay click
  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setLocalAvatar(url);
  }

  async function handleSave() {
    if (!displayName.trim()) { setError("Display name cannot be empty."); return; }
    setSaving(true);
    setError("");
    try {
      let newAvatarUrl = avatarUrl;

      // Upload avatar if a new file was picked
      if (avatarFile) {
        const ext  = avatarFile.name.split(".").pop();
        const path = `avatars/${user.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          newAvatarUrl = urlData?.publicUrl || null;
        }
      }

      // Update Supabase auth user_metadata
      const { error: updateErr } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          username:     username.trim(),
          avatar_url:   newAvatarUrl,
        },
      });
      if (updateErr) throw updateErr;

      onSaved({ displayName: displayName.trim(), username: username.trim(), avatarUrl: newAvatarUrl });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const initials = getInitials(displayName, user?.email);

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        onClick={handleOverlayClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            background: "#1C1C1F",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18, width: 400, maxWidth: "calc(100vw - 32px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px 0",
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>Profile</span>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none", color: "#52525b",
                cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4,
              }}
            >✕</button>
          </div>

          <div style={{ padding: "20px 24px 24px" }}>
            {/* Avatar section */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: localAvatar ? "transparent" : "linear-gradient(135deg, #16a34a, #15803d)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, fontWeight: 700, color: "#fff",
                  overflow: "hidden",
                  border: "3px solid rgba(255,255,255,0.12)",
                }}>
                  {localAvatar
                    ? <img src={localAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials
                  }
                </div>

                {/* Edit pencil overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: "50%",
                    background: "#2A2A2E", border: "2px solid rgba(255,255,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#a1a1aa",
                    transition: "background 150ms, color 150ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#3A3A3E"; e.currentTarget.style.color = "#f4f4f5"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#2A2A2E"; e.currentTarget.style.color = "#a1a1aa"; }}
                  title="Change avatar"
                >
                  <IconPencil />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={handleAvatarPick}
                />
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field
                label="Display Name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Your name"
              />
              <Field
                label="Username"
                value={username}
                onChange={setUsername}
                placeholder="username"
              />
            </div>

            {/* Helper text */}
            <p style={{
              fontSize: 11, color: "#52525b", margin: "14px 0 0",
              lineHeight: 1.5,
            }}>
              Your profile helps people recognise you. Your name and username are also used in the app.
            </p>

            {error && (
              <p style={{ fontSize: 11, color: "#f87171", margin: "10px 0 0" }}>{error}</p>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent", color: "#a1a1aa", fontSize: 13, cursor: "pointer",
                  transition: "background 150ms",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "none",
                  background: saving ? "var(--accent-dim)" : "var(--accent)",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 150ms",
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "var(--accent-bright)"; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "var(--accent)"; }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "9px 12px", borderRadius: 8,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${focused ? "color-mix(in srgb, var(--accent) 50%, transparent)" : "rgba(255,255,255,0.1)"}`,
          color: "#f4f4f5", fontSize: 13, outline: "none",
          transition: "border-color 150ms",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ACCOUNT DROPDOWN
// ════════════════════════════════════════════════════════════════
function AccountDropdown({ user, avatarUrl, anchorRect, onClose, onOpenProfile }) {
  const router   = useRouter();
  const menuRef  = useRef(null);
  const name     = getDisplayName(user);
  const plan     = getPlan(user);

  // Outside-click to close
  useEffect(() => {
    function onMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    }
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Position the card to the top-right of the anchor element
  const right = anchorRect ? window.innerWidth - anchorRect.right : 20;
  const top   = anchorRect ? anchorRect.bottom + 8 : 60;

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -6 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        position: "fixed", top, right,
        width: 240, zIndex: 9000,
        background: "#1C1C1F",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        boxShadow: "0 16px 60px rgba(0,0,0,0.65)",
        padding: "8px",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* User info header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 10px 12px",
      }}>
        <Avatar user={user} avatarUrl={avatarUrl} size={40} fontSize={15} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#f4f4f5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>{plan}</p>
        </div>
        <span style={{ marginLeft: "auto", color: "#3f3f46", flexShrink: 0 }}><IconChevron /></span>
      </div>

      <Divider />

      {/* Add account */}
      <DropdownItem
        icon={<IconPlus />}
        label="Add another account"
        onClick={() => { onClose(); router.push("/login"); }}
      />

      <Divider />

      {/* Upgrade */}
      <DropdownItem
        icon={<IconStar />}
        label="Upgrade plan"
        badge={plan === "Free" ? "Pro" : undefined}
        onClick={() => { onClose(); router.push("/pricing"); }}
      />

      {/* Profile */}
      <DropdownItem
        icon={<IconUser />}
        label="Profile"
        onClick={() => { onClose(); onOpenProfile(); }}
      />

      {/* Settings */}
      <DropdownItem
        icon={<IconSettings />}
        label="Settings"
        onClick={() => { onClose(); router.push("/settings"); }}
      />

      {/* Help */}
      <DropdownItem
        icon={<IconHelp />}
        label="Help"
        onClick={() => { onClose(); router.push("/settings?section=support"); }}
      />

      <Divider />

      {/* Log out */}
      <DropdownItem
        icon={<IconLogout />}
        label="Log out"
        danger
        onClick={handleLogout}
      />
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
// USER PROFILE BUTTON (top bar trigger)
// ════════════════════════════════════════════════════════════════
export default function UserProfileButton({ user }) {
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [profileOpen,  setProfileOpen]    = useState(false);
  const [anchorRect,   setAnchorRect]     = useState(null);
  const [avatarUrl,    setAvatarUrl]      = useState(
    () => user?.user_metadata?.avatar_url || null
  );
  const [displayName,  setDisplayName]    = useState(() => getDisplayName(user));
  const buttonRef = useRef(null);

  // Keep local state in sync if user prop changes
  useEffect(() => {
    setAvatarUrl(user?.user_metadata?.avatar_url || null);
    setDisplayName(getDisplayName(user));
  }, [user]);

  const name = displayName;
  const plan = getPlan(user);

  function handleButtonClick() {
    if (!dropdownOpen) {
      const rect = buttonRef.current?.getBoundingClientRect();
      setAnchorRect(rect || null);
    }
    setDropdownOpen(o => !o);
  }

  const handleSaved = useCallback(({ displayName: dn, username, avatarUrl: av }) => {
    if (dn) setDisplayName(dn);
    if (av !== undefined) setAvatarUrl(av);
  }, []);

  if (!user) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: dropdownOpen ? "rgba(255,255,255,0.07)" : "transparent",
          border: "none",
          borderRadius: 10, padding: "5px 10px 5px 6px",
          cursor: "pointer", transition: "background 150ms",
        }}
        onMouseEnter={e => {
          if (!dropdownOpen) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        }}
        onMouseLeave={e => {
          if (!dropdownOpen) e.currentTarget.style.background = "transparent";
        }}
      >
        <Avatar user={user} avatarUrl={avatarUrl} size={28} fontSize={11} />
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#f4f4f5", lineHeight: 1.2, whiteSpace: "nowrap" }}>
            {name}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: "#52525b", lineHeight: 1.2 }}>{plan}</p>
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {dropdownOpen && (
          <AccountDropdown
            user={user}
            avatarUrl={avatarUrl}
            anchorRect={anchorRect}
            onClose={() => setDropdownOpen(false)}
            onOpenProfile={() => setProfileOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Profile modal */}
      <AnimatePresence>
        {profileOpen && (
          <ProfileModal
            user={user}
            avatarUrl={avatarUrl}
            onClose={() => setProfileOpen(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </>
  );
}
