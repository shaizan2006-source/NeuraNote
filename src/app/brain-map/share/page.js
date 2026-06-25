"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BrainMapSharePage() {
  const router = useRouter();
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("sb_access_token") ?? "";
    setToken(t);
    if (!t) { setLoading(false); return; }

    fetch("/api/brain-map/snapshot", { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.blob())
      .then(blob => setBlobUrl(URL.createObjectURL(blob)))
      .catch(() => null)
      .finally(() => setLoading(false));

    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, []);

  async function handleDownload() {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "brain-map-snapshot.png";
    a.click();
  }

  async function handleShare() {
    if (!blobUrl) return;
    setSharing(true);
    try {
      const res = await fetch(blobUrl);
      const blob = await res.blob();
      const file = new File([blob], "brain-map-snapshot.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Brain Map", text: "Check out my study mastery map on Ask My Notes!" });
      } else {
        // Fallback: download
        handleDownload();
      }
    } catch {
      handleDownload();
    } finally {
      setSharing(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "0 0 60px" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-hairline)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}>←</button>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Share Brain Map</h1>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 20 }}>
          Share your mastery snapshot with friends, teachers, or your WhatsApp study group.
        </p>

        {/* Preview — loaded via authenticated fetch, shown as blob URL */}
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-hairline)", marginBottom: 20, aspectRatio: "1200/630", position: "relative", background: "var(--bg-elevated)" }}>
          {blobUrl ? (
            <img src={blobUrl} alt="Brain Map Snapshot" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              {loading ? "Generating snapshot…" : "Could not load snapshot"}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleShare}
            disabled={!blobUrl || sharing}
            style={{ flex: 1, background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "12px", fontWeight: 600, cursor: blobUrl ? "pointer" : "default", fontSize: 14, opacity: blobUrl ? 1 : 0.5 }}
          >
            {sharing ? "Sharing…" : "Share Image"}
          </button>
          <button
            onClick={handleDownload}
            disabled={!blobUrl}
            style={{ flex: 1, background: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "none", borderRadius: 8, padding: "12px", fontWeight: 600, cursor: blobUrl ? "pointer" : "default", fontSize: 14, opacity: blobUrl ? 1 : 0.5 }}
          >
            Download PNG
          </button>
        </div>

        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-tertiary)" }}>
          "Share Image" uses your device's native share sheet (WhatsApp, Instagram, etc.). Falls back to download if sharing is not supported.
        </p>
      </div>
    </div>
  );
}
