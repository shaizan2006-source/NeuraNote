// src/components/settings/PrivacySection.jsx
"use client";
import { useState } from "react";
import { SettingsCard, SettingsGroup, GoldButton } from "./SettingsShell";

export default function PrivacySection({ token, onDeleted }) {
  const [exporting,   setExporting]   = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting,    setDeleting]    = useState(false);
  const [deleteErr,   setDeleteErr]   = useState(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "askmynotes-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (deleteInput !== "DELETE") return;
    setDeleting(true); setDeleteErr(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      onDeleted(); // parent signs out + redirects
    } catch (err) {
      setDeleteErr(err.message);
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Privacy &amp; Data</h1>

      <SettingsGroup label="Your data">
        <SettingsCard>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Export everything</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-tertiary)" }}>Download a copy of your notes, conversations, and progress as JSON.</p>
          <GoldButton outline onClick={handleExport} disabled={exporting}>
            {exporting ? "Preparing…" : "Download my data"}
          </GoldButton>
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="Danger zone">
        <SettingsCard danger>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Delete my account</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-tertiary)" }}>
            This permanently deletes all your notes, history, and progress. This cannot be undone.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder='Type DELETE to confirm'
              style={{ padding: "10px 12px", borderRadius: 9, background: "var(--bg-surface-2)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)", color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
            />
            {deleteErr && <p style={{ margin: 0, fontSize: 12, color: "var(--error)" }}>{deleteErr}</p>}
            <GoldButton danger onClick={handleDelete} disabled={deleteInput !== "DELETE" || deleting}>
              {deleting ? "Deleting…" : "Delete account"}
            </GoldButton>
          </div>
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
