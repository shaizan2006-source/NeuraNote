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
            background: "#1e1e1e",
            border: "1px solid #ef444433",
            borderRadius: 12,
            padding: 20,
            marginTop: 16,
            color: "#fca5a5",
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: 8 }}>
            ⚠️ {this.props.label || "This section"} failed to load.
          </p>
          <p style={{ fontSize: 12, color: "#64748b" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 12,
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #ef4444",
              background: "transparent",
              color: "#ef4444",
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
