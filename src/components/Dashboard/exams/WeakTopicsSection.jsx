"use client";

export default function WeakTopicsSection({ weakTopics = [] }) {
  // Filter to top 5 weak topics, sorted by count
  const sortedTopics = [...weakTopics]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 5);

  if (sortedTopics.length === 0) {
    return (
      <div
        style={{
          padding: "12px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 10, color: "#52525b" }}>No weak topics yet</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#71717a", fontWeight: 600 }}>
        Weak Topics
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sortedTopics.map((topic) => (
          <button
            key={topic.id || topic.topic}
            style={{
              padding: "5px 10px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 4,
              color: "#fca5a5",
              fontSize: 9,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.2)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(239,68,68,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
            title={`Asked ${topic.count} times`}
          >
            {topic.topic}
          </button>
        ))}
      </div>
    </div>
  );
}
