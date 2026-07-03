"use client";

import { useState, useEffect, Component } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import AskAIHeroCard from "./AskAIHeroCard";
import { FocusModeCard, QuizCard, CallTutorCard, ExamsCard } from "./StudyModeCards";
import { PYQBankTile, BrainMapTile, ConstellationUnderlay } from "./ConstellationTiles";
import ProgressLayout from "./ProgressLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

class ProgressErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)" }}>
        <p style={{ margin: 0, fontSize: 14 }}>Something went wrong loading progress.</p>
        <button
          onClick={() => this.setState({ error: null })}
          style={{ marginTop: 12, padding: "6px 16px", background: "var(--bg-surface-2)", border: "1px solid var(--border-strong)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, cursor: "pointer" }}
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
  if (isMobile) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, flex: 1, minHeight: 0, overflow: "hidden" }}>
        {[260, 180, 120, 120].map((h, i) => <div key={i} style={{ ...S, height: h }} />)}
      </div>
    );
  }
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(12, 1fr)",
      gridTemplateRows: "repeat(6, minmax(0, 1fr))",
      gap: 16,
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
    }}>
      <div style={{ ...S, gridColumn: "4/10", gridRow: "1/3" }} />
      <div style={{ ...S, gridColumn: "1/4", gridRow: "2/5" }} />
      <div style={{ ...S, gridColumn: "10/13", gridRow: "2/5" }} />
      <div style={{ ...S, gridColumn: "4/10", gridRow: "3/5" }} />
      <div style={{ ...S, gridColumn: "1/4", gridRow: "5/7" }} />
      <div style={{ ...S, gridColumn: "4/10", gridRow: "5/7" }} />
      <div style={{ ...S, gridColumn: "10/13", gridRow: "5/7" }} />
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
              position: "relative",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(12, 1fr)",
              gridTemplateRows: isMobile ? "none" : "repeat(6, minmax(0, 1fr))",
              gridAutoRows: isMobile ? "minmax(140px, auto)" : undefined,
              gap: 16,
              flex: 1,
              minHeight: 0,
              overflowY: isMobile ? "auto" : "hidden",
            }}
          >
            {/* ── Constellation Grid (Stage 6, Option C): tiles are star-nodes
                   joined by the gold underlay. Sage = the spark, top-center. ── */}
            {!isMobile && <ConstellationUnderlay />}

            {/* Sage — the spark */}
            <motion.div variants={cardVariants} style={{ minHeight: 0, position: "relative", zIndex: 1, gridColumn: isMobile ? "auto" : "4/10", gridRow: isMobile ? "auto" : "1/3", ...(isMobile ? { minHeight: 280 } : {}) }}>
              <ErrorBoundary label="Sage">
                <AskAIHeroCard activePdf={activePdf} />
              </ErrorBoundary>
            </motion.div>

            {/* Focus — tall left node */}
            <motion.div variants={cardVariants} style={{ minHeight: 0, position: "relative", zIndex: 1, gridColumn: isMobile ? "auto" : "1/4", gridRow: isMobile ? "auto" : "2/5", ...(isMobile ? { minHeight: 220 } : {}) }}>
              <ErrorBoundary label="Focus Mode">
                <FocusModeCard />
              </ErrorBoundary>
            </motion.div>

            {/* Exams — tall right node */}
            <motion.div variants={cardVariants} style={{ minHeight: 0, position: "relative", zIndex: 1, gridColumn: isMobile ? "auto" : "10/13", gridRow: isMobile ? "auto" : "2/5", ...(isMobile ? { minHeight: 180 } : {}) }}>
              <ExamsCard />
            </motion.div>

            {/* Brain Map — the constellation, center */}
            <motion.div variants={cardVariants} style={{ minHeight: 0, position: "relative", zIndex: 1, gridColumn: isMobile ? "auto" : "4/10", gridRow: isMobile ? "auto" : "3/5", ...(isMobile ? { minHeight: 120 } : {}) }}>
              <ErrorBoundary label="Brain Map">
                <BrainMapTile />
              </ErrorBoundary>
            </motion.div>

            {/* Quiz */}
            <motion.div variants={cardVariants} style={{ minHeight: 0, position: "relative", zIndex: 1, gridColumn: isMobile ? "auto" : "1/4", gridRow: isMobile ? "auto" : "5/7", ...(isMobile ? { minHeight: 150 } : {}) }}>
              <ErrorBoundary label="Quiz">
                <QuizCard />
              </ErrorBoundary>
            </motion.div>

            {/* Call Tutor */}
            <motion.div variants={cardVariants} style={{ minHeight: 0, position: "relative", zIndex: 1, gridColumn: isMobile ? "auto" : "4/10", gridRow: isMobile ? "auto" : "5/7", ...(isMobile ? { minHeight: 150 } : {}) }}>
              <ErrorBoundary label="Voice Tutor">
                <CallTutorCard />
              </ErrorBoundary>
            </motion.div>

            {/* PYQ Bank */}
            <motion.div variants={cardVariants} style={{ minHeight: 0, position: "relative", zIndex: 1, gridColumn: isMobile ? "auto" : "10/13", gridRow: isMobile ? "auto" : "5/7", ...(isMobile ? { minHeight: 120 } : {}) }}>
              <ErrorBoundary label="PYQ Bank">
                <PYQBankTile />
              </ErrorBoundary>
            </motion.div>
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
