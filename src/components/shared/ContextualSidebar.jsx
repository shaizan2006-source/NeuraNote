"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// ── Icons ──────────────────────────────────────────────────────────────────────

function SidebarToggleIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <rect x="0.75" y="0.75" width="13.5" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.25 0.75V14.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function ChatIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TimerIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="14" r="7" />
      <polyline points="12 10 12 14 15 14" />
      <line x1="9" y1="3" x2="15" y2="3" />
      <line x1="12" y1="3" x2="12" y2="7" />
    </svg>
  );
}


function ZapIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ── Navigation config ──────────────────────────────────────────────────────────

const PAGE_META = {
  "/dashboard": { label: "Dashboard", Icon: GridIcon  },
  "/sage":      { label: "Sage",      Icon: ChatIcon  },
  "/focus":     { label: "Focus",     Icon: TimerIcon },
  "/quiz":      { label: "Quiz",      Icon: ZapIcon   },
};

// Always shown, always first — the two permanent navigation anchors
const PERMANENT_HREFS = ["/dashboard", "/sage"];

// Contextual destinations per route.
// Current page is never listed here so it is never rendered as a nav item.
const CONTEXTUAL_HREFS = {
  "/focus": ["/quiz"],
  "/quiz":  ["/focus"],
};

// ── Tooltip ────────────────────────────────────────────────────────────────────

function Tooltip({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.12 }}
      style={{
        position:     "absolute",
        left:         "calc(100% + 10px)",
        top:          "50%",
        transform:    "translateY(-50%)",
        background:   "var(--bg-surface-3)",
        border:       "1px solid var(--border-strong)",
        borderRadius: 5,
        padding:      "3px 8px",
        fontSize:     9,
        color:        "var(--text-primary)",
        whiteSpace:   "nowrap",
        pointerEvents:"none",
        zIndex:       300,
      }}
    >
      {label}
    </motion.div>
  );
}

// ── NavItem ────────────────────────────────────────────────────────────────────

function NavItem({ href, collapsed, pathname, router, onItemClick, showTooltip, onEnter, onLeave }) {
  const meta = PAGE_META[href];
  if (!meta) return null;
  const { label, Icon } = meta;

  const isActive = pathname === href || pathname.startsWith(href + "/");
  const [hov, setHov] = useState(false);

  const bg =
    isActive && hov ? "color-mix(in srgb, var(--accent) 18%, transparent)" :
    isActive        ? "color-mix(in srgb, var(--accent) 12%, transparent)" :
    hov             ? "rgba(255,255,255,0.05)" :
                      "transparent";

  const shadow =
    isActive && hov  ? "0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent), 0 2px 16px var(--accent-glow-soft), inset 0 0 16px color-mix(in srgb, var(--accent) 6%, transparent)" :
    !isActive && hov ? "0 0 0 1px rgba(255,255,255,0.08), 0 2px 12px rgba(0,0,0,0.12)" :
                       "none";

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => { setHov(true);  onEnter?.(); }}
      onMouseLeave={() => { setHov(false); onLeave?.(); }}
    >
      <button
        onClick={() => { router.push(href); onItemClick?.(); }}
        style={{
          display:              "flex",
          alignItems:           "center",
          gap:                  10,
          width:                collapsed ? 44 : "calc(100% - 12px)",
          padding:              collapsed ? "8px 0" : "8px 10px",
          justifyContent:       collapsed ? "center" : "flex-start",
          background:           bg,
          backdropFilter:       hov ? "blur(8px)" : "blur(0px)",
          WebkitBackdropFilter: hov ? "blur(8px)" : "blur(0px)",
          boxShadow:            shadow,
          transform:            hov ? "scale(1.01)" : "scale(1)",
          border:               "none",
          borderRadius:         6,
          cursor:               "pointer",
          color:                isActive ? "var(--accent)" : hov ? "var(--text-secondary)" : "var(--text-tertiary)",
          margin:               "0 6px",
          transition:           "background 250ms ease-out, box-shadow 250ms ease-out, transform 200ms ease-out, color 200ms ease-out",
        }}
      >
        <span style={{
          width:          28,
          height:         28,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
          position:       "relative",
        }}>
          <Icon size={16} />
          {collapsed && isActive && (
            <span style={{
              position:     "absolute",
              bottom:       2,
              right:        2,
              width:        5,
              height:       5,
              borderRadius: "50%",
              background:   "var(--accent)",
            }} />
          )}
        </span>

        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {collapsed && showTooltip && <Tooltip label={label} />}
      </AnimatePresence>
    </div>
  );
}

// ── SidebarHeader ─────────────────────────────────────────────────────────────
// Expanded: [✦ icon] [AskMyNotes] ············ [toggle button]
// Collapsed: [✦ icon] — hovering reveals the expand toggle via opacity crossfade

function SidebarHeader({ collapsed, onToggle }) {
  const [iconHovered, setIconHovered] = useState(false);
  const [btnHovered,  setBtnHovered]  = useState(false);

  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "10px",
      borderBottom:   "1px solid var(--border-hairline)",
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
                background: "var(--accent-grad)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: "var(--bg-base)", fontWeight: 700,
                opacity:    iconHovered ? 0 : 1,
                transition: "opacity 180ms ease",
              }}>✦</div>
              {/* Toggle icon layer — fades in on hover */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-primary)",
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
            background: "var(--accent-grad)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "var(--bg-base)", fontWeight: 700,
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
              style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}
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
                filter:     btnHovered ? "drop-shadow(0 0 3px rgba(245,245,244,0.22))" : "none",
                transition: "opacity 200ms ease, filter 200ms ease",
                color:      "var(--text-primary)",
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

// ── Section divider ────────────────────────────────────────────────────────────

function SectionDivider({ collapsed }) {
  return (
    <div style={{ padding: "6px 12px 2px" }}>
      <div style={{ height: 1, background: "var(--border-hairline)" }} />
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              paddingTop:    4,
              fontSize:      9,
              letterSpacing: "0.8px",
              color:         "var(--text-disabled)",
              fontWeight:    600,
              textTransform: "uppercase",
            }}
          >
            Explore
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ── Main component ─────────────────────────────────────────────────────────────

export default function ContextualSidebar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [collapsed,      setCollapsed]      = useState(false);
  const [isMobile,       setIsMobile]       = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [hydrated,       setHydrated]       = useState(false);
  const [hoveredItem,    setHoveredItem]    = useState(null);
  const [showTooltipFor, setShowTooltipFor] = useState(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("amn_ctx_sidebar_collapsed") === "true") setCollapsed(true);
    } catch {}
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    // Listen for programmatic collapse event (e.g., from Focus Mode Ask AI)
    const handleCollapseEvent = () => {
      setCollapsed(true);
      try { localStorage.setItem("amn_ctx_sidebar_collapsed", "true"); } catch {}
    };
    window.addEventListener("amn:sidebar:collapse", handleCollapseEvent);
    setHydrated(true);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("amn:sidebar:collapse", handleCollapseEvent);
    };
  }, []);

  // Delayed tooltip — only when sidebar is collapsed on desktop
  useEffect(() => {
    if (!hoveredItem || !collapsed) { setShowTooltipFor(null); return; }
    const t = setTimeout(() => setShowTooltipFor(hoveredItem), 200);
    return () => clearTimeout(t);
  }, [hoveredItem, collapsed]);

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("amn_ctx_sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  const contextualHrefs = CONTEXTUAL_HREFS[pathname] || [];

  // Helper: build a NavItem with shared props
  const renderNavItem = (href, onItemClick) => (
    <NavItem
      key={href}
      href={href}
      collapsed={collapsed}
      pathname={pathname}
      router={router}
      onItemClick={onItemClick}
      showTooltip={showTooltipFor === href}
      onEnter={() => setHoveredItem(href)}
      onLeave={() => setHoveredItem(null)}
    />
  );

  // Stable SSR placeholder — prevents layout shift before hydration
  if (!hydrated) {
    return (
      <div style={{
        width:       56,
        flexShrink:  0,
        background:  "var(--bg-elevated)",
        borderRight: "1px solid var(--border-hairline)",
      }} />
    );
  }

  // ── Mobile drawer ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Hamburger trigger */}
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          style={{
            position:   "fixed",
            top:        14,
            left:       14,
            zIndex:     20,
            background: "color-mix(in srgb, var(--bg-elevated) 90%, transparent)",
            border:     "1px solid var(--border-strong)",
            borderRadius: 6,
            width:      36,
            height:     36,
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            color:      "var(--text-secondary)",
            fontSize:   16,
            cursor:     "pointer",
          }}
        >
          ☰
        </button>

        {/* Backdrop */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position:   "fixed",
                inset:      0,
                background: "rgba(0,0,0,0.55)",
                zIndex:     10,
              }}
            />
          )}
        </AnimatePresence>

        {/* Slide-in drawer */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: mobileOpen ? 0 : "-100%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position:    "fixed",
            top:         0,
            left:        0,
            height:      "100vh",
            width:       "72%",
            maxWidth:    280,
            background:  "var(--bg-elevated)",
            borderRight: "1px solid var(--border-hairline)",
            display:     "flex",
            flexDirection: "column",
            zIndex:      11,
            overflow:    "hidden",
          }}
        >
          {/* Drawer header */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "10px 14px",
            borderBottom:   "1px solid var(--border-hairline)",
            minHeight:      52,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: "var(--accent-grad)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: "var(--bg-base)", fontWeight: 700,
              }}>✦</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>AskMyNotes</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 18 }}
            >
              ✕
            </button>
          </div>

          {/* Nav list */}
          <nav style={{ flex: 1, padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
            {PERMANENT_HREFS.map(href => renderNavItem(href, () => setMobileOpen(false)))}
            {contextualHrefs.length > 0 && (
              <>
                <SectionDivider collapsed={false} />
                {contextualHrefs.map(href => renderNavItem(href, () => setMobileOpen(false)))}
              </>
            )}
          </nav>
        </motion.div>
      </>
    );
  }

  // ── Desktop sidebar ───────────────────────────────────────────────────────────
  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{
        height:         "100vh",
        background:     "var(--bg-elevated)",
        borderRight:    "1px solid var(--border-hairline)",
        display:        "flex",
        flexDirection:  "column",
        overflow:       "visible",
        flexShrink:     0,
        position:       "sticky",
        top:            0,
        alignSelf:      "flex-start",
        zIndex:         10,
      }}
    >
      {/* Clips content during collapse animation while allowing the edge button to overflow */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SidebarHeader collapsed={collapsed} onToggle={toggleCollapsed} />

        <nav style={{ flex: 1, padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Permanent anchors — Dashboard + Ask AI, always present */}
          {PERMANENT_HREFS.map(href => renderNavItem(href))}

          {/* Contextual section — only when current route has extras */}
          {contextualHrefs.length > 0 && (
            <>
              <SectionDivider collapsed={collapsed} />
              {contextualHrefs.map(href => renderNavItem(href))}
            </>
          )}
        </nav>
      </div>

    </motion.aside>
  );
}
