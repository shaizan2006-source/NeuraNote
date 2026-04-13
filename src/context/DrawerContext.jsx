// src/context/DrawerContext.jsx
"use client";

import { createContext, useContext, useState } from "react";

const DrawerContext = createContext(null);

export function DrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  // activePdf: { id, name } | null
  const [activePdf, setActivePdf] = useState(null);

  function openDrawer() { setIsOpen(true); }
  function closeDrawer() { setIsOpen(false); }
  function startNewDrawerConversation() {
    setConversationId(null);
    setIsOpen(true);
  }

  return (
    <DrawerContext.Provider value={{
      isOpen, openDrawer, closeDrawer,
      conversationId, setConversationId,
      activePdf, setActivePdf,
      startNewDrawerConversation,
    }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used inside DrawerProvider");
  return ctx;
}
