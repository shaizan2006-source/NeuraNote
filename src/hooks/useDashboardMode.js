"use client";
import { useState, useEffect } from "react";

/**
 * useDashboardMode — "study" | "progress" toggle, persisted in sessionStorage.
 * Extracted from DashboardContext to keep the context lean.
 * SSR-safe: always starts as "study", reads sessionStorage only after mount.
 */
export function useDashboardMode() {
  const [dashboardMode, setDashboardMode] = useState("study");

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? sessionStorage.getItem("dashboard_mode")
      : null;
    if (stored && stored !== "study") setDashboardMode(stored);
  }, []);

  function toggleDashboardMode() {
    const next = dashboardMode === "study" ? "progress" : "study";
    setDashboardMode(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("dashboard_mode", next);
      import("@/lib/track").then(({ trackDashboardToggle }) => {
        trackDashboardToggle(dashboardMode, next);
      }).catch(() => {});
    }
  }

  return { dashboardMode, setDashboardMode, toggleDashboardMode };
}
