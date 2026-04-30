"use client";

import { useState, useEffect, Component } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import AskAIHeroCard from "./AskAIHeroCard";
import StudyModeCards from "./StudyModeCards";
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
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
      gridTemplateRows: isMobile ? "auto" : "1fr 1fr 1fr",
      gap: 10,
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
    }}>
      {/* Hero card skeleton — spans 2 cols × 2 rows on desktop */}
      <div style={{
        ...S,
        gridColumn: isMobile ? "1" : "1 / 3",
        gridRow: isMobile ? "1" : "1 / 3",
        minHeight: isMobile ? 200 : "auto",
      }} />
      {/* Small card skeletons */}
      <div style={{ ...S, minHeight: 90 }} />
      <div style={{ ...S, minHeight: 90 }} />
      <div style={{ ...S, minHeight: 90 }} />
      <div style={{ ...S, minHeight: 90 }} />
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
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gridTemplateRows: isMobile ? "auto" : "1fr 1fr auto",
              gap: 16,
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* Hero card */}
            <motion.div
              variants={cardVariants}
              style={{
                gridColumn: isMobile ? "1" : "1 / 3",
                gridRow: isMobile ? "1" : "1 / 3",
              }}
            >
              <AskAIHeroCard activePdf={activePdf} />
            </motion.div>

            {/* Study cards */}
            <StudyModeCards />
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
