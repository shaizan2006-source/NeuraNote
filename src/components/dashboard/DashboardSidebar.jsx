"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// lucide-react is NOT in the project — use inline SVG icons
function GridIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function ChatIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function FileIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { icon: GridIcon,  label: "Dashboard", href: "/dashboard"  },
  { icon: ChatIcon,  label: "Ask AI",    href: "/ask-ai"     },
  { icon: FileIcon,  label: "My PDFs",   href: "/my-pdfs"    },
];

function Tooltip({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.12 }}
      style={{
        position:    "absolute",
        left:        "calc(100% + 10px)",
        top:         "50%",
        transform:   "translateY(-50%)",
        background:  "#1F1F23",
        border:      "1px solid rgba(255,255,255,0.1)",
        borderRadius: 5,
        padding:     "3px 8px",
        fontSize:    9,
        color:       "#e4e4e7",
        whiteSpace:  "nowrap",
        pointerEvents: "none",
        zIndex:      300,
      }}
    >
      {label}
    </motion.div>
  );
}

function NavItems({ activePdfActive, pathname, router, sidebarCollapsed, hoveredItem, setHoveredItem, showTooltipFor, setShowTooltipFor, onItemClick }) {
  return (
    <nav style={{ flex: 1, padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        const hasCyanDot = href === "/my-pdfs" && activePdfActive;
        return (
          <div
            key={href}
            style={{ position: "relative" }}
            onMouseEnter={() => setHoveredItem(href)}
            onMouseLeave={() => { setHoveredItem(null); setShowTooltipFor(null); }}
          >
            <button
              onClick={() => { router.push(href); onItemClick?.(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: sidebarCollapsed ? 44 : "calc(100% - 12px)",
                padding: sidebarCollapsed ? "8px 0" : "8px 10px",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                background: isActive ? "rgba(139,92,246,0.12)" : "transparent",
                border: "none", borderRadius: 6, cursor: "pointer",
                color: isActive ? "#a78bfa" : "#52525b",
                transition: "background 150ms", margin: "0 6px",
              }}
            >
              <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                <Icon size={16} color={isActive ? "#a78bfa" : "#52525b"} />
                {sidebarCollapsed && isActive && (
                  <span style={{ position: "absolute", bottom: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "#8B5CF6" }} />
                )}
                {sidebarCollapsed && hasCyanDot && (
                  <span style={{ position: "absolute", bottom: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "#22D3EE" }} />
                )}
              </span>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}
                  >{label}</motion.span>
                )}
              </AnimatePresence>
            </button>
            <AnimatePresence>
              {sidebarCollapsed && showTooltipFor === href && <Tooltip label={label} />}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

export default function DashboardSidebar({ activePdfActive = false }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, dashboardMode, toggleDashboardMode } = useDashboard();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showTooltipFor, setShowTooltipFor] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Tooltip delay (collapsed, desktop only)
  useEffect(() => {
    if (!hoveredItem || !sidebarCollapsed) { setShowTooltipFor(null); return; }
    const t = setTimeout(() => setShowTooltipFor(hoveredItem), 200);
    return () => clearTimeout(t);
  }, [hoveredItem, sidebarCollapsed]);

  if (hydrated && isMobile) {
    return (
      <>
        {/* Hamburger trigger */}
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed", top: 14, left: 14, zIndex: 20,
            background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6, width: 36, height: 36, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#a1a1aa", fontSize: 16, cursor: "pointer",
          }}
        >☰</button>

        {/* Dark overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10,
              }}
            />
          )}
        </AnimatePresence>

        {/* Sidebar overlay */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: mobileOpen ? 0 : "-100%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position: "fixed", top: 0, left: 0, height: "100vh",
            width: "72%", maxWidth: 280, background: "#111111",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            display: "flex", flexDirection: "column",
            zIndex: 11, overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", minHeight: 52,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>AskMyNotes</span>
            <button onClick={() => setMobileOpen(false)}
              style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          {/* Nav (force-expanded on mobile) */}
          <NavItems
            activePdfActive={activePdfActive} pathname={pathname} router={router}
            sidebarCollapsed={false} hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem} showTooltipFor={showTooltipFor}
            setShowTooltipFor={setShowTooltipFor}
            onItemClick={() => setMobileOpen(false)}
          />

          {/* Mode toggle pill */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => { toggleDashboardMode(); setMobileOpen(false); }}
              style={{
                width: "100%", padding: "8px 0", borderRadius: 20,
                background: dashboardMode === "study"
                  ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.2))"
                  : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: dashboardMode === "study" ? "#a78bfa" : "#52525b",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              {dashboardMode === "study" ? "Study mode" : "Progress mode"}
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  // ── Desktop sidebar ──────────────────────────────────────────────
  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{
        height: "100vh", background: "#111111",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column",
        overflow: "hidden", flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: sidebarCollapsed ? "center" : "space-between",
        padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)", minHeight: 52,
      }}>
        {!sidebarCollapsed && (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", whiteSpace: "nowrap" }}
          >
            AskMyNotes
          </motion.span>
        )}
        <button
          onClick={toggleSidebar}
          style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 4, flexShrink: 0 }}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
      </div>

      <NavItems
        activePdfActive={activePdfActive} pathname={pathname} router={router}
        sidebarCollapsed={sidebarCollapsed} hoveredItem={hoveredItem}
        setHoveredItem={setHoveredItem} showTooltipFor={showTooltipFor}
        setShowTooltipFor={setShowTooltipFor}
      />

      {/* Expand button (collapsed only, bottom) */}
      {sidebarCollapsed && (
        <div style={{ padding: "8px 0", display: "flex", justifyContent: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={toggleSidebar}
            style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 14 }}>›</button>
        </div>
      )}
    </motion.aside>
  );
}
