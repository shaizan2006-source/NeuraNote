// src/components/support/TicketForm.jsx
"use client";
import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const CATEGORIES = [
  { value: "bug",             label: "Bug" },
  { value: "billing",         label: "Billing" },
  { value: "feature_request", label: "Feature request" },
  { value: "account",         label: "Account" },
  { value: "other",           label: "Other" },
];

const fieldStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9,
  background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)",
  color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "inherit",
};

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
};

export default function TicketForm({ token, userId, onSubmitted }) {
  const [category, setCategory] = useState("bug");
  const [subject,  setSubject]  = useState("");
  const [message,  setMessage]  = useState("");
  const [file,     setFile]     = useState(null);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState(null);
  const fileRef = useRef(null);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Screenshot must be an image."); return; }
    if (f.size > 5 * 1024 * 1024)     { setError("Screenshot must be under 5 MB."); return; }
    setError(null);
    setFile(f);
  }

  async function handleSend() {
    if (!subject.trim() || !message.trim()) return;
    setSending(true); setError(null);
    try {
      let screenshot_url = null;
      if (file && userId) {
        const ext  = file.name.split(".").pop() || "png";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("support-screenshots")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw new Error(`Screenshot upload failed: ${upErr.message}`);
        screenshot_url = path;
      }

      const res = await fetch("/api/support", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ subject: subject.trim(), message: message.trim(), category, screenshot_url }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSent(true);
      onSubmitted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Request sent</p>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-tertiary)" }}>
          We&apos;ll get back to you within 24 hours. Track its status below.
        </p>
        <button
          onClick={() => { setSent(false); setSubject(""); setMessage(""); setFile(null); }}
          style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: "0 0 180px" }}>
          <label style={labelStyle}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={fieldStyle}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Short summary" style={fieldStyle} maxLength={100} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder="Describe your issue or idea…"
          style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      </div>

      <div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        {file ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
            📎 {file.name}{" "}
            <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              remove
            </button>
          </p>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            + Attach a screenshot (optional)
          </button>
        )}
      </div>

      {error && <p style={{ margin: 0, fontSize: 12, color: "var(--error)" }}>{error}</p>}

      <div>
        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !message.trim()}
          style={{
            padding: "10px 22px", borderRadius: 10, border: "none", background: "var(--accent-grad)",
            color: "var(--bg-base)", fontWeight: 600, fontSize: 14, fontFamily: "inherit",
            cursor: sending || !subject.trim() || !message.trim() ? "not-allowed" : "pointer",
            opacity: sending || !subject.trim() || !message.trim() ? 0.5 : 1, transition: "opacity 0.15s",
          }}
        >
          {sending ? "Sending…" : "Send request"}
        </button>
      </div>
    </div>
  );
}
