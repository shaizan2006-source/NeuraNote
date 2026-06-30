"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { LogoMark } from "@/components/brand/Logo";
import PremiumMark from "@/components/brand/PremiumMark";

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
              {/* Logo layer — fades out on hover */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-primary)",
                opacity:    iconHovered ? 0 : 1,
                transition: "opacity 180ms ease",
              }}><LogoMark size={24} strokeWidth={1.8} /></div>
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
            width: 28, height: 28, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-primary)",
          }}><LogoMark size={24} strokeWidth={1.8} /></div>
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
function FocusIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="3" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="21" y2="12"/>
    </svg>
  );
}
function QuizIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9.5 9a3 3 0 0 1 5 1.5c0 2-3 3-3 3"/>
      <circle cx="12" cy="17" r="0.6" fill={color} stroke="none"/>
    </svg>
  );
}
function MicIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  );
}
function CalendarIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function BookIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function NetworkIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="18" r="2.2"/>
      <circle cx="12" cy="6" r="2.2"/>
      <circle cx="19" cy="16" r="2.2"/>
      <line x1="6.6" y1="16.4" x2="10.6" y2="7.8"/>
      <line x1="13.7" y1="7.4" x2="17.6" y2="14.5"/>
    </svg>
  );
}
function ClipboardIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="18" rx="2"/>
      <path d="M9 4a3 3 0 0 1 6 0"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}
function ProgressIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="20" y2="20"/>
      <line x1="7" y1="20" x2="7" y2="13"/>
      <line x1="12" y1="20" x2="12" y2="8"/>
      <line x1="17" y1="20" x2="17" y2="15"/>
    </svg>
  );
}
function ReviewIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="13" height="16" rx="2"/>
      <path d="M8 3h11a2 2 0 0 1 2 2v13"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { icon: GridIcon,      label: "Dashboard", href: "/dashboard"  },
  { icon: ChatIcon,      label: "Sage",      href: "/sage"       },
  { icon: BookIcon,      label: "PYQs",      href: "/pyqs"       },
  { icon: NetworkIcon,   label: "Brain Map", href: "/brain-map"  },
  { icon: ClipboardIcon, label: "Mock Test", href: "/mock-test"  },
  { icon: CalendarIcon,  label: "Exams",     href: "/exams"      },
  { icon: ProgressIcon,  label: "Progress",  href: "/progress"   },
  { icon: ReviewIcon,    label: "Review",    href: "/study"      },
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

// ── Initials from full name or email ──────────────────────────────
function getInitials(nameOrEmail = "") {
  const words = nameOrEmail.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

// ── User avatar section ───────────────────────────────────────────
function UserSection({ user, collapsed }) {
  const fullName = user?.user_metadata?.full_name || "";
  const email    = user?.email || "";
  const display  = fullName || email.split("@")[0] || "User";
  const initials = getInitials(fullName || email);

  const avatar = (
    <div style={{
      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
      background: "var(--accent-grad)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: "#fff",
    }}>
      {initials}
    </div>
  );

  if (collapsed) {
    return (
      <div style={{
        padding: "8px 0",
        display: "flex",
        justifyContent: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        {avatar}
      </div>
    );
  }

  return (
    <div style={{
      padding: "10px 10px",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      alignItems: "center",
      gap: 9,
    }}>
      {avatar}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: 600, color: "#e4e4e7",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {display}
        </p>
        <p style={{
          margin: "1px 0 0", fontSize: 9, color: "#52525b",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {email}
        </p>
      </div>
      <button style={{
        background: "transparent", border: "none",
        color: "#3f3f46", cursor: "pointer", fontSize: 14,
        padding: "2px 4px", flexShrink: 0,
      }}>⋯</button>
    </div>
  );
}

// ── Upgrade to Pro card ───────────────────────────────────────────
function UpgradePro({ router, collapsed }) {
  if (collapsed) return null;
  return (
    <div style={{
      margin: "0 8px 8px",
      padding: "12px",
      background: "color-mix(in srgb, var(--accent) 8%, transparent)",
      border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
        <PremiumMark size={16} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Upgrade to Pro</span>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.45 }}>
        Unlock unlimited AI, PDFs and advanced features.
      </p>
      <button
        onClick={() => router.push("/pricing")}
        style={{
          width: "100%",
          padding: "7px",
          background: "var(--accent-grad)",
          border: "none",
          borderRadius: 7,
          color: "var(--bg-base)",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          transition: "opacity 150ms ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        Upgrade Now →
      </button>
    </div>
  );
}

function NavItems({ pathname, router, sidebarCollapsed, hoveredItem, setHoveredItem, showTooltipFor, setShowTooltipFor, onItemClick }) {
  return (
    <nav style={{ flex: 1, padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        const isHovered = hoveredItem === href;
        const btnBg = isActive && isHovered
          ? "color-mix(in srgb, var(--accent) 14%, transparent)"
          : isActive
            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
            : isHovered
              ? "rgba(255,255,255,0.05)"
              : "transparent";
        const btnShadow = isActive && isHovered
          ? "0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent), 0 2px 16px var(--accent-glow-soft), inset 0 0 16px color-mix(in srgb, var(--accent) 8%, transparent)"
          : !isActive && isHovered
            ? "0 0 0 1px rgba(255,255,255,0.08), 0 2px 12px rgba(0,0,0,0.12)"
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
                color: isActive ? "var(--accent)" : isHovered ? "#e4e4e7" : "#a1a1aa",
                transition: "background 250ms ease-out, box-shadow 250ms ease-out, transform 200ms ease-out, color 200ms ease-out",
                margin: "0 6px",
              }}
            >
              <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                <Icon size={16} color={isActive ? "#D4AF6E" : isHovered ? "#e4e4e7" : "#a1a1aa"} />
                {sidebarCollapsed && isActive && (
                  <span style={{ position: "absolute", bottom: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
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
  const { sidebarCollapsed, toggleSidebar, user } = useDashboard();
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

          {/* Bottom: Upgrade to Pro + user section */}
          <div style={{ marginTop: "auto", paddingBottom: 4 }}>
            <UpgradePro router={router} collapsed={false} />
            <UserSection user={user} collapsed={false} />
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

        {/* Bottom: Upgrade to Pro + user section */}
        <div style={{ marginTop: "auto" }}>
          <UpgradePro router={router} collapsed={sidebarCollapsed} />
          <UserSection user={user} collapsed={sidebarCollapsed} />
        </div>
      </div>

    </motion.aside>
  );
}
