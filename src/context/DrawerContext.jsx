"use client";

import { createContext, useContext, useState } from "react";

const DrawerContext = createContext(null);

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used inside DrawerProvider");
  return ctx;
}

export function DrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  function startNewDrawerConversation() {
    setIsOpen(true);
    setConversationId(null); // New conversation
  }

  function closeDrawer() {
    setIsOpen(false);
  }

  function setActiveConversation(cid) {
    setConversationId(cid);
    setIsOpen(true);
  }

  return (
    <DrawerContext.Provider
      value={{
        isOpen,
        conversationId,
        startNewDrawerConversation,
        closeDrawer,
        setActiveConversation,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}
