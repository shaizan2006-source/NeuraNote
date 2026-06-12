"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
    glow: "rgba(139,92,246,0.35)",
    activeColor: "#a78bfa",
  },
  {
    href: "/sage",
    label: "Sage",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
    glow: "rgba(34,211,238,0.35)",
    activeColor: "#22D3EE",
  },
  {
    href: "/focus",
    label: "Focus",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
        <line x1="8" y1="1.5" x2="8" y2="3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    glow: "rgba(124,58,237,0.35)",
    activeColor: "#8B5CF6",
  },
  {
    href: "/quiz",
    label: "Quiz",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2a6 6 0 100 12A6 6 0 008 2z" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6.5 6.5C6.5 5.67 7.17 5 8 5s1.5.67 1.5 1.5c0 .83-.67 1.5-1.5 1.5v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.6" fill="currentColor" />
      </svg>
    ),
    glow: "rgba(34,211,238,0.35)",
    activeColor: "#22D3EE",
  },
  {
    href: "/call-tutor",
    label: "Call Tutor",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" strokeWidth="1.3" />
        <path d="M4 12s0-2 4-2 4 2 4 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M11 10h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M12 9v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    glow: "rgba(245,158,11,0.35)",
    activeColor: "#F59E0B",
  },
];

function NavItem({ href, label, icon, glow, activeColor, isActive }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      style={{ textDecoration: "none", display: "block" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 180ms ease",
        background: isActive
          ? `${activeColor.replace(")", ", 0.12)").replace("#", "rgba(").replace("rgba(", "rgba(")}`
          : hovered
            ? "rgba(255,255,255,0.05)"
            : "transparent",
        border: isActive
          ? `1px solid ${activeColor.replace(")", "").replace("#", "")}22`
          : "1px solid transparent",
        boxShadow: hovered && !isActive ? `0 0 16px ${glow}` : "none",
        transform: hovered ? "translateX(2px)" : "translateX(0)",
        color: isActive ? activeColor : hovered ? "#e4e4e7" : "#71717a",
      }}>
        <span style={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          color: isActive ? activeColor : hovered ? "#e4e4e7" : "#52525b",
          transition: "color 180ms ease",
        }}>
          {icon}
        </span>
        <span style={{
          fontSize: 13,
          fontWeight: isActive ? 600 : 400,
          letterSpacing: "0.01em",
          transition: "color 180ms ease",
        }}>
          {label}
        </span>
        {isActive && (
          <span style={{
            marginLeft: "auto",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: activeColor,
            flexShrink: 0,
          }} />
        )}
      </div>
    </Link>
  );
}

export default function ExamsSidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      height: "100vh",
      background: "#0c0c0c",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      padding: "0 0 16px",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: "#fff",
          fontWeight: 700,
          flexShrink: 0,
        }}>
          ✦
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", letterSpacing: "0.01em" }}>
          AskMyNotes
        </span>
      </div>

      {/* Section label */}
      <p style={{
        margin: "4px 16px 6px",
        fontSize: 10,
        fontWeight: 600,
        color: "#3f3f46",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        Navigate
      </p>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px", flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "12px 16px 0",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <p style={{ margin: 0, fontSize: 10, color: "#3f3f46" }}>
          AskMyNotes • Study Smarter
        </p>
      </div>
    </aside>
  );
}
