"use client";
import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Sentry Test</h1>
      <button
        onClick={() => {
          throw new Error("Sentry client-side test error — ask-my-notes");
        }}
        style={{ marginRight: 12, padding: "8px 16px" }}
      >
        Throw client error
      </button>
      <button
        onClick={async () => {
          await fetch("/api/admin/sentry-test");
        }}
        style={{ padding: "8px 16px" }}
      >
        Throw server error
      </button>
    </div>
  );
}