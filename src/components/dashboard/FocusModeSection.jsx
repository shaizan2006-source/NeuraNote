"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

const RADIUS       = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SESSION_MODES = [
  { id: "focus", label: "Focus",       duration: 25 * 60, isBreak: false },
  { id: "short", label: "Short Break", duration:  5 * 60, isBreak: true  },
  { id: "long",  label: "Long Break",  duration: 15 * 60, isBreak: true  },
];

// ── SVG ring (idle preview) ───────────────────────────────────────
function TimerRing({ timeLeft, totalSecs, isBreak }) {
  const progress   = timeLeft / totalSecs;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const color      = isBreak ? "var(--amber)" : "var(--brand-light)";

  return (
    <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto" }}>
      <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="var(--border-default)" strokeWidth="8" />
        <motion.circle
          cx="80" cy="80" r={RADIUS}
          fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", color }}>
          {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:{(timeLeft % 60).toString().padStart(2, "0")}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
          color: isBreak ? "var(--amber)" : "var(--brand)",
          textTransform: "uppercase", marginTop: 2,
        }}>
          {isBreak ? "Break" : "Ready"}
        </span>
      </div>
    </div>
  );
}

// ── Session progress bar ──────────────────────────────────────────
function SessionProgress({ completed, total }) {
  const pct = total ? (completed / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Session progress</span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{completed}/{total} tasks</span>
      </div>
      <div style={{ height: 5, background: "var(--border-default)", borderRadius: 99, overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--brand), var(--green))" }}
        />
      </div>
    </div>
  );
}

export default function FocusModeSection() {
  const {
    isFocusMode, timeLeft, isBreak, currentTaskIndex, completedTasks, dailyPlan,
    isFocusExpanded, setIsFocusExpanded,
    startFocus, stopFocus, markTaskDone, formatTime,
  } = useDashboard();

  const [activeMode, setActiveMode]       = useState("focus");
  const [showCelebration, setShowCelebration] = useState(false);

  const selectedMode = SESSION_MODES.find((m) => m.id === activeMode);
  const currentTask  = dailyPlan?.[currentTaskIndex];
  const isDone       = completedTasks?.includes(currentTaskIndex);

  // Celebration burst when a focus interval completes
  useEffect(() => {
    if (isFocusMode && timeLeft === 0 && !isBreak) {
      setShowCelebration(true);
      const t = setTimeout(() => setShowCelebration(false), 1800);
      return () => clearTimeout(t);
    }
  }, [timeLeft, isBreak, isFocusMode]);

  return (
    <div id="section-focus" className="section-card" style={{ marginTop: 20 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        onClick={() => setIsFocusExpanded((p) => !p)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🎯</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Focus Mode</span>
          {isFocusMode && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: isBreak ? "var(--amber-glow)" : "rgba(34,197,94,0.15)",
                color: isBreak ? "var(--amber)" : "var(--green)",
                border: `1px solid ${isBreak ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
                borderRadius: 20, padding: "2px 10px",
                fontSize: 11, fontWeight: 700,
              }}
            >
              {isBreak ? "☕ Break" : "🔥 Live"}
            </motion.span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isFocusExpanded ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          style={{ color: "var(--text-muted)", fontSize: 13 }}
        >
          ▼
        </motion.div>
      </div>

      {/* ── Collapsed hint ──────────────────────────────────── */}
      {!isFocusExpanded && (
        <p style={{ margin: "10px 0 0", color: "var(--text-faint)", fontSize: 13 }}>
          {isFocusMode ? `⏱ ${formatTime(timeLeft)} remaining` : "Start a Pomodoro session to stay focused."}
        </p>
      )}

      {/* ── Expanded content ─────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {isFocusExpanded && (
          <motion.div
            key="focus-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 24 }}>

              {/* ── Idle state ──────────────────────────────── */}
              {!isFocusMode && (
                <div style={{ textAlign: "center" }}>

                  {/* Session type tabs */}
                  <div style={{
                    display: "inline-flex",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 10, padding: 4, gap: 2, marginBottom: 24,
                    position: "relative",
                  }}>
                    {SESSION_MODES.map((m) => {
                      const isActive = activeMode === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setActiveMode(m.id)}
                          style={{
                            position: "relative", padding: "6px 14px",
                            borderRadius: 7, border: "none", cursor: "pointer",
                            background: "transparent",
                            color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                            fontSize: 12, fontWeight: 600, zIndex: 1,
                            transition: "color 0.15s",
                          }}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="focus-tab-pill"
                              transition={{ type: "spring", stiffness: 420, damping: 30 }}
                              style={{
                                position: "absolute", inset: 0,
                                borderRadius: 7,
                                background: "var(--surface-raised)",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                                zIndex: -1,
                              }}
                            />
                          )}
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  <TimerRing
                    timeLeft={selectedMode.duration}
                    totalSecs={selectedMode.duration}
                    isBreak={selectedMode.isBreak}
                  />
                  <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "16px 0 24px" }}>
                    {selectedMode.id === "focus"
                      ? "25 min focus · 5 min break · repeat"
                      : selectedMode.id === "short"
                      ? "5 min break to recharge"
                      : "15 min long break — well deserved"}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => startFocus(selectedMode.duration, selectedMode.isBreak)}
                    style={{
                      background: selectedMode.isBreak
                        ? "linear-gradient(135deg, var(--amber), #d97706)"
                        : "linear-gradient(135deg, var(--brand), #4f46e5)",
                      color: "#fff", border: "none", borderRadius: 12,
                      padding: "13px 36px", fontSize: 15, fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: selectedMode.isBreak
                        ? "0 4px 20px var(--amber-glow)"
                        : "0 4px 20px var(--brand-glow)",
                    }}
                  >
                    {selectedMode.isBreak ? "☕ Start Break" : "🚀 Start Focus Session"}
                  </motion.button>
                </div>
              )}

              {/* ── Active state ─────────────────────────────── */}
              {isFocusMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Celebration burst */}
                  <AnimatePresence>
                    {showCelebration && (
                      <motion.div
                        key="celebration"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.35 }}
                        style={{
                          position: "absolute",
                          inset: 0, margin: "auto",
                          width: 200, height: 200,
                          borderRadius: "50%",
                          background: "radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)",
                          pointerEvents: "none",
                          zIndex: 2,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Timer ring */}
                  <div style={{ position: "relative", marginBottom: 24 }}>
                    {/* Ambient breathe */}
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.06, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        position: "absolute", inset: 0, margin: "auto",
                        width: 140, height: 140, borderRadius: "50%",
                        background: isBreak
                          ? "radial-gradient(circle, rgba(245,158,11,0.2), transparent)"
                          : "radial-gradient(circle, rgba(124,58,237,0.2), transparent)",
                        pointerEvents: "none",
                      }}
                    />
                    <div style={{ position: "relative" }}>
                      <svg width="160" height="160" viewBox="0 0 160 160"
                        style={{ display: "block", margin: "0 auto", transform: "rotate(-90deg)" }}>
                        <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="var(--border-default)" strokeWidth="8" />
                        <motion.circle
                          cx="80" cy="80" r={RADIUS}
                          fill="none"
                          stroke={isBreak ? "var(--amber)" : "var(--brand-light)"}
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={CIRCUMFERENCE}
                          animate={{
                            strokeDashoffset: CIRCUMFERENCE * (1 - timeLeft / (isBreak ? 15 * 60 : 25 * 60)),
                          }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                          style={{ filter: `drop-shadow(0 0 8px ${isBreak ? "var(--amber)" : "var(--brand-light)"})` }}
                        />
                      </svg>
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{
                          fontSize: 30, fontWeight: 800, letterSpacing: "-0.5px",
                          color: isBreak ? "var(--amber)" : "var(--brand-light)",
                        }}>
                          {formatTime(timeLeft)}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "1.5px",
                          color: isBreak ? "var(--amber)" : "var(--brand)",
                          textTransform: "uppercase", marginTop: 3,
                        }}>
                          {isBreak ? "Break" : "Focus"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Session progress */}
                  <div style={{ marginBottom: 16 }}>
                    <SessionProgress completed={completedTasks?.length ?? 0} total={dailyPlan?.length ?? 0} />
                  </div>

                  {/* Current task card */}
                  <div style={{
                    background: "var(--surface-raised)",
                    borderRadius: 12, padding: "14px 16px", marginBottom: 14,
                    borderLeft: `3px solid ${isBreak ? "var(--amber)" : "var(--brand)"}`,
                  }}>
                    {currentTask ? (
                      <>
                        <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 6 }}>
                          Current Task
                        </p>
                        <p style={{
                          margin: 0, color: "var(--text-primary)", fontSize: 14, lineHeight: 1.5,
                          textDecoration: isDone ? "line-through" : "none",
                          opacity: isDone ? 0.5 : 1,
                        }}>
                          {currentTask}
                        </p>
                        {!isDone && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={markTaskDone}
                            style={{
                              marginTop: 12,
                              background: "rgba(34,197,94,0.15)",
                              color: "var(--green)", border: "1px solid rgba(34,197,94,0.3)",
                              borderRadius: 8, padding: "7px 18px",
                              fontSize: 13, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            ✓ Mark done
                          </motion.button>
                        )}
                      </>
                    ) : (
                      <motion.p
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ color: "var(--green)", fontWeight: 700, margin: 0, fontSize: 14 }}
                      >
                        🎉 All tasks completed!
                      </motion.p>
                    )}
                  </div>

                  {/* Stop button */}
                  <button
                    onClick={stopFocus}
                    style={{
                      width: "100%", padding: "10px 0",
                      background: "transparent",
                      border: "1px solid var(--border-strong)",
                      borderRadius: 9, color: "var(--text-muted)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    ⏹ Stop Session
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
