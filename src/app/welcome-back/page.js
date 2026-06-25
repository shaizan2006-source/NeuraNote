"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function WelcomeBackPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Track event
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "welcome_back_shown" }),
    }).catch(() => {});
  }, []);

  function handlePickUp() { router.push("/dashboard"); }
  function handleFresh() {
    fetch("/api/study-plan/reset", { method: "POST" }).catch(() => {});
    router.push("/dashboard");
  }
  function handleLooking() { router.push("/library"); }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, color: "var(--text-primary)",
    }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>👋</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome back.</h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.6 }}>
          Your Brain Map, your progress, your cohort — all still here. Nothing lost.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 36 }}>
          Where would you like to start?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={handlePickUp} style={{
            background: "var(--accent-grad)", color: "var(--bg-base)", border: "none",
            borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}>
            Pick up where I left off
          </button>

          <button onClick={handleFresh} style={{
            background: "var(--bg-surface-2)", color: "var(--text-secondary)",
            border: "1px solid var(--border-strong)",
            borderRadius: 12, padding: "14px 20px", fontSize: 15, cursor: "pointer",
          }}>
            Start fresh — new study plan
          </button>

          <button onClick={handleLooking} style={{
            background: "none", color: "var(--text-tertiary)", border: "none",
            borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer",
          }}>
            I'm just looking around
          </button>
        </div>
      </div>
    </div>
  );
}
