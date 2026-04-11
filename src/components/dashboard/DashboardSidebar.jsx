"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// ── Navigate section items (collapsible) ─────────────────────────
const NAV_ITEMS = [
  { icon: "🧠", label: "Your Brain",  id: "section-brain",     tab: "practice" },
  { icon: "📋", label: "Study Plan",  id: "section-plan",      tab: "practice" },
  { icon: "📤", label: "Upload",      id: "section-upload",    tab: "study"    },
  { icon: "⚡", label: "Quiz",         id: "section-quiz",      tab: "practice" },
  { icon: "📅", label: "Exams",       id: "section-exam",      tab: "analyze"  },
  { icon: "🎯", label: "Focus Mode",  id: "section-focus",     tab: "analyze"  },
  { icon: "📊", label: "Analytics",   id: "section-analytics", tab: "analyze"  },
  { icon: "🤖", label: "AI Coach",    id: "section-coach",     tab: "study"    },
];

// ── General bottom nav ────────────────────────────────────────────
const BOTTOM_NAV = [
  { icon: "💬", label: "Ask AI", id: "section-ask", tab: "study", href: "/ask-ai" },
];

// ── Premium feature — kept separate ──────────────────────────────
const VOICE_ITEM = { icon: "📞", label: "Voice Tutor", id: "section-voice", tab: "analyze" };

function scrollTo(id) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

// ── Tooltip for collapsed mode ────────────────────────────────────
function NavTooltip({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "absolute",
        left: "calc(100% + 10px)",
        top: "50%",
        transform: "translateY(-50%)",
        background: "#1e293b",
        border: "1px solid #334155",
        color: "#e2e8f0",
        fontSize: 12,
        fontWeight: 500,
        padding: "5px 11px",
        borderRadius: 8,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 200,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      {label}
    </motion.div>
  );
}

// ── Reusable nav button ───────────────────────────────────────────
function NavButton({ item, isActive, isCollapsed, hoveredId, setHoveredId, onClick, layoutId }) {
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHoveredId(item.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      <motion.button
        whileHover={{ backgroundColor: isActive ? undefined : "rgba(255,255,255,0.04)" }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          width: "100%",
          padding: isCollapsed ? "8px 0" : "8px 10px",
          borderRadius: 9,
          border: "none",
          background: isActive ? "rgba(124,58,237,0.12)" : "transparent",
          color: isActive ? "#a78bfa" : "#64748b",
          cursor: "pointer",
          justifyContent: isCollapsed ? "center" : "flex-start",
          position: "relative",
          transition: "color 0.2s",
        }}
      >
        {isActive && (
          <motion.div
            layoutId={layoutId || "nav-active-pill"}
            style={{
              position: "absolute",
              left: 0, top: 0, bottom: 0,
              width: 3,
              borderRadius: 99,
              background: "#7c3aed",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
        {!isCollapsed && (
          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.label}
          </span>
        )}
      </motion.button>
      {isCollapsed && hoveredId === item.id && (
        <AnimatePresence>
          <NavTooltip label={item.label} />
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Sidebar inner content ─────────────────────────────────────────
function SidebarContent({ isCollapsed, onClose }) {
  const {
    savedPDFs, documents, documentId, setDocumentId,
    deletePDF, setActiveTab, streak, lastActiveDate,
  } = useDashboard();

  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();
  const showStreakNudge = streak >= 1 && lastActiveDate === yesterday;

  const router = useRouter();
  const [activeId, setActiveId]     = useState(null);
  const [search, setSearch]         = useState("");
  const [hoveredId, setHoveredId]   = useState(null);
  const [navExpanded, setNavExpanded]   = useState(true);
  const [pdfsExpanded, setPdfsExpanded] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchInputRef    = useRef(null);
  const suggestionsBoxRef = useRef(null);

  const allPDFs = [
    ...(savedPDFs || []),
    ...(documents || []).filter((d) => !(savedPDFs || []).some((p) => p.id === d.id)),
  ];
  const filtered     = allPDFs.filter((p) => (p.name || "").toLowerCase().includes(search.toLowerCase()));
  const suggestions  = search.length > 0 ? filtered.slice(0, 6) : [];

  // Close suggestion dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      const insideInput  = searchInputRef.current?.contains(e.target);
      const insideDrop   = suggestionsBoxRef.current?.contains(e.target);
      if (!insideInput && !insideDrop) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleNav = (item) => {
    setActiveId(item.id);
    if (item.tab) setActiveTab(item.tab);
    scrollTo(item.id);
    onClose?.();
  };

  const handlePDF = (id) => {
    setDocumentId(id);
    onClose?.();
  };

  const handleSuggestionSelect = (pdf) => {
    handlePDF(pdf.id);
    setSearch("");
    setShowSuggestions(false);
  };

  // ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>

        {/* ── Brand header ──────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: isCollapsed ? "18px 0 14px" : "16px 14px 14px",
          borderBottom: "1px solid #1a2640",
          flexShrink: 0,
          gap: 8,
        }}>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                key="brand"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                style={{ display: "flex", alignItems: "center", gap: 9, overflow: "hidden" }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, flexShrink: 0,
                  boxShadow: "0 0 14px rgba(124,58,237,0.35)",
                }}>
                  📚
                </div>
                <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
                  Ask My Notes
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Navigate section (collapsible) ────────────────── */}
        <div style={{
          flexShrink: 0,
          borderBottom: "1px solid #1a2640",
          padding: isCollapsed ? "10px 6px" : "8px 8px 0",
        }}>
          {/* Section header — click to collapse (hidden in icon mode) */}
          {!isCollapsed && (
            <button
              onClick={() => setNavExpanded((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 6px 6px",
                marginBottom: 2,
                borderRadius: 6,
              }}
            >
              <span style={{
                color: "#334155",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}>
                Navigate
              </span>
              <motion.span
                animate={{ rotate: navExpanded ? 0 : -90 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ color: "#334155", fontSize: 10, lineHeight: 1, display: "inline-block" }}
              >
                ▾
              </motion.span>
            </button>
          )}

          {/* Nav items — animate height, never causes sibling overlap */}
          <AnimatePresence initial={false}>
            {(isCollapsed || navExpanded) && (
              <motion.div
                key="nav-items"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ paddingBottom: 8 }}>
                  {NAV_ITEMS.map((item) => (
                    <NavButton
                      key={item.id}
                      item={item}
                      isActive={activeId === item.id}
                      isCollapsed={isCollapsed}
                      hoveredId={hoveredId}
                      setHoveredId={setHoveredId}
                      onClick={() => handleNav(item)}
                      layoutId="nav-active-pill"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Your PDFs ──────────────────────────────────────── */}
        <div style={{
          borderBottom: "1px solid #1a2640",
          padding: isCollapsed ? "10px 6px 6px" : "10px 8px 6px",
        }}>
          {/* PDF section header (collapsible, hidden in icon mode) */}
          {!isCollapsed && (
            <button
              onClick={() => setPdfsExpanded((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 6px 6px",
                marginBottom: 2,
                borderRadius: 6,
              }}
            >
              <span style={{
                color: "#334155",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}>
                📁 Your PDFs
              </span>
              <motion.span
                animate={{ rotate: pdfsExpanded ? 0 : -90 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ color: "#334155", fontSize: 10, lineHeight: 1, display: "inline-block" }}
              >
                ▾
              </motion.span>
            </button>
          )}

          <AnimatePresence initial={false}>
            {(isCollapsed || pdfsExpanded) && (
              <motion.div
                key="pdf-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: "hidden" }}
              >

          {!isCollapsed && (
            <div style={{ flexShrink: 0, marginBottom: 8 }}>

              {/* Search input + live suggestions */}
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)",
                  color: "#334155", fontSize: 13, pointerEvents: "none",
                }}>
                  🔍
                </span>
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#7c3aed";
                    if (search.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={(e) => { e.target.style.borderColor = "#1e293b"; }}
                  placeholder="Search PDFs..."
                  style={{
                    width: "100%",
                    background: "#0d1829",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    padding: "7px 10px 7px 32px",
                    color: "#e2e8f0",
                    fontSize: 12,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                />

                {/* Live suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      ref={suggestionsBoxRef}
                      key="pdf-suggestions"
                      initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 5px)",
                        left: 0, right: 0,
                        background: "#0d1829",
                        border: "1px solid #334155",
                        borderRadius: 9,
                        zIndex: 100,
                        overflow: "hidden",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
                        transformOrigin: "top center",
                      }}
                    >
                      {suggestions.map((pdf, idx) => {
                        const isSelected = documentId === pdf.id;
                        return (
                          <motion.div
                            key={pdf.id}
                            whileHover={{ backgroundColor: "rgba(124,58,237,0.1)" }}
                            onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(pdf); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: idx < suggestions.length - 1 ? "1px solid #1a2640" : "none",
                              background: isSelected ? "rgba(37,99,235,0.1)" : "transparent",
                              transition: "background 0.15s",
                            }}
                          >
                            <span style={{ fontSize: 12, flexShrink: 0 }}>
                              {isSelected ? "📘" : "📄"}
                            </span>
                            <span style={{
                              fontSize: 12,
                              color: isSelected ? "#93c5fd" : "#94a3b8",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              fontWeight: isSelected ? 600 : 400,
                            }}>
                              {pdf.name || "Untitled PDF"}
                            </span>
                            {isSelected && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#60a5fa",
                                flexShrink: 0,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}>
                                Active
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* PDF scroll list — occupies remaining PDF-zone height */}
          <div
            className="pdf-scroll-area"
            style={{ maxHeight: 200, overflowY: "auto" }}
          >
            {filtered.length === 0 && !isCollapsed && (
              <div style={{ textAlign: "center", padding: "20px 8px" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>
                  {search ? "No match found" : "No PDFs uploaded"}
                </p>
                {!search && (
                  <p style={{ color: "#1e293b", fontSize: 11, margin: "4px 0 0" }}>
                    Upload your notes to begin
                  </p>
                )}
              </div>
            )}

            {filtered.map((pdf) => {
              const isActive = documentId === pdf.id;
              return (
                <div
                  key={pdf.id}
                  style={{ position: "relative" }}
                  onMouseEnter={() => setHoveredId(`pdf-${pdf.id}`)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <motion.div
                    whileHover={!isActive ? { backgroundColor: "rgba(255,255,255,0.03)" } : {}}
                    onClick={() => handlePDF(pdf.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: isCollapsed ? "9px 0" : "8px 10px",
                      borderRadius: 9,
                      background: isActive ? "rgba(37,99,235,0.13)" : "transparent",
                      border: `1px solid ${isActive ? "rgba(37,99,235,0.3)" : "transparent"}`,
                      cursor: "pointer",
                      marginBottom: 2,
                      justifyContent: isCollapsed ? "center" : "flex-start",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 13, flexShrink: 0 }}>
                      {isActive ? "📘" : "📄"}
                    </span>
                    {!isCollapsed && (
                      <>
                        <span style={{
                          color: isActive ? "#93c5fd" : "#64748b",
                          fontSize: 12,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: isActive ? 600 : 400,
                          transition: "color 0.2s",
                        }}>
                          {pdf.name || "Untitled PDF"}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePDF(pdf.id); }}
                          aria-label="Delete PDF"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#1e293b",
                            cursor: "pointer",
                            fontSize: 11,
                            flexShrink: 0,
                            padding: "2px 4px",
                            borderRadius: 4,
                            lineHeight: 1,
                            transition: "color 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#1e293b")}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </motion.div>
                  {isCollapsed && hoveredId === `pdf-${pdf.id}` && (
                    <AnimatePresence>
                      <NavTooltip label={pdf.name || "PDF"} />
                    </AnimatePresence>
                  )}
                </div>
              );
            })}
          </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Voice Tutor — Premium ───────────────────────────── */}
        <div style={{
          borderTop: "1px solid #1a2640",
          padding: isCollapsed ? "10px 6px" : "10px 8px",
        }}>
          {!isCollapsed && (
            <p style={{
              margin: "0 0 6px 6px",
              color: "#92400e",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}>
              ⭐ Premium
            </p>
          )}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setHoveredId("voice")}
            onMouseLeave={() => setHoveredId(null)}
          >
            <motion.button
              whileHover={{
                backgroundColor: "rgba(245,158,11,0.12)",
                boxShadow: "0 0 16px rgba(245,158,11,0.18)",
              }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/call-tutor")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                padding: isCollapsed ? "9px 0" : "9px 12px",
                borderRadius: 10,
                border: `1px solid ${activeId === VOICE_ITEM.id ? "rgba(245,158,11,0.55)" : "rgba(245,158,11,0.25)"}`,
                background: activeId === VOICE_ITEM.id
                  ? "rgba(245,158,11,0.15)"
                  : "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(251,191,36,0.03) 100%)",
                color: activeId === VOICE_ITEM.id ? "#fbbf24" : "#a16207",
                cursor: "pointer",
                justifyContent: isCollapsed ? "center" : "flex-start",
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              {activeId === VOICE_ITEM.id && (
                <motion.div
                  layoutId="premium-active-pill"
                  style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: 3,
                    borderRadius: 99,
                    background: "linear-gradient(180deg, #f59e0b, #fbbf24)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>📞</span>
              {!isCollapsed && (
                <>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    flex: 1,
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    color: activeId === VOICE_ITEM.id ? "#fbbf24" : "#92400e",
                  }}>
                    Voice Tutor
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    padding: "2px 7px",
                    borderRadius: 99,
                    background: "linear-gradient(90deg, rgba(245,158,11,0.28), rgba(251,191,36,0.18))",
                    border: "1px solid rgba(245,158,11,0.4)",
                    color: "#fbbf24",
                    flexShrink: 0,
                    textTransform: "uppercase",
                  }}>
                    Premium
                  </span>
                </>
              )}
            </motion.button>
            {isCollapsed && hoveredId === "voice" && (
              <AnimatePresence>
                <NavTooltip label="Voice Tutor — Premium" />
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Bottom navigation ───────────────────────────────── */}
        <div style={{
          borderTop: "1px solid #1a2640",
          padding: isCollapsed ? "10px 6px" : "10px 8px",
        }}>
          {BOTTOM_NAV.map((item) => {
            const isActive = activeId === item.id;
            return (
              <div
                key={item.id}
                style={{ position: "relative" }}
                onMouseEnter={() => setHoveredId(`bot-${item.id}`)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <motion.button
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => item.href ? router.push(item.href) : handleNav(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    width: "100%",
                    padding: isCollapsed ? "7px 0" : "7px 10px",
                    borderRadius: 9,
                    border: "none",
                    background: isActive ? "rgba(124,58,237,0.08)" : "transparent",
                    color: isActive ? "#a78bfa" : "#475569",
                    cursor: "pointer",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                  {!isCollapsed && (
                    <span style={{ fontSize: 12, whiteSpace: "nowrap", fontWeight: 500 }}>{item.label}</span>
                  )}
                </motion.button>
                {isCollapsed && hoveredId === `bot-${item.id}` && (
                  <AnimatePresence>
                    <NavTooltip label={item.label} />
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Streak freeze nudge ─────────────────────────────── */}
        <AnimatePresence>
          {showStreakNudge && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                borderTop: "1px solid #1a2640",
                padding: isCollapsed ? "10px 6px" : "10px 10px",
                overflow: "hidden",
              }}
            >
              {isCollapsed ? (
                <div
                  title={`🧊 Streak at risk! Study to keep your ${streak}-day streak.`}
                  style={{
                    display: "flex", justifyContent: "center", alignItems: "center",
                    width: 34, height: 34, margin: "0 auto",
                    borderRadius: 9,
                    background: "rgba(249,115,22,0.15)",
                    border: "1px solid rgba(249,115,22,0.35)",
                    fontSize: 16, cursor: "default",
                  }}
                >
                  🧊
                </div>
              ) : (
                <motion.div
                  animate={{ borderColor: ["rgba(249,115,22,0.3)", "rgba(249,115,22,0.6)", "rgba(249,115,22,0.3)"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "rgba(249,115,22,0.1)",
                    border: "1px solid rgba(249,115,22,0.3)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#fb923c" }}>
                    🧊 Streak at risk!
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>
                    Study for 5 min to keep your {streak}-day streak.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Upgrade button ──────────────────────────────────── */}
        <div style={{
          borderTop: "1px solid #1a2640",
          padding: isCollapsed ? "12px 6px" : "12px 10px",
        }}>
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setHoveredId("upgrade")}
            onMouseLeave={() => setHoveredId(null)}
          >
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 18px rgba(124,58,237,0.35)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { router.push("/pricing"); onClose?.(); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: 9,
                width: "100%",
                padding: isCollapsed ? "9px 0" : "9px 12px",
                borderRadius: 10,
                border: "1px solid rgba(124,58,237,0.4)",
                background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.14) 100%)",
                cursor: "pointer",
                transition: "box-shadow 0.2s",
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>⚡</span>
              {!isCollapsed && (
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  background: "linear-gradient(90deg, #a78bfa, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  whiteSpace: "nowrap",
                }}>
                  Upgrade Plan
                </span>
              )}
            </motion.button>
            {isCollapsed && hoveredId === "upgrade" && (
              <AnimatePresence>
                <NavTooltip label="Upgrade Plan" />
              </AnimatePresence>
            )}
          </div>
        </div>

    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function DashboardSidebar() {
  const [isCollapsed, setIsCollapsed]   = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* ── Mobile hamburger ─────────────────────────────────── */}
      <button
        className="hamburger-btn"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* ── Mobile overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sidebar-overlay"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="mobile-drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{
              position: "fixed",
              top: 0, left: 0,
              width: 270,
              height: "100vh",
              background: "#060e1c",
              borderRight: "1px solid #1a2640",
              zIndex: 1001,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setIsMobileOpen(false)}
              style={{
                position: "absolute", top: 12, right: 12,
                background: "transparent",
                border: "1px solid #1e293b",
                borderRadius: 7,
                color: "#475569",
                fontSize: 14,
                cursor: "pointer",
                padding: "4px 8px",
                zIndex: 1,
              }}
            >
              ✕
            </button>
            <SidebarContent isCollapsed={false} onClose={() => setIsMobileOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <motion.div
        className="sidebar-desktop-wrap"
        animate={{ width: isCollapsed ? 64 : 248 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        style={{
          height: "100vh",
          background: "#060e1c",
          borderRight: "1px solid #1a2640",
          position: "sticky",
          top: 0,
          flexShrink: 0,
          overflow: "visible",
          zIndex: 10,
        }}
      >
        {/* Collapse toggle — floats on the right edge */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsCollapsed((p) => !p)}
          style={{
            position: "absolute",
            top: 18,
            right: -13,
            width: 26,
            height: 26,
            borderRadius: 99,
            background: "#1e293b",
            border: "1px solid #334155",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            zIndex: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? "›" : "‹"}
        </motion.button>

        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <SidebarContent isCollapsed={isCollapsed} />
        </div>
      </motion.div>
    </>
  );
}
