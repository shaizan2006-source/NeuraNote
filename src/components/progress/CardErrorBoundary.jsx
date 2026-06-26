"use client";

import React from "react";

/**
 * Per-card error boundary. If one card throws, render a small placeholder
 * so the rest of the dashboard stays alive.
 */
export default class CardErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
    console.error(`[CardErrorBoundary:${this.props.name || "card"}]`, err, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: this.props.minHeight || 130,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-elevated)",
          border: "1px solid color-mix(in srgb, var(--error) 18%, transparent)",
          borderRadius: 12,
          color: "var(--text-tertiary)",
          fontSize: 12,
        }}
      >
        —
      </div>
    );
  }
}
