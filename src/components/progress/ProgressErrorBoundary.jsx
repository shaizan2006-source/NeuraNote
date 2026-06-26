"use client";

import React from "react";

/**
 * Region-level error boundary. Wraps the entire ProgressLayout.
 * On crash: shows a recoverable fallback with a reload button.
 * Logs to console; also fires a learning_event so we can monitor crash rates.
 */
export default class ProgressErrorBoundary extends React.Component {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || "Unknown error" };
  }

  componentDidCatch(err, info) {
    console.error("[ProgressErrorBoundary]", err, info?.componentStack);
    try {
      // Best-effort telemetry; do not fail render if this throws.
      if (typeof window !== "undefined" && navigator?.sendBeacon) {
        const body = new Blob(
          [JSON.stringify({
            events: [{
              event_type: "progress_render_error",
              surface: "progress",
              metadata: {
                component: "ProgressLayout",
                message: err?.message,
                stack: info?.componentStack?.slice(0, 800),
              },
            }],
          })],
          { type: "application/json" }
        );
        navigator.sendBeacon("/api/events", body);
      }
    } catch {}
  }

  reload = () => {
    this.setState({ hasError: false, message: "" });
    if (typeof this.props.onReload === "function") {
      try { this.props.onReload(); } catch {}
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          gap: 12,
          textAlign: "center",
          background: "var(--bg-elevated)",
          border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)",
          borderRadius: 12,
        }}
      >
        <span style={{ fontSize: 24 }}>⚠</span>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Something went wrong loading this section.
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", maxWidth: 320 }}>
          {this.state.message}
        </p>
        <button
          onClick={this.reload}
          style={{
            marginTop: 4,
            padding: "8px 18px",
            background: "var(--accent-grad)",
            border: "none",
            borderRadius: 8,
            color: "var(--bg-base)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
