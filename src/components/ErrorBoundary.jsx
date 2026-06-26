"use client";

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "var(--bg-surface)",
            border:
              "1px solid color-mix(in srgb, var(--error) 20%, transparent)",
            borderRadius: 12,
            padding: 20,
            marginTop: 16,
            color: "var(--error)",
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: 8 }}>
            ⚠️ {this.props.label || "This section"} failed to load.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 12,
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--error)",
              background: "transparent",
              color: "var(--error)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
