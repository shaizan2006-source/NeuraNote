// src/components/AskAI/AskAISidebar.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// Same SVG icons as DashboardSidebar
function GridIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function ChatIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function FileIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function PlusIcon() {
  return <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function ChevronIcon({ open }) {
  return <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 150ms" }}><polyline points="6 9 12 15 18 9"/></svg>;
}

const NAV_ITEMS = [
  { icon: GridIcon, label: "Dashboard", href: "/dashboard"  },
  { icon: ChatIcon, label: "Ask AI",    href: "/ask-ai"     },
  { icon: FileIcon, label: "My PDFs",   href: "/my-pdfs"    },
];

function Tooltip({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }}
      style={{
        position: "absolute", left: "calc(100% + 10px)", top: "50%",
        transform: "translateY(-50%)", background: "#1F1F23",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5,
        padding: "3px 8px", fontSize: 9, color: "#e4e4e7",
        whiteSpace: "nowrap", pointerEvents: "none", zIndex: 300,
      }}
    >{label}</motion.div>
  );
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AskAISidebar({
  userId,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  activePdf,
  onSelectPdf,
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useDashboard();

  const [hoveredItem, setHoveredItem] = useState(null);
  const [showTooltipFor, setShowTooltipFor] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [pdfsOpen, setPdfsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
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

  // Fetch recent conversations
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/conversations?user_id=${userId}`)
      .then(r => r.json())
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [userId]);

  // Fetch user PDFs
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-pdfs?user_id=${userId}`)
      .then(r => r.json())
      .then(data => setPdfs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [userId]);

  if (isMobile) {
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
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10 }}
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
            padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", minHeight: 52, gap: 6,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", flex: 1 }}>AskMyNotes</span>
            <button
              onClick={onNewChat}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                border: "1px solid rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 5,
                background: "transparent", color: "#a1a1aa",
                fontSize: 9, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}
            ><PlusIcon /> New Chat</button>
            <button onClick={() => setMobileOpen(false)}
              style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          {/* Nav */}
          <nav style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <button key={href}
                  onClick={() => { router.push(href); setMobileOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "calc(100% - 12px)", padding: "8px 10px", margin: "0 6px",
                    justifyContent: "flex-start",
                    background: isActive ? "rgba(139,92,246,0.12)" : "transparent",
                    border: "none", borderRadius: 6, cursor: "pointer",
                    color: isActive ? "#a78bfa" : "#52525b",
                  }}
                >
                  <Icon size={16} color={isActive ? "#a78bfa" : "#52525b"} />
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Recent Chats */}
          <div style={{ padding: "0 10px", marginTop: 4, flex: 1, overflowY: "auto" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0", margin: 0 }}>Recent</p>
            {conversations.length === 0 && <p style={{ fontSize: 9, color: "#27272a" }}>No conversations yet</p>}
            {conversations.map(conv => {
              const isActive = conv.id === activeConversationId;
              return (
                <button key={conv.id}
                  onClick={() => { onSelectConversation?.(conv.id); setMobileOpen(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "4px 10px", borderRadius: 4, margin: "2px 4px",
                    background: isActive ? "rgba(139,92,246,0.05)" : "transparent",
                    borderLeft: isActive ? "2px solid #8B5CF6" : "2px solid transparent",
                    border: "none", cursor: "pointer",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 9, color: isActive ? "#a1a1aa" : "#52525b",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
                    {conv.title || "Untitled"}
                  </p>
                  <p style={{ margin: 0, fontSize: 8, color: "#27272a" }}>{timeAgo(conv.updated_at)}</p>
                </button>
              );
            })}

            {/* PDFs */}
            <p style={{ fontSize: 9, fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0", marginTop: 8 }}>Your PDFs</p>
            {pdfs.length === 0 && <p style={{ fontSize: 9, color: "#27272a" }}>No PDFs uploaded</p>}
            {pdfs.map(pdf => {
              const isActivePdf = pdf.is_active;
              return (
                <button key={pdf.id}
                  onClick={() => { onSelectPdf?.(pdf.id); setMobileOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%",
                    padding: "4px 6px", borderRadius: 4, margin: "2px 0",
                    background: isActivePdf ? "rgba(34,211,238,0.05)" : "transparent",
                    border: "none", cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 10 }}>📄</span>
                  <span style={{ fontSize: 9, color: isActivePdf ? "#22D3EE" : "#52525b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pdf.name}</span>
                  {isActivePdf && <span style={{ fontSize: 8, color: "#22D3EE", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 3, padding: "1px 4px" }}>Active</span>}
                </button>
              );
            })}
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
      {/* Header row: logo + New Chat pill */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: sidebarCollapsed ? "center" : "space-between",
        padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)",
        minHeight: 52, gap: 6,
      }}>
        {!sidebarCollapsed && (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", whiteSpace: "nowrap", flex: 1 }}
          >
            AskMyNotes
          </motion.span>
        )}
        {!sidebarCollapsed && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            onClick={onNewChat}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "2px 8px", borderRadius: 5,
              background: "transparent", color: "#a1a1aa",
              fontSize: 9, fontWeight: 600, cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
          >
            <PlusIcon /> New Chat
          </motion.button>
        )}
        <button
          onClick={toggleSidebar}
          style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 14, flexShrink: 0 }}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Page nav */}
      <nav style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const hasCyanDot = href === "/my-pdfs" && activePdf;
          return (
            <div key={href} style={{ position: "relative" }}
              onMouseEnter={() => setHoveredItem(href)}
              onMouseLeave={() => { setHoveredItem(null); setShowTooltipFor(null); }}
            >
              <button
                onClick={() => router.push(href)}
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

      {/* Recent Chats (expanded only) */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ padding: "0 10px", marginTop: 4 }}
          >
            {/* Section header */}
            <button
              onClick={() => setChatsOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "transparent", border: "none",
                padding: "4px 0", cursor: "pointer", color: "#3f3f46",
                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              Recent <ChevronIcon open={chatsOpen} />
            </button>

            <AnimatePresence>
              {chatsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  {conversations.length === 0 && (
                    <p style={{ fontSize: 9, color: "#27272a", padding: "4px 0" }}>No conversations yet</p>
                  )}
                  {conversations.map(conv => {
                    const isActive = conv.id === activeConversationId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => onSelectConversation?.(conv.id)}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "4px 10px", borderRadius: 4, margin: "2px 4px",
                          background: isActive ? "rgba(139,92,246,0.05)" : "transparent",
                          borderLeft: isActive ? "2px solid #8B5CF6" : "2px solid transparent",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 9, color: isActive ? "#a1a1aa" : "#52525b",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                          {conv.title || "Untitled"}
                        </p>
                        <p style={{ margin: 0, fontSize: 8, color: "#27272a" }}>{timeAgo(conv.updated_at)}</p>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Your PDFs (expanded only) */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ padding: "0 10px", marginTop: 8, flex: 1 }}
          >
            <button
              onClick={() => setPdfsOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "transparent", border: "none",
                padding: "4px 0", cursor: "pointer", color: "#3f3f46",
                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              Your PDFs <ChevronIcon open={pdfsOpen} />
            </button>

            <AnimatePresence>
              {pdfsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  {pdfs.length === 0 && (
                    <p style={{ fontSize: 9, color: "#27272a", padding: "4px 0" }}>No PDFs uploaded</p>
                  )}
                  {pdfs.map(pdf => {
                    const isActivePdf = pdf.is_active;
                    return (
                      <button
                        key={pdf.id}
                        onClick={() => onSelectPdf?.(pdf.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          width: "100%", textAlign: "left",
                          padding: "4px 6px", borderRadius: 4, margin: "2px 0",
                          background: isActivePdf ? "rgba(34,211,238,0.05)" : "transparent",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 10 }}>📄</span>
                        <span style={{
                          fontSize: 9, color: isActivePdf ? "#22D3EE" : "#52525b",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
                        }}>{pdf.name}</span>
                        {isActivePdf && (
                          <span style={{
                            fontSize: 8, color: "#22D3EE",
                            background: "rgba(34,211,238,0.08)",
                            border: "1px solid rgba(34,211,238,0.2)",
                            borderRadius: 3, padding: "1px 4px", flexShrink: 0,
                          }}>Active</span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
