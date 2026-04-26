// ── Multi-chat localStorage persistence ───────────────────────────────
// Stores up to 50 conversations locally so the sidebar shows all chats,
// titles are meaningful, and nothing is lost on refresh.
//
// Keys:
//   amn_chats           – Chat[] (max 50, sorted by updatedAt desc)
//   amn_current_chat_id – active conversation ID (string)
//
// Chat shape: { id, title, messages, createdAt, updatedAt }
// Message shape: { role, text, sources }

const CHATS_KEY      = "amn_chats";
const CURRENT_ID_KEY = "amn_current_chat_id";
const MAX_CHATS      = 50;

// ── Title generation ──────────────────────────────────────────────────

export function generateTitle(message) {
  if (!message) return "New Chat";
  const words = message
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  return words.slice(0, 7).join(" ").slice(0, 60) || "New Chat";
}

// ── Internal helpers ──────────────────────────────────────────────────

function readChats() {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeChats(chats) {
  try {
    const trimmed = [...chats]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, MAX_CHATS);
    localStorage.setItem(CHATS_KEY, JSON.stringify(trimmed));
  } catch {}
}

function notify() {
  window.dispatchEvent(new CustomEvent("askmynotes:chats-updated"));
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Return all chats sorted by updatedAt descending.
 */
export function loadAllChats() {
  return readChats().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Register a new chat immediately when a conversation is created —
 * before any messages have settled. Allows the sidebar to show the
 * new entry instantly without waiting for the AI response to finish.
 */
export function registerChat(id, title) {
  if (!id) return;
  try {
    const now   = Date.now();
    const chats = readChats();
    if (chats.find(c => c.id === id)) return; // already exists — don't overwrite
    chats.unshift({ id, title: title || "New Chat", messages: [], createdAt: now, updatedAt: now });
    writeChats(chats);
    localStorage.setItem(CURRENT_ID_KEY, id);
    notify();
  } catch {}
}

/**
 * Persist settled messages for a conversation.
 * Auto-generates a title from the first user message when the chat has
 * no meaningful title yet (i.e. still "New Chat").
 */
export function saveChat(conversationId, messages) {
  if (!conversationId || !Array.isArray(messages)) return;
  try {
    const settled = messages
      .filter(m => m.text && (m.role === "user" || m.done))
      .map(({ role, text, sources }) => ({ role, text, sources: sources || [] }));
    if (settled.length === 0) return;

    const now   = Date.now();
    const chats = readChats();
    const idx   = chats.findIndex(c => c.id === conversationId);

    // Keep existing title unless it is still the placeholder
    const existingTitle = idx >= 0 ? chats[idx].title : "";
    const autoTitle = (existingTitle && existingTitle !== "New Chat")
      ? existingTitle
      : (() => {
          const firstUser = settled.find(m => m.role === "user");
          return firstUser ? generateTitle(firstUser.text) : "New Chat";
        })();

    if (idx >= 0) {
      chats[idx] = { ...chats[idx], title: autoTitle, messages: settled, updatedAt: now };
    } else {
      chats.unshift({ id: conversationId, title: autoTitle, messages: settled, createdAt: now, updatedAt: now });
    }

    writeChats(chats);
    localStorage.setItem(CURRENT_ID_KEY, conversationId);
    notify();
  } catch {}
}

/**
 * Load cached messages for a specific conversation.
 * Returns null if nothing is cached.
 */
export function loadChat(conversationId) {
  if (!conversationId) return null;
  try {
    const chat = readChats().find(c => c.id === conversationId);
    return Array.isArray(chat?.messages) && chat.messages.length > 0
      ? chat.messages
      : null;
  } catch { return null; }
}

/**
 * Return the last active conversation ID (cheap read for page init).
 */
export function loadSavedChatId() {
  try {
    return localStorage.getItem(CURRENT_ID_KEY) || null;
  } catch { return null; }
}

/**
 * Clear the current chat ID when the user starts a new chat.
 * Does NOT delete the chat data — old chats remain in the sidebar.
 */
export function clearChat() {
  try {
    localStorage.removeItem(CURRENT_ID_KEY);
  } catch {}
}

/**
 * Delete a chat permanently from localStorage.
 */
export function deleteChat(id) {
  if (!id) return;
  try {
    writeChats(readChats().filter(c => c.id !== id));
    const current = localStorage.getItem(CURRENT_ID_KEY);
    if (current === id) localStorage.removeItem(CURRENT_ID_KEY);
    notify();
  } catch {}
}

/**
 * Rename a chat in localStorage.
 */
export function renameChat(id, title) {
  if (!id || !title?.trim()) return;
  try {
    const chats = readChats();
    const idx   = chats.findIndex(c => c.id === id);
    if (idx >= 0) {
      chats[idx] = { ...chats[idx], title: title.trim() };
      writeChats(chats);
      notify();
    }
  } catch {}
}
