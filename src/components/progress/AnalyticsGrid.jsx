"use client";
import StudyTimeCard    from "./StudyTimeCard";
import AccuracyCard     from "./AccuracyCard";
import SessionDepthCard from "./SessionDepthCard";
import WeeklyRecapCard  from "./WeeklyRecapCard";

export default function AnalyticsGrid({ data }) {
  return (
    <section style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
      gap: 12,
      marginTop: 14,
    }}>
      <StudyTimeCard
        thisWeekMins={data.thisWeekMins}
        dailyStudyTime={data.dailyStudyTime}
        peakStudyHour={data.peakStudyHour}
      />
      <AccuracyCard
        avgAccuracy={data.avgAccuracy}
        topicAccuracy={data.topicAccuracy}
      />
      <SessionDepthCard
        avgSessionDepthMins={data.avgSessionDepthMins}
        sessionsCompleted={data.sessionsCompleted}
        difficultyBreakdown={data.difficultyBreakdown}
      />
      <WeeklyRecapCard
        thisWeekMins={data.thisWeekMins}
        weeklyChange={data.weeklyChange}
        strongestSubject={data.strongestSubject}
      />
    </section>
  );
}
