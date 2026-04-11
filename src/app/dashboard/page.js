"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import BrainSection from "@/components/dashboard/BrainSection";
import StudyPlanSection from "@/components/dashboard/StudyPlanSection";
import QuizSection from "@/components/dashboard/QuizSection";
import ExamSection from "@/components/dashboard/ExamSection";
import FocusModeSection from "@/components/dashboard/FocusModeSection";
import AnalyticsSection from "@/components/dashboard/AnalyticsSection";
import AICoachSection from "@/components/dashboard/AICoachSection";
import VoiceCallSection from "@/components/dashboard/VoiceCallSection";
import WeeklyRecapCard from "@/components/dashboard/WeeklyRecapCard";

// ── Tab definitions ───────────────────────────────────────────────
const TABS = [
  { id: "study",    label: "Study",    icon: "💬" },
  { id: "practice", label: "Practice", icon: "⚡" },
  { id: "analyze",  label: "Analyze",  icon: "📊" },
];

// ── Tab content ───────────────────────────────────────────────────
function StudyTab() {
  return (
    <>
      <WeeklyRecapCard />
      <ErrorBoundary label="AI Coach">
        <AICoachSection />
      </ErrorBoundary>
    </>
  );
}

function PracticeTab() {
  return (
    <>
      <ErrorBoundary label="Quiz">
        <QuizSection />
      </ErrorBoundary>
      <ErrorBoundary label="Your Brain">
        <BrainSection />
      </ErrorBoundary>
      <ErrorBoundary label="Study Plans">
        <StudyPlanSection />
      </ErrorBoundary>
    </>
  );
}

function AnalyzeTab() {
  return (
    <>
      <ErrorBoundary label="Analytics">
        <AnalyticsSection />
      </ErrorBoundary>
      <ErrorBoundary label="Exam Countdown">
        <ExamSection />
      </ErrorBoundary>
      <ErrorBoundary label="Focus Mode">
        <FocusModeSection />
      </ErrorBoundary>
      <ErrorBoundary label="Voice AI Tutor">
        <VoiceCallSection />
      </ErrorBoundary>
    </>
  );
}

// ── Inner dashboard (reads activeTab from context) ────────────────
function DashboardInner() {
  const { activeTab, setActiveTab, streak, progressQuestions, masteryTopics } = useDashboard();
  const scrollRef = useRef(null);

  // Fire milestone checks whenever key stats change
  useEffect(() => {
    checkMilestones({ streak, progressQuestions, masteryTopics: masteryTopics?.length ?? 0 });
  }, [streak, progressQuestions, masteryTopics]);

  const handleTabChange = (id) => {
    setActiveTab(id);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="dashboard-layout">
      <MilestoneToast />
      <ErrorBoundary label="Sidebar">
        <DashboardSidebar />
      </ErrorBoundary>

      <div className="dashboard-main" ref={scrollRef}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            Ask My Notes
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Your AI-powered study companion
          </p>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────── */}
        <div className="tab-bar" role="tablist">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`tab-btn${isActive ? " active" : ""}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="tab-indicator"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  />
                )}
                <span style={{ position: "relative", zIndex: 1 }}>{tab.icon}</span>
                <span className="tab-label" style={{ position: "relative", zIndex: 1 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab content with animated transition ───────────────── */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {activeTab === "study"    && <StudyTab />}
            {activeTab === "practice" && <PracticeTab />}
            {activeTab === "analyze"  && <AnalyzeTab />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardInner />
    </DashboardProvider>
  );
}
