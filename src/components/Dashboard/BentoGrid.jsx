"use client";

import { useState, useEffect, Component } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import AskAIHeroCard from "./AskAIHeroCard";
import { FocusModeCard, QuizCard, CallTutorCard, ExamsCard } from "./StudyModeCards";
import ProgressLayout from "./ProgressLayout";

class ProgressErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, textAlign: "center", color: "#71717a" }}>
        <p style={{ margin: 0, fontSize: 14 }}>Something went wrong loading progress.</p>
        <button
          onClick={() => this.setState({ error: null })}
          style={{ marginTop: 12, padding: "6px 16px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, color: "#a78bfa", fontSize: 12, cursor: "pointer" }}
        >
          Try again
        </button>
      </div>
    );
    return this.props.children;
  }
}

const studyVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } },
};

const progressVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2, ease: "easeIn" } },
};

const cardVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeInOut" } },
};

const S = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: 12,
  animation: "skeleton-pulse 1.5s ease-in-out infinite",
};

function StudyModeSkeleton({ isMobile }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
      gap: 20,
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
    }}>
      {/* Left column skeleton */}
      <div style={{ display: "grid", gridTemplateRows: "65% 35%", gap: 20, minHeight: 0 }}>
        <div style={{ ...S }} />
        <div style={{ ...S }} />
      </div>
      {/* Right column skeleton */}
      <div style={{ display: "grid", gridTemplateRows: "40% 25% 35%", gap: 20, minHeight: 0 }}>
        <div style={{ ...S }} />
        <div style={{ ...S }} />
        <div style={{ ...S }} />
      </div>
    </div>
  );
}

export default function BentoGrid({ activePdf = null }) {
  const { dashboardMode } = useDashboard();
  const [isMobile, setIsMobile] = useState(false);
  const [studyReady, setStudyReady] = useState(false);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show skeleton briefly whenever study mode becomes active
  useEffect(() => {
    if (dashboardMode !== "study") return;
    setStudyReady(false);
    const id = setTimeout(() => setStudyReady(true), 400);
    return () => clearTimeout(id);
  }, [dashboardMode]);

  return (
    <AnimatePresence mode="wait">
      {dashboardMode === "study" ? (
        !studyReady ? (
          <StudyModeSkeleton key="study-skeleton" isMobile={isMobile} />
        ) : (
          <motion.div
            key="study"
            variants={studyVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
              gap: 20,
              flex: 1,
              minHeight: 0,
              overflowY: isMobile ? "auto" : "hidden",
            }}
          >
            {/* ── LEFT COLUMN: Ask AI (65%) + Call Tutor (35%) ── */}
            <div style={{
              display: "grid",
              gridTemplateRows: isMobile ? "400px auto" : "65% 35%",
              gap: 20,
              minHeight: 0,
            }}>
              <motion.div variants={cardVariants} style={{ minHeight: 0 }}>
                <AskAIHeroCard activePdf={activePdf} />
              </motion.div>
              <motion.div variants={cardVariants} style={{ minHeight: 0 }}>
                <CallTutorCard />
              </motion.div>
            </div>

            {/* ── RIGHT COLUMN: Focus Mode (40%) + Quiz (25%) + Exams (35%) ── */}
            <div style={{
              display: "grid",
              gridTemplateRows: isMobile ? "220px 160px auto" : "40% 25% 35%",
              gap: 20,
              minHeight: 0,
            }}>
              <motion.div variants={cardVariants} style={{ minHeight: 0 }}>
                <FocusModeCard />
              </motion.div>
              <motion.div variants={cardVariants} style={{ minHeight: 0 }}>
                <QuizCard />
              </motion.div>
              <motion.div variants={cardVariants} style={{ minHeight: 0 }}>
                <ExamsCard />
              </motion.div>
            </div>
          </motion.div>
        )
      ) : (
        <motion.div
          key="progress"
          variants={progressVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          <ProgressErrorBoundary>
            <ProgressLayout />
          </ProgressErrorBoundary>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
