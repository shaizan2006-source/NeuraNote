"use client";
import CognitiveProgressCard from "./CognitiveProgressCard";
import FocusScoreCard        from "./FocusScoreCard";
import StreakCard             from "./StreakCard";

export default function HeroSection({ data }) {
  return (
    <section style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
      <div style={{ flex: "2 1 280px", minWidth: 240 }}>
        <CognitiveProgressCard
          topicsMastered={data.topicsMastered}
          totalTopics={data.totalTopics}
          avgAccuracy={data.avgAccuracy}
          retentionScore={data.retentionScore}
          peerPercentile={data.peerPercentile}
          masteryTopics={data.topicAccuracy || []}
        />
      </div>
      <div style={{ flex: "1 1 180px", minWidth: 160 }}>
        <FocusScoreCard
          focusScore={data.focusScore}
          focusTrend={data.focusTrend}
          streak={data.streak}
          totalStudyTimeMins={data.totalStudyTimeMins}
          topicsMastered={data.topicsMastered}
          totalTopics={data.totalTopics}
        />
      </div>
      <div style={{ flex: "1 1 160px", minWidth: 150 }}>
        <StreakCard streak={data.streak} lastActiveDate={data.lastActiveDate} />
      </div>
    </section>
  );
}
