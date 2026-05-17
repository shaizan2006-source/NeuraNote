"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName = "",
  subtext = "This action cannot be undone.",
}) {
  const cancelRef = useRef(null);
  const modalRef  = useRef(null);

  // Auto-focus cancel button when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => cancelRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isOpen]);

  // ESC + focus trap
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = Array.from(modalRef.current.querySelectorAll("button"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        /* Overlay */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 99999,
            padding: "0 20px",
          }}
        >
          {/* Card */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-modal-title"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{    scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(22,22,22,0.94)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "24px",
              width: "100%",
              maxWidth: 400,
              boxShadow: `
                0 24px 64px rgba(0,0,0,0.75),
                0 0 0 1px rgba(255,255,255,0.04),
                0 0 80px rgba(239,68,68,0.04)
              `,
            }}
          >
            {/* Title */}
            <p
              id="del-modal-title"
              style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}
            >
              Delete chat?
            </p>

            {/* Description */}
            {itemName && (
              <p style={{ margin: "0 0 6px 0", fontSize: 12, color: "#a1a1aa", lineHeight: 1.55 }}>
                This will delete &ldquo;<span style={{ color: "#e4e4e7" }}>{itemName}</span>&rdquo;.
              </p>
            )}

            {/* Subtext */}
            <p style={{ margin: 0, fontSize: 11, color: "#52525b", lineHeight: 1.55 }}>
              {subtext}
            </p>

            {/* Divider */}
            <div style={{ margin: "20px 0 16px", height: 1, background: "rgba(255,255,255,0.06)" }} />

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                ref={cancelRef}
                onClick={onClose}
                style={{
                  padding: "8px 18px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 7, color: "#a1a1aa",
                  fontSize: 12, fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 120ms, border-color 120ms, color 120ms",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background    = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.borderColor   = "rgba(255,255,255,0.18)";
                  e.currentTarget.style.color         = "#e4e4e7";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background    = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor   = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color         = "#a1a1aa";
                }}
              >
                Cancel
              </button>

              <button
                onClick={onConfirm}
                style={{
                  padding: "8px 18px",
                  background: "#dc2626",
                  border: "none",
                  borderRadius: 7, color: "#fff",
                  fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#ef4444"}
                onMouseLeave={e => e.currentTarget.style.background = "#dc2626"}
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
