"use client";
export default function ActiveMode({ children }) {
  return (
    <div style={{ flex: 1 }}>
      {/* Active mode: minimal chrome — just the content */}
      {children}
    </div>
  );
}
