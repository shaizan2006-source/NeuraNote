"use client";
import { useEffect, useState } from "react";
import { useCohortPresence } from "@/hooks/useCohortPresence";
import { useRouter } from "next/navigation";

export default function CohortPresence() {
  const router = useRouter();
  const [cohort, setCohort] = useState(null);

  useEffect(() => {
    fetch("/api/cohort/me")
      .then(r => r.json())
      .then(data => { if (data.cohort_id) setCohort(data); })
      .catch(() => {});
  }, []);

  const activeCount = useCohortPresence(cohort?.cohort_id, cohort?.my_handle);

  if (!cohort) return null;

  return (
    <div
      onClick={() => router.push("/cohort")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border-hairline)",
        borderRadius: 10, padding: "8px 12px",
        cursor: "pointer", marginBottom: 12,
      }}
    >
      {/* Pulse dot */}
      <span style={{
        width: 8, height: 8, borderRadius: 4,
        background: "var(--success)",
        animation: "cohort-pulse 4s ease-in-out infinite",
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>{activeCount}</strong> member{activeCount !== 1 ? "s" : ""} studying now
        {cohort.cohort_name && <span style={{ color: "var(--text-tertiary)" }}> · {cohort.cohort_name}</span>}
      </span>
      <style>{`@keyframes cohort-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
