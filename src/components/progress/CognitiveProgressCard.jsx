"use client";
import { useState, useCallback } from "react";
import AnimatedNumber from "./AnimatedNumber";
import ArtifactModal from "@/components/artifacts/ArtifactModal";

function getCellColor(score) {
  if (!score || score === 0) return "var(--bg-surface-3)";
  if (score < 50) return `rgba(245,181,68,${(0.35 + (score / 49) * 0.3).toFixed(2)})`;
  return "var(--success)";
}

export default function CognitiveProgressCard({
  topicsMastered = 0, totalTopics = 0,
  avgAccuracy = 0, retentionScore = 0,
  peerPercentile = 0, masteryTopics = [],
  weakTopicClusters = [],   // [{label, topics, avgScore, subject}] — Phase 2
  token = null,             // Auth token for artifact generation — Phase 4
}) {
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback((cluster) => {
    if (!token) return; // Require auth
    setSelectedCluster(cluster);
    setModalOpen(true);
  }, [token]);
  const cells = Array.from({ length: 16 }, (_, i) => ({
    score: masteryTopics[i]?.accuracy ?? 0,
  }));

  return (
    <div style={{
      background:    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, transparent), var(--bg-surface))",
      border:        "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
      borderRadius:  16,
      padding:       "22px 24px",
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
      boxSizing:     "border-box",
      boxShadow:     "var(--accent-glow)",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Cognitive Progress
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
        <AnimatedNumber to={topicsMastered} />
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-tertiary)" }}> / {totalTopics} mastered</span>
      </p>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 12px)", gap: 3 }}>
        {cells.map((cell, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: 3,
            background: getCellColor(cell.score),
            transition: "background 0.5s ease",
          }} />
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Accuracy</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--success)" }}>
            <AnimatedNumber to={avgAccuracy} suffix="%" />
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Retention</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
            <AnimatedNumber to={retentionScore} suffix="%" />
          </p>
        </div>
      </div>

      {peerPercentile > 0 && (
        <div style={{
          marginTop: 12, display: "inline-flex", alignItems: "center", gap: 5,
          background: "color-mix(in srgb, var(--warning) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--warning) 20%, transparent)",
          borderRadius: 20, padding: "4px 10px", alignSelf: "flex-start",
        }}>
          <span style={{ fontSize: 10 }}>⚡</span>
          <span style={{ fontSize: 10, color: "var(--warning)", fontWeight: 600 }}>
            Ahead of {peerPercentile}% of students
          </span>
        </div>
      )}

      {/* Semantic weak-topic clusters — Phase 2 */}
      {weakTopicClusters.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Knowledge Gaps
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {weakTopicClusters.slice(0, 3).map((cluster, i) => (
              <button
                key={i}
                onClick={() => openModal(cluster)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: token ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "color-mix(in srgb, var(--error) 7%, transparent)",
                  border: token ? "1px solid color-mix(in srgb, var(--accent) 15%, transparent)" : "1px solid color-mix(in srgb, var(--error) 15%, transparent)",
                  borderRadius: 8, padding: "5px 10px",
                  cursor: token ? "pointer" : "default",
                  transition: token ? "all 0.2s" : "none",
                  width: "100%",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (token) {
                    e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 15%, transparent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (token) {
                    e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 8%, transparent)";
                  }
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600, display: "block",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cluster.label}
                  </span>
                  {cluster.topics.length > 1 && (
                    <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>
                      + {cluster.topics.length - 1} related topic{cluster.topics.length > 2 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div style={{
                  flexShrink: 0, marginLeft: 8, display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, fontWeight: 700,
                  color: cluster.avgScore < 30 ? "var(--error)" : "var(--warning)",
                }}>
                  <span>{cluster.avgScore}%</span>
                  {token && <span style={{ fontSize: 10, opacity: 0.6 }}>→</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Artifact Modal — Phase 4 */}
      {selectedCluster && (
        <ArtifactModal
          cluster={selectedCluster}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedCluster(null);
          }}
          token={token}
        />
      )}
    </div>
  );
}
