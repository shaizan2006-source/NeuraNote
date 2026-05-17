"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCohortPresence } from "@/hooks/useCohortPresence";

export default function CohortPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const myRowRef = useRef(null);

  const activeCount = useCohortPresence(data?.cohort_id, data?.my_handle);

  useEffect(() => {
    fetch("/api/cohort/leaderboard")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (myRowRef.current) {
      myRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [data]);

  const style = {
    page: { minHeight: "100vh", background: "#0A0A0A", color: "#F9FAFB", padding: "0 0 40px" },
    header: { padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
    row: (isMe) => ({
      display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
      background: isMe ? "rgba(139,92,246,0.1)" : "transparent",
      borderLeft: isMe ? "3px solid #8B5CF6" : "3px solid transparent",
    }),
  };

  if (loading) return <div style={{ ...style.page, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>Loading cohort…</div>;

  const rankings = data?.rankings ?? [];
  const memberCount = data?.member_count ?? 0;
  const coldStart = memberCount < 30;

  return (
    <div style={style.page}>
      <div style={style.header}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 13, marginBottom: 8 }}>← Back</button>
        <h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>{data?.cohort_name ?? "Your Cohort"}</h1>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6B7280" }}>
          <span>{memberCount.toLocaleString()} members</span>
          {activeCount > 0 && <span style={{ color: "#10B981" }}>● {activeCount} studying now</span>}
          {data?.my_handle && <span>You: <strong style={{ color: "#A78BFA" }}>{data.my_handle}</strong></span>}
        </div>
      </div>

      {coldStart ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6B7280" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
          <p style={{ fontSize: 16, color: "#E5E7EB", marginBottom: 8 }}>Cohort building</p>
          <p style={{ fontSize: 14 }}>{memberCount} member{memberCount !== 1 ? "s" : ""} so far. Leaderboard activates at 30.</p>
        </div>
      ) : (
        <div>
          {rankings.map((r) => {
            const isMe = r.handle === data?.my_handle;
            return (
              <div key={r.handle} ref={isMe ? myRowRef : null} style={style.row(isMe)}>
                <span style={{ width: 32, fontSize: 13, color: r.rank <= 3 ? "#F59E0B" : "#6B7280", fontWeight: r.rank <= 3 ? 700 : 400, textAlign: "right" }}>
                  {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : `#${r.rank}`}
                </span>
                <span style={{ flex: 1, fontSize: 14, color: isMe ? "#C4B5FD" : "#E5E7EB", fontWeight: isMe ? 600 : 400 }}>
                  {r.handle}{isMe ? " (you)" : ""}
                </span>
                <span style={{ fontSize: 13, color: "#6B7280" }}>{r.score} min</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
