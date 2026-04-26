"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// lucide-react is NOT in the project — use inline SVG icons
// Sidebar toggle icon — rounded rect split vertically (panel-left symbol)
function SidebarToggleIcon({ size = 15, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.75" y="0.75" width="13.5" height="13.5" rx="1.5" stroke={color} strokeWidth="1.2" />
      <path d="M5.25 0.75V14.25" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ── SidebarHeader ─────────────────────────────────────────────────────────────
// Expanded: [✦ icon] [AskMyNotes] ············ [toggle button]
// Collapsed: [✦ icon] — clicking/hovering icon reveals the expand toggle inline

function SidebarHeader({ collapsed, onToggle }) {
  const [iconHovered, setIconHovered] = useState(false);
  const [btnHovered,  setBtnHovered]  = useState(false);

  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "10px",
      borderBottom:   "1px solid rgba(255,255,255,0.05)",
      minHeight:      52,
    }}>
      {/* Left cluster: icon mark + app name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>

        {collapsed ? (
          /* Collapsed: icon IS the expand button; ✦ crossfades to toggle icon on hover */
          <button
            onClick={onToggle}
            onMouseEnter={() => setIconHovered(true)}
            onMouseLeave={() => setIconHovered(false)}
            title="Expand sidebar"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ position: "relative", width: 28, height: 28 }}>
              {/* Gradient logo layer — fades out on hover */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: 7,
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: "#fff", fontWeight: 700,
                opacity:    iconHovered ? 0 : 1,
                transition: "opacity 180ms ease",
              }}>✦</div>
              {/* Toggle icon layer — fades in on hover */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(228,228,231,0.9)",
                opacity:    iconHovered ? 1 : 0,
                transition: "opacity 180ms ease",
                pointerEvents: "none",
              }}>
                <SidebarToggleIcon size={15} />
              </div>
            </div>
          </button>
        ) : (
          /* Expanded: plain logo mark */
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "#fff", fontWeight: 700,
          }}>✦</div>
        )}

        {/* App name — fades in/out */}
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              key="app-name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", whiteSpace: "nowrap" }}
            >
              AskMyNotes
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Right: collapse toggle — only visible when expanded */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            key="toggle-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ flexShrink: 0 }}
          >
            <button
              onClick={onToggle}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              title="Collapse sidebar"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
                opacity:    btnHovered ? 1 : 0.45,
                filter:     btnHovered ? "drop-shadow(0 0 3px rgba(228,228,231,0.22))" : "none",
                transition: "opacity 200ms ease, filter 200ms ease",
                color:      "rgba(228,228,231,0.9)",
              }}
            >
              <SidebarToggleIcon size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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


const NAV_ITEMS = [
  { icon: GridIcon,  label: "Dashboard", href: "/dashboard"  },
  { icon: ChatIcon,  label: "Ask AI",    href: "/ask-ai"     },
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

function NavItems({ pathname, router, sidebarCollapsed, hoveredItem, setHoveredItem, showTooltipFor, setShowTooltipFor, onItemClick }) {
  return (
    <nav style={{ flex: 1, padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        const isHovered = hoveredItem === href;
        const btnBg = isActive && isHovered
          ? "rgba(139,92,246,0.18)"
          : isActive
            ? "rgba(139,92,246,0.12)"
            : isHovered
              ? "rgba(255,255,255,0.05)"
              : "transparent";
        const btnShadow = isActive && isHovered
          ? "0 0 0 1px rgba(139,92,246,0.22), 0 2px 16px rgba(139,92,246,0.10), inset 0 0 16px rgba(139,92,246,0.06)"
          : !isActive && isHovered
            ? "0 0 0 1px rgba(255,255,255,0.08), 0 2px 12px rgba(0,0,0,0.12), inset 0 0 12px rgba(34,211,238,0.03)"
            : "none";
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
                background: btnBg,
                backdropFilter: isHovered ? "blur(8px)" : "blur(0px)",
                WebkitBackdropFilter: isHovered ? "blur(8px)" : "blur(0px)",
                boxShadow: btnShadow,
                transform: isHovered ? "scale(1.01)" : "scale(1)",
                border: "none", borderRadius: 6, cursor: "pointer",
                color: isActive ? "#a78bfa" : isHovered ? "#a1a1aa" : "#52525b",
                transition: "background 250ms ease-out, box-shadow 250ms ease-out, transform 200ms ease-out, color 200ms ease-out",
                margin: "0 6px",
              }}
            >
              <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                <Icon size={16} color={isActive ? "#a78bfa" : "#52525b"} />
                {sidebarCollapsed && isActive && (
                  <span style={{ position: "absolute", bottom: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "#8B5CF6" }} />
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

export default function DashboardSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useDashboard();
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
            pathname={pathname} router={router}
            sidebarCollapsed={false}
            hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem} showTooltipFor={showTooltipFor}
            setShowTooltipFor={setShowTooltipFor}
            onItemClick={() => setMobileOpen(false)}
          />

          {/* Progress nav shortcut */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => { router.push("/progress"); setMobileOpen(false); }}
              style={{
                width: "100%", padding: "8px 0", borderRadius: 20,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#71717a",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                transition: "color 200ms ease-in-out",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#a1a1aa"}
              onMouseLeave={e => e.currentTarget.style.color = "#71717a"}
            >
              View Progress →
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
        overflow: "visible", flexShrink: 0,
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
      }}
    >
      {/* Inner wrapper — clips content during collapse animation */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SidebarHeader collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

        <NavItems
          pathname={pathname} router={router}
          sidebarCollapsed={sidebarCollapsed}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem} showTooltipFor={showTooltipFor}
          setShowTooltipFor={setShowTooltipFor}
        />
      </div>

    </motion.aside>
  );
}
