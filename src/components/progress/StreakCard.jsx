"use client";

export default function StreakCard({ streak = 0, lastActiveDate = null }) {
  const today = new Date().toISOString().split("T")[0];
  const isActive = lastActiveDate === today;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const activeSet = new Set();
  if (lastActiveDate && streak > 0) {
    const cursor = new Date(lastActiveDate + "T00:00:00");
    for (let i = 0; i < streak; i++) {
      activeSet.add(cursor.toISOString().split("T")[0]);
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)",
      borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Daily Streak
      </p>

      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{streak}</p>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-secondary)" }}>day{streak !== 1 ? "s" : ""} in a row</p>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 5, alignItems: "center" }}>
        {days.map(d => {
          const studied = activeSet.has(d);
          const isToday = d === today;
          return (
            <div
              key={d}
              title={d.slice(5)}
              style={{
                width: 11, height: 11, borderRadius: "50%",
                background: studied ? "var(--accent)" : isToday ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--border-hairline)",
                border: isToday && !studied ? "1px solid color-mix(in srgb, var(--accent) 35%, transparent)" : "none",
              }}
            />
          );
        })}
        <span style={{ fontSize: 9, color: "var(--text-tertiary)", marginLeft: 2 }}>7d</span>
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 10, color: isActive ? "var(--success)" : streak > 0 ? "var(--text-secondary)" : "var(--text-tertiary)" }}>
        {isActive ? "✓ Studied today — keep it up!" : streak > 0 ? "Study today to keep your streak!" : "Start your streak today!"}
      </p>
    </div>
  );
}
