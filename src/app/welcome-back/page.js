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
      background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, color: "#F9FAFB",
    }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>👋</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome back.</h1>
        <p style={{ fontSize: 15, color: "#9CA3AF", marginBottom: 8, lineHeight: 1.6 }}>
          Your Brain Map, your progress, your cohort — all still here. Nothing lost.
        </p>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 36 }}>
          Where would you like to start?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={handlePickUp} style={{
            background: "#8B5CF6", color: "#fff", border: "none",
            borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}>
            Pick up where I left off
          </button>

          <button onClick={handleFresh} style={{
            background: "rgba(255,255,255,0.06)", color: "#E5E7EB",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "14px 20px", fontSize: 15, cursor: "pointer",
          }}>
            Start fresh — new study plan
          </button>

          <button onClick={handleLooking} style={{
            background: "none", color: "#6B7280", border: "none",
            borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer",
          }}>
            I'm just looking around
          </button>
        </div>
      </div>
    </div>
  );
}
