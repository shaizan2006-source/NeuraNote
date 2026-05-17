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
          background: "#111111",
          border: "1px solid rgba(239,68,68,0.18)",
          borderRadius: 12,
          color: "#52525b",
          fontSize: 12,
        }}
      >
        —
      </div>
    );
  }
}
