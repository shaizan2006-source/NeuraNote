/**
 * lib/askWithDownload.js
 *
 * Drop-in fetch wrapper for your chat UI.
 * Handles both normal answers and file downloads transparently.
 *
 * Usage:
 *   import { askQuestion } from "@/lib/askWithDownload";
 *
 *   const result = await askQuestion({ question, documentId });
 *   // result.answer   — always present (markdown string)
 *   // result.sources  — page references
 *   // result.downloaded — true if a file was auto-downloaded
 *   // result.exportError — set if generation failed but answer is still available
 */

export async function askQuestion({ question, documentId }) {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, documentId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Request failed");
  }

  const contentType = res.headers.get("Content-Type") || "";

  // ── File download response ──────────────────────────────────────────────────
  if (
    contentType.includes("application/pdf") ||
    contentType.includes("wordprocessingml")
  ) {
    const disposition = res.headers.get("Content-Disposition") || "";
    const filename = extractFilename(disposition) || "document";

    // Recover the answer text from the custom header (truncated to 2000 chars)
    const encodedAnswer = res.headers.get("X-Answer") || "";
    const encodedSources = res.headers.get("X-Sources") || "";
    const answer = encodedAnswer ? decodeURIComponent(encodedAnswer) : "";
    const sources = encodedSources
      ? decodeURIComponent(encodedSources).split(", ").filter(Boolean)
      : [];

    // Trigger browser download
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    return { answer, sources, downloaded: true, filename };
  }

  // ── Normal JSON response ────────────────────────────────────────────────────
  const data = await res.json();
  return {
    answer: data.answer || "",
    sources: data.sources || [],
    downloaded: false,
    exportError: data.exportError || null,
  };
}

// Extract filename from Content-Disposition header
function extractFilename(disposition) {
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match ? match[1].trim() : null;
}