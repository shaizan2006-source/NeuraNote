// src/components/AskAI/AskAISidebar.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { loadAllChats, registerChat, deleteChat, renameChat } from "@/lib/chatStorage";
import { clientFetch } from "@/lib/clientFetch";
import { LogoMark } from "@/components/brand/Logo";

// ── Icons ────────────────────────────────────────────────────────────
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
// Expanded: [✦] [title] ·· [New Chat] [toggle]
// Collapsed: [✦] — hover crossfades to expand toggle

function SidebarHeader({ collapsed, onToggle, title, onNewChat }) {
  const [iconHov, setIconHov] = useState(false);
  const [btnHov,  setBtnHov]  = useState(false);

  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "10px",
      borderBottom: "1px solid var(--border-hairline)",
      minHeight: 52, gap: 6,
    }}>
      {/* Icon: clickable toggle when collapsed, plain mark when expanded */}
      {collapsed ? (
        <button
          onClick={onToggle}
          onMouseEnter={() => setIconHov(true)}
          onMouseLeave={() => setIconHov(false)}
          title="Expand sidebar"
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
        >
          <div style={{ position: "relative", width: 28, height: 28 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-primary)",
              opacity: iconHov ? 0 : 1, transition: "opacity 180ms ease",
            }}><LogoMark size={22} strokeWidth={1.8} /></div>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-secondary)",
              opacity: iconHov ? 1 : 0, transition: "opacity 180ms ease",
              pointerEvents: "none",
            }}>
              <SidebarToggleIcon size={15} color="var(--text-secondary)" />
            </div>
          </div>
        </button>
      ) : (
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-primary)",
        }}><LogoMark size={22} strokeWidth={1.8} /></div>
      )}

      {/* Title */}
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            key="title"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", flex: 1 }}
          >{title}</motion.span>
        )}
      </AnimatePresence>

      {/* Right controls: New Chat + collapse toggle */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            key="right-ctrls"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
          >
            {onNewChat && (
              <button
                onClick={onNewChat}
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  border: "1px solid var(--border-strong)",
                  padding: "2px 8px", borderRadius: 5,
                  background: "transparent", color: "var(--text-secondary)",
                  fontSize: 9, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <PlusIcon /> New Chat
              </button>
            )}
            <button
              onClick={onToggle}
              onMouseEnter={() => setBtnHov(true)}
              onMouseLeave={() => setBtnHov(false)}
              title="Collapse sidebar"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
                opacity: btnHov ? 1 : 0.45,
                filter: btnHov ? "drop-shadow(0 0 3px color-mix(in srgb, var(--text-primary) 22%, transparent))" : "none",
                transition: "opacity 200ms ease, filter 200ms ease",
                color: "var(--text-secondary)",
              }}
            >
              <SidebarToggleIcon size={15} color="var(--text-secondary)" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GridIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function ChatIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function FocusIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>;
}
function QuizIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a3 3 0 0 1 5 1.5c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.6" fill={color} stroke="none"/></svg>;
}
function MicIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;
}
function CalendarIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function PlusIcon() {
  return <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function ChevronIcon({ open }) {
  return <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 150ms" }}><polyline points="6 9 12 15 18 9"/></svg>;
}

// ── Minimal spinner — appears only next to the item being saved ──────
function Spinner() {
  return (
    <>
      <style>{`@keyframes amn-sidebar-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        border: "1.5px solid var(--border-hairline)",
        borderTopColor: "var(--ai-signal)",
        animation: "amn-sidebar-spin 0.7s linear infinite",
        flexShrink: 0,
      }} />
    </>
  );
}

const NAV_ITEMS = [
  { icon: GridIcon, label: "Dashboard", href: "/dashboard" },
  { icon: ChatIcon, label: "Sage",      href: "/sage"      },
];

function Tooltip({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }}
      style={{
        position: "absolute", left: "calc(100% + 10px)", top: "50%",
        transform: "translateY(-50%)", background: "var(--bg-surface-3)",
        border: "1px solid var(--border-strong)", borderRadius: 5,
        padding: "3px 8px", fontSize: 9, color: "var(--text-primary)",
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

// Convert localStorage Chat to the shape ConversationItem expects
function chatToConv(chat) {
  return {
    id:         chat.id,
    title:      chat.title || "New Chat",
    updated_at: new Date(chat.updatedAt || Date.now()).toISOString(),
  };
}

// ── Inline SVG icons ──────────────────────────────────────────────────
function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: 0.85 }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: 0.85 }}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  );
}

// ── Conversation menu item ────────────────────────────────────────────
function MenuItem({ label, danger, icon, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", textAlign: "left",
        padding: "5px 10px", borderRadius: 4, border: "none",
        cursor: "pointer", fontSize: 9,
        color: danger ? (hovered ? "var(--error)" : "var(--error)") : (hovered ? "var(--text-primary)" : "var(--text-secondary)"),
        background: hovered
          ? (danger ? "color-mix(in srgb, var(--error) 12%, transparent)" : "var(--bg-surface-3)")
          : "transparent",
        transition: "background 100ms, color 100ms",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Conversation list item with hover-reveal ellipsis menu ────────────
function ConversationItem({
  conv, isActive,
  menuOpenId, setMenuOpenId,
  renamingId, setRenamingId, renameValue, setRenameValue,
  onSelect, onRename, onDelete,
}) {
  const [hovered, setHovered]   = useState(false);
  const [menuPos, setMenuPos]   = useState({ bottom: 0, right: 0 });
  const renameInputRef          = useRef(null);
  const triggerRef              = useRef(null);
  const isMenuOpen              = menuOpenId === conv.id;
  const isRenaming              = renamingId === conv.id;

  // Auto-focus the rename input when it mounts
  useEffect(() => {
    if (isRenaming) {
      const t = setTimeout(() => renameInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isRenaming]);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isRenaming ? (
        /* Inline rename input */
        <div style={{ padding: "2px 4px 2px 6px" }}>
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter")  { e.preventDefault(); onRename(conv.id); }
              if (e.key === "Escape") setRenamingId(null);
            }}
            onBlur={() => onRename(conv.id)}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "var(--bg-inset)",
              border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
              borderRadius: 4, padding: "3px 6px",
              fontSize: 9, color: "var(--text-primary)", outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      ) : (
        /* Normal row */
        <button
          onClick={() => onSelect(conv.id)}
          style={{
            display: "flex", alignItems: "center",
            width: "100%", textAlign: "left",
            padding: "4px 10px", paddingRight: (hovered || isMenuOpen) ? 28 : 10,
            borderRadius: 4, margin: "2px 0",
            background: isActive ? "var(--bg-surface-2)" : "transparent",
            borderWidth: 0, borderStyle: "solid", borderColor: "transparent",
            borderLeftWidth: 2, borderLeftStyle: "solid",
            borderLeftColor: isActive ? "var(--accent-dim)" : "transparent",
            cursor: "pointer",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 9,
              color: isActive ? "var(--text-secondary)" : "var(--text-tertiary)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{conv.title || "Untitled"}</p>
            <p style={{ margin: 0, fontSize: 8, color: "var(--text-disabled)" }}>{timeAgo(conv.updated_at)}</p>
          </div>
        </button>
      )}

      {/* Ellipsis trigger — visible on hover or while menu is open */}
      {!isRenaming && (hovered || isMenuOpen) && (
        <button
          ref={triggerRef}
          className="amn-menu-trigger"
          onClick={e => {
            e.stopPropagation();
            if (!isMenuOpen) {
              const rect = triggerRef.current?.getBoundingClientRect();
              if (rect) setMenuPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
            }
            setMenuOpenId(isMenuOpen ? null : conv.id);
          }}
          style={{
            position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
            width: 18, height: 18, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isMenuOpen ? "var(--bg-surface-3)" : "var(--bg-surface-2)",
            border: "none", borderRadius: 3, cursor: "pointer",
            color: "var(--text-tertiary)", fontSize: 14, letterSpacing: 1,
            lineHeight: 1,
          }}
        >···</button>
      )}

      {/* Floating menu — fixed so it escapes overflow:hidden parents */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="amn-menu-popup"
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.1 }}
            style={{
              position: "fixed", bottom: menuPos.bottom, right: menuPos.right,
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-strong)",
              borderRadius: 6, zIndex: 9999,
              minWidth: 120, padding: 4,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <MenuItem
              label="Rename"
              icon={<PencilIcon />}
              onClick={() => {
                setMenuOpenId(null);
                setRenamingId(conv.id);
                setRenameValue(conv.title || "");
              }}
            />
            <MenuItem
              label="Delete"
              icon={<TrashIcon />}
              danger
              onClick={() => {
                setMenuOpenId(null);
                onDelete(conv.id);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PDF list item with hover-reveal ellipsis menu ────────────────────
function PdfListItem({
  pdf, isActive,
  pdfMenuOpenId, setPdfMenuOpenId,
  pdfRenamingId, setPdfRenamingId, pdfRenameValue, setPdfRenameValue,
  onSelect, onRename, onDelete,
}) {
  const [hovered, setHovered] = useState(false);
  const [menuPos, setMenuPos] = useState({ bottom: 0, right: 0 });
  const renameInputRef        = useRef(null);
  const triggerRef            = useRef(null);
  const isMenuOpen            = pdfMenuOpenId === pdf.id;
  const isRenaming            = pdfRenamingId === pdf.id;

  useEffect(() => {
    if (isRenaming) {
      const t = setTimeout(() => renameInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isRenaming]);

  if (pdf._saving) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", opacity: 0.7 }}>
        <span style={{ fontSize: 10, flexShrink: 0 }}>📄</span>
        <span style={{ fontSize: 9, color: "var(--text-tertiary)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pdf.name}</span>
        <Spinner />
      </div>
    );
  }

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isRenaming ? (
        <div style={{ padding: "2px 4px 2px 6px" }}>
          <input
            ref={renameInputRef}
            value={pdfRenameValue}
            onChange={e => setPdfRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter")  { e.preventDefault(); onRename(pdf.id); }
              if (e.key === "Escape") setPdfRenamingId(null);
            }}
            onBlur={() => onRename(pdf.id)}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "var(--bg-inset)",
              border: "1px solid color-mix(in srgb, var(--info) 40%, transparent)",
              borderRadius: 4, padding: "3px 6px",
              fontSize: 9, color: "var(--text-primary)", outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => onSelect(pdf)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            width: "100%", textAlign: "left",
            padding: "4px 6px", paddingRight: (hovered || isMenuOpen) ? 28 : 6,
            borderRadius: 4, margin: "2px 0",
            background: isActive ? "color-mix(in srgb, var(--info) 6%, transparent)" : "transparent",
            border: "none", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 10, flexShrink: 0 }}>📄</span>
          <span style={{
            fontSize: 9,
            color: isActive ? "var(--info)" : "var(--text-tertiary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
          }}>{pdf.name}</span>
          {isActive && (
            <span style={{
              fontSize: 8, color: "var(--info)",
              background: "color-mix(in srgb, var(--info) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--info) 25%, transparent)",
              borderRadius: 3, padding: "1px 4px", flexShrink: 0,
            }}>Active</span>
          )}
        </button>
      )}

      {/* Ellipsis trigger */}
      {!isRenaming && !pdf._saving && (hovered || isMenuOpen) && (
        <button
          ref={triggerRef}
          className="amn-menu-trigger"
          onClick={e => {
            e.stopPropagation();
            if (!isMenuOpen) {
              const rect = triggerRef.current?.getBoundingClientRect();
              if (rect) setMenuPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
            }
            setPdfMenuOpenId(isMenuOpen ? null : pdf.id);
          }}
          style={{
            position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
            width: 18, height: 18, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isMenuOpen ? "var(--bg-surface-3)" : "var(--bg-surface-2)",
            border: "none", borderRadius: 3, cursor: "pointer",
            color: "var(--text-tertiary)", fontSize: 14, letterSpacing: 1, lineHeight: 1,
          }}
        >···</button>
      )}

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="amn-menu-popup"
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.1 }}
            style={{
              position: "fixed", bottom: menuPos.bottom, right: menuPos.right,
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border-strong)",
              borderRadius: 6, zIndex: 9999,
              minWidth: 120, padding: 4,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <MenuItem
              label="Rename"
              icon={<PencilIcon />}
              onClick={() => {
                setPdfMenuOpenId(null);
                setPdfRenamingId(pdf.id);
                setPdfRenameValue(pdf.name || "");
              }}
            />
            <MenuItem
              label="Delete"
              icon={<TrashIcon />}
              danger
              onClick={() => {
                setPdfMenuOpenId(null);
                onDelete(pdf.id);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const uploadInputRef = useRef(null);

  const [hoveredItem, setHoveredItem]     = useState(null);
  const [showTooltipFor, setShowTooltipFor] = useState(null);
  const [conversations, setConversations] = useState([]);
  // pdfs: [{ id, name, is_active?, _saving?, _file? }]
  // _saving: true while being stored to server
  // _file:   File object retained for lazy parse (cleared after first parse trigger)
  const [pdfs, setPdfs]           = useState([]);
  const [chatsOpen, setChatsOpen] = useState(false);
  const [pdfsOpen, setPdfsOpen]   = useState(false);
  const [isMobile, setIsMobile]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated]   = useState(false);

  // ── Conversation ellipsis menu state ────────────────────────────
  const [menuOpenId,   setMenuOpenId]   = useState(null);
  const [renamingId,   setRenamingId]   = useState(null);
  const [renameValue,  setRenameValue]  = useState("");

  // ── PDF ellipsis menu state ──────────────────────────────────────
  const [pdfMenuOpenId,  setPdfMenuOpenId]  = useState(null);
  const [pdfRenamingId,  setPdfRenamingId]  = useState(null);
  const [pdfRenameValue, setPdfRenameValue] = useState("");

  // ── Hydration + mobile detection ────────────────────────────────
  useEffect(() => {
    setHydrated(true);
    // Load conversations from localStorage now that we're on the client
    try { setConversations(loadAllChats().map(chatToConv)); } catch {}
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Tooltip delay (collapsed desktop only) ──────────────────────
  useEffect(() => {
    if (!hoveredItem || !sidebarCollapsed) { setShowTooltipFor(null); return; }
    const t = setTimeout(() => setShowTooltipFor(hoveredItem), 200);
    return () => clearTimeout(t);
  }, [hoveredItem, sidebarCollapsed]);

  // ── Close any open menu on outside click or Escape ──────────────
  useEffect(() => {
    const anyOpen = menuOpenId || pdfMenuOpenId;
    if (!anyOpen) return;
    function onMouseDown(e) {
      if (!e.target.closest(".amn-menu-popup") && !e.target.closest(".amn-menu-trigger")) {
        setMenuOpenId(null);
        setPdfMenuOpenId(null);
      }
    }
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setMenuOpenId(null);    setRenamingId(null);
        setPdfMenuOpenId(null); setPdfRenamingId(null);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown",   onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown",   onKeyDown);
    };
  }, [menuOpenId, pdfMenuOpenId]);

  // Close rename inputs on Escape when no menu is open
  useEffect(() => {
    if (!renamingId && !pdfRenamingId) return;
    function onKeyDown(e) {
      if (e.key === "Escape") { setRenamingId(null); setPdfRenamingId(null); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [renamingId, pdfRenamingId]);

  // ── Rename handler ────────────────────────────────────────────────
  async function handleRename(convId) {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    renameChat(convId, trimmed); // updates localStorage + fires askmynotes:chats-updated
    try {
      await clientFetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        body:   JSON.stringify({ title: trimmed }),
      });
    } catch {}
  }

  // ── Delete handler ────────────────────────────────────────────────
  async function handleDelete(convId) {
    deleteChat(convId); // updates localStorage + fires askmynotes:chats-updated
    if (activeConversationId === convId) onNewChat?.();
    try {
      await clientFetch(`/api/conversations/${convId}`, { method: "DELETE" });
    } catch {}
  }

  // ── PDF rename handler ────────────────────────────────────────────
  async function handlePdfRename(pdfId) {
    const trimmed = pdfRenameValue.trim();
    setPdfRenamingId(null);
    if (!trimmed) return;
    setPdfs(prev => prev.map(p => p.id === pdfId ? { ...p, name: trimmed } : p));
    try {
      await clientFetch("/api/user-pdfs", {
        method: "PATCH",
        body:   JSON.stringify({ id: pdfId, name: trimmed }),
      });
    } catch {}
  }

  // ── PDF delete handler ────────────────────────────────────────────
  async function handlePdfDelete(pdfId) {
    setPdfs(prev => prev.filter(p => p.id !== pdfId));
    if (activePdf?.id === pdfId) onSelectPdf?.(null);
    try {
      await clientFetch(`/api/delete-pdf?id=${encodeURIComponent(pdfId)}`, { method: "DELETE" });
    } catch {}
  }

  // ── Reload conversations from localStorage on any chat update ────
  useEffect(() => {
    function onUpdate() {
      setConversations(loadAllChats().map(chatToConv));
    }
    window.addEventListener("askmynotes:chats-updated", onUpdate);
    return () => window.removeEventListener("askmynotes:chats-updated", onUpdate);
  }, []);

  // ── Register new conversation immediately in localStorage ────────
  // Fires when a first message is sent and Supabase creates the thread.
  // This makes the sidebar show the entry before messages fully settle.
  useEffect(() => {
    function onNewConv(e) {
      const { id, title } = e.detail;
      registerChat(id, title || "New Chat");
      // askmynotes:chats-updated fires inside registerChat — no need to setConversations here
    }
    window.addEventListener("askmynotes:new-conversation", onNewConv);
    return () => window.removeEventListener("askmynotes:new-conversation", onNewConv);
  }, []);

  // ── Fetch user PDFs ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    clientFetch("/api/user-pdfs")
      .then(r => r?.json())
      .then(data => setPdfs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [userId]);

  // ── File selected: store metadata only, no parsing ───────────────
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be re-selected
    if (!file || !userId) return;
    if (file.type !== "application/pdf") return;
    if (file.size > 20 * 1024 * 1024) return;

    const tempId = `tmp_${Date.now()}`;

    // Optimistic: add to top of list with spinner
    setPdfs(prev => [{ id: tempId, name: file.name, _saving: true }, ...prev]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const res  = await fetch("/api/store-pdf-only", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      // Replace temp item with real item; retain File object for lazy parsing
      setPdfs(prev => prev.map(p =>
        p.id === tempId
          ? { id: data.id, name: data.name, is_active: false, _file: file }
          : p
      ));
    } catch {
      // Remove failed item silently
      setPdfs(prev => prev.filter(p => p.id !== tempId));
    }
  }

  // ── PDF clicked: apply active state, then lazily trigger parsing ─
  function handlePdfClick(pdf) {
    // Update active state locally for immediate feedback
    setPdfs(prev => prev.map(p => ({ ...p, is_active: p.id === pdf.id })));
    onSelectPdf?.(pdf.id);

    // Lazy parse: only if file object is present (newly stored, not yet parsed)
    if (pdf._file) {
      fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: pdf.id, userId }),
      })
        .then(() => {
          // Clear _file reference once parse is dispatched successfully
          setPdfs(prev => prev.map(p => p.id === pdf.id ? { ...p, _file: undefined } : p));
        })
        .catch(() => {}); // Non-fatal — PDF is still usable, parse will retry on next click
    }
  }

  // ── Mobile sidebar ───────────────────────────────────────────────
  if (hydrated && isMobile) {
    return (
      <>
        {/* Hamburger trigger */}
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed", top: 14, left: 14, zIndex: 20,
            background: "color-mix(in srgb, var(--bg-elevated) 90%, transparent)", border: "1px solid var(--border-hairline)",
            borderRadius: 6, width: 36, height: 36, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "var(--text-secondary)", fontSize: 16, cursor: "pointer",
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

        {/* Hidden file input */}
        <input
          ref={uploadInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        {/* Sidebar overlay */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: mobileOpen ? 0 : "-100%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position: "fixed", top: 0, left: 0, height: "100vh",
            width: "72%", maxWidth: 280, background: "var(--bg-elevated)",
            borderRight: "1px solid var(--border-hairline)",
            display: "flex", flexDirection: "column",
            zIndex: 11, overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderBottom: "1px solid var(--border-hairline)", minHeight: 52, gap: 6,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>AskMyNotes</span>
            <button
              onClick={onNewChat}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                border: "1px solid var(--border-strong)", padding: "2px 8px", borderRadius: 5,
                background: "transparent", color: "var(--text-secondary)",
                fontSize: 9, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}
            ><PlusIcon /> New Chat</button>
            <button onClick={() => setMobileOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 18 }}>✕</button>
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
                    background: isActive ? "var(--bg-surface-2)" : "transparent",
                    border: "none", borderRadius: 6, cursor: "pointer",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  <Icon size={16} color={isActive ? "var(--text-primary)" : "var(--text-secondary)"} />
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Scrollable content */}
          <div style={{ padding: "0 10px", marginTop: 4, flex: 1, overflowY: "auto" }}>
            {/* Recent chats */}
            <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0", margin: 0 }}>Recent</p>
            {conversations.length === 0 && <p style={{ fontSize: 9, color: "var(--text-disabled)" }}>No conversations yet</p>}
            {conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConversationId}
                menuOpenId={menuOpenId}   setMenuOpenId={setMenuOpenId}
                renamingId={renamingId}   setRenamingId={setRenamingId}
                renameValue={renameValue} setRenameValue={setRenameValue}
                onSelect={id => { onSelectConversation?.(id); setMobileOpen(false); }}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}

            {/* Your PDFs */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", marginTop: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Your PDFs</p>
              <button
                onClick={() => uploadInputRef.current?.click()}
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: "transparent", border: "1px solid var(--border-strong)",
                  borderRadius: 4, padding: "2px 6px",
                  fontSize: 8, fontWeight: 600, color: "var(--text-tertiary)", cursor: "pointer",
                }}
              >
                <PlusIcon /> Save PDF
              </button>
            </div>
            {pdfs.length === 0 && <p style={{ fontSize: 9, color: "var(--text-disabled)" }}>No PDFs saved</p>}
            {pdfs.map(pdf => (
              <PdfListItem
                key={pdf.id}
                pdf={pdf}
                isActive={pdf.is_active || activePdf?.id === pdf.id}
                pdfMenuOpenId={pdfMenuOpenId}   setPdfMenuOpenId={setPdfMenuOpenId}
                pdfRenamingId={pdfRenamingId}   setPdfRenamingId={setPdfRenamingId}
                pdfRenameValue={pdfRenameValue} setPdfRenameValue={setPdfRenameValue}
                onSelect={p => { handlePdfClick(p); setMobileOpen(false); }}
                onRename={handlePdfRename}
                onDelete={handlePdfDelete}
              />
            ))}
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
        height: "100vh", background: "var(--bg-elevated)",
        borderRight: "1px solid var(--border-hairline)",
        display: "flex", flexDirection: "column",
        overflow: "visible", flexShrink: 0,
        position: "sticky", top: 0, alignSelf: "flex-start",
      }}
    >
      {/* Inner wrapper — clips content during collapse animation */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Hidden file input */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      <SidebarHeader
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        title="AskMyNotes"
        onNewChat={onNewChat}
      />

      {/* Page nav */}
      <nav style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const hasCyanDot = href === "/my-pdfs" && activePdf;
          const isHovered = hoveredItem === href;
          const navBg = isActive && isHovered
            ? "var(--bg-surface-3)"
            : isActive
              ? "var(--bg-surface-2)"
              : isHovered
                ? "var(--bg-surface-2)"
                : "transparent";
          const navShadow = isActive && isHovered
            ? "var(--shadow-card)"
            : !isActive && isHovered
              ? "0 0 0 1px var(--border-strong), 0 2px 12px rgba(0,0,0,0.12)"
              : "none";
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
                  background: navBg,
                  backdropFilter: isHovered ? "blur(8px)" : "blur(0px)",
                  WebkitBackdropFilter: isHovered ? "blur(8px)" : "blur(0px)",
                  boxShadow: navShadow,
                  transform: isHovered ? "scale(1.01)" : "scale(1)",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  color: isActive ? "var(--text-primary)" : isHovered ? "var(--text-primary)" : "var(--text-secondary)",
                  transition: "background 250ms ease-out, box-shadow 250ms ease-out, transform 200ms ease-out, color 200ms ease-out",
                  margin: "0 6px",
                }}
              >
                <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                  <Icon size={16} color={isActive ? "var(--text-primary)" : isHovered ? "var(--text-primary)" : "var(--text-secondary)"} />
                  {sidebarCollapsed && isActive && (
                    <span style={{ position: "absolute", bottom: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
                  )}
                  {sidebarCollapsed && hasCyanDot && (
                    <span style={{ position: "absolute", bottom: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "var(--info)" }} />
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
            <button
              onClick={() => setChatsOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "transparent", border: "none",
                padding: "4px 0", cursor: "pointer", color: "var(--text-secondary)",
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
                    <p style={{ fontSize: 9, color: "var(--text-disabled)", padding: "4px 0" }}>No conversations yet</p>
                  )}
                  {conversations.map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conv={conv}
                      isActive={conv.id === activeConversationId}
                      menuOpenId={menuOpenId}   setMenuOpenId={setMenuOpenId}
                      renamingId={renamingId}   setRenamingId={setRenamingId}
                      renameValue={renameValue} setRenameValue={setRenameValue}
                      onSelect={id => onSelectConversation?.(id)}
                      onRename={handleRename}
                      onDelete={handleDelete}
                    />
                  ))}
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
            style={{ padding: "0 10px", marginTop: 8, flex: 1, overflowY: "auto" }}
          >
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
              <button
                onClick={() => setPdfsOpen(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "transparent", border: "none",
                  cursor: "pointer", color: "var(--text-tertiary)",
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                }}
              >
                Your PDFs <ChevronIcon open={pdfsOpen} />
              </button>

              <button
                onClick={() => uploadInputRef.current?.click()}
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: "transparent",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 4, padding: "2px 6px",
                  fontSize: 8, fontWeight: 600, color: "var(--text-tertiary)",
                  cursor: "pointer",
                  transition: "border-color 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "color-mix(in srgb, var(--info) 40%, transparent)";
                  e.currentTarget.style.color = "var(--info)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
                title="Save a PDF"
              >
                + Save PDF
              </button>
            </div>

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
                    <p style={{ fontSize: 9, color: "var(--text-disabled)", padding: "4px 0" }}>No PDFs saved</p>
                  )}
                  {pdfs.map(pdf => (
                    <PdfListItem
                      key={pdf.id}
                      pdf={pdf}
                      isActive={pdf.is_active || activePdf?.id === pdf.id}
                      pdfMenuOpenId={pdfMenuOpenId}   setPdfMenuOpenId={setPdfMenuOpenId}
                      pdfRenamingId={pdfRenamingId}   setPdfRenamingId={setPdfRenamingId}
                      pdfRenameValue={pdfRenameValue} setPdfRenameValue={setPdfRenameValue}
                      onSelect={handlePdfClick}
                      onRename={handlePdfRename}
                      onDelete={handlePdfDelete}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      </div>{/* end inner wrapper */}

    </motion.aside>
  );
}
