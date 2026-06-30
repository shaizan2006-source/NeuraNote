import { LogoMark } from "@/components/brand/Logo";

/**
 * Root loading UI — shown during any route's load/transition so there's never a white screen.
 * A centered branded mark + an indeterminate accent bar. Per-route loading.js files override
 * this with tailored skeletons (e.g. the dashboard). Server component, tokens only.
 */
export default function Loading() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 22, background: "var(--bg-base)",
    }}>
      <style>{`
        @keyframes amnRouteBar { 0% { transform: translateX(-110%); } 100% { transform: translateX(320%); } }
        @keyframes amnRouteFade { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
      `}</style>
      <div style={{ color: "var(--text-primary)", animation: "amnRouteFade 1.8s ease-in-out infinite" }}>
        <LogoMark size={42} strokeWidth={1.6} />
      </div>
      <div style={{ width: 120, height: 3, borderRadius: 3, background: "var(--bg-surface-2)", overflow: "hidden", position: "relative" }}>
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%", width: "40%",
          borderRadius: 3, background: "var(--accent-grad)",
          animation: "amnRouteBar 1.1s ease-in-out infinite",
        }} />
      </div>
    </div>
  );
}
