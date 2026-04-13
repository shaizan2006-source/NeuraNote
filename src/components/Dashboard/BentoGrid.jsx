"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import AskAIHeroCard     from "./AskAIHeroCard";
import YourBrainHeroCard from "./YourBrainHeroCard";
import StudyModeCards    from "./StudyModeCards";
import ProgressModeCards from "./ProgressModeCards";

// 30ms stagger across 4 cards
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};
const cardVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeInOut" } },
};

export default function BentoGrid({ activePdf = null }) {
  const { dashboardMode } = useDashboard();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dashboardMode}
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeInOut" } }}
        variants={containerVariants}
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows:    "1fr 1fr",
          gap:                 6,
          flex:                1,
          minHeight:           0,
        }}
      >
        {/* Hero card — spans 2 rows on left */}
        <motion.div
          variants={cardVariants}
          style={{ gridColumn: 1, gridRow: "1 / 3" }}
        >
          {dashboardMode === "study"
            ? <AskAIHeroCard activePdf={activePdf} />
            : <YourBrainHeroCard />
          }
        </motion.div>

        {/* 4 bento cards — 2×2 on right */}
        {dashboardMode === "study"
          ? <StudyModeCards />
          : <ProgressModeCards />
        }
      </motion.div>
    </AnimatePresence>
  );
}
