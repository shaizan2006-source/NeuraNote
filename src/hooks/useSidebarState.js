"use client";
import { useState, useEffect } from "react";

/**
 * useSidebarState — collapsed/expanded state, persisted in localStorage.
 * Extracted from DashboardContext to keep the context lean.
 * SSR-safe: always starts expanded, reads localStorage only after mount.
 */
export function useSidebarState() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("sidebar_collapsed") === "true");
  }, []);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  }

  return { sidebarCollapsed, setSidebarCollapsed, toggleSidebar };
}
