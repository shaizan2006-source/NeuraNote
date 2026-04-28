"use client";

const MAX_TOPIC_LENGTH = 24;

function truncate(str) {
  if (!str || typeof str !== "string") return "";
  return str.length > MAX_TOPIC_LENGTH ? str.slice(0, MAX_TOPIC_LENGTH) + "…" : str;
}

export default function WeakTopicsSection({ weakTopics = [] }) {
  // Guard: must be a non-null array with valid topic strings
  const safeTopics = Array.isArray(weakTopics)
    ? weakTopics.filter((t) => t?.topic && typeof t.topic === "string" && t.topic.trim())
    : [];

  const sortedTopics = [...safeTopics]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 5);

  if (sortedTopics.length === 0) {
    return (
      <div style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: 10, color: "#52525b" }}>No weak topics yet</p>
        <p style={{ margin: "4px 0 0", fontSize: 9, color: "#3f3f46" }}>Ask questions to start tracking</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: "12px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 10, color: "#71717a", fontWeight: 600 }}>Weak Topics</p>
        <p style={{ margin: 0, fontSize: 9, color: "#3f3f46" }}>{sortedTopics.length} tracked</p>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sortedTopics.map((topic) => {
          const label = truncate(topic.topic);
          const count = typeof topic.count === "number" ? topic.count : 0;
          const key = topic.id ?? topic.topic;

          return (
            <button
              key={key}
              title={`${topic.topic} — asked ${count} time${count !== 1 ? "s" : ""}`}
              style={{
                padding: "5px 10px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 4,
                color: "#fca5a5",
                fontSize: 9,
                cursor: "pointer",
                transition: "all 150ms ease",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.2)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(239,68,68,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
