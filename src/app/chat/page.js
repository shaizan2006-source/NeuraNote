"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [user_id, setUserId] = useState(null);
  const bottomRef = useRef(null);

  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


 // -----------------------------------
// FETCH USER + CHAT HISTORY
// -----------------------------------
useEffect(() => {
  async function init() {
    try {
      // 🔹 Get logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User fetch error:", userError);
        return;
      }

      if (!user) {
        console.log("No user logged in");
        return;
      }

      console.log("USER ID:", user.id);

      setUserId(user.id);

      // 🔹 Fetch chat history
      const res = await fetch("/api/chat/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await res.json();

      console.log("HISTORY RESPONSE:", data);

      if (data.success) {
        setMessages(data.messages || []);
      } else {
        console.error("History API error:", data);
      }

    } catch (err) {
      console.error("Init error:", err);
    }
  }

  init();
}, []);


  async function fetchHistory() {
    try {
      const res = await fetch("/api/chat/history", {
        method: "POST",
        body: JSON.stringify({ user_id }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------------
  // SEND MESSAGE
  // -----------------------------------
  async function sendMessage() {
    if (!input.trim() || !user_id) return;

    const userMessage = {
      role: "user",
      content: input,
    };

    // Optimistic UI
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        body: JSON.stringify({
          message: input,
          user_id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const aiMessage = {
          role: "assistant",
          content: data.response,
        };

        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  // -----------------------------------
  // AUTO SCROLL
  // -----------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -----------------------------------
  // UI
  // -----------------------------------
  return (
    <div className="flex flex-col h-screen bg-black text-white">

      {/* 🔹 CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-xl p-3 rounded-lg ${
              msg.role === "user"
                ? "ml-auto bg-blue-600"
                : "mr-auto bg-gray-800"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="mr-auto bg-gray-800 p-3 rounded-lg">
            Thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 🔹 INPUT */}
      <div className="p-4 border-t border-gray-700 flex gap-2">
        <input
          className="flex-1 p-3 rounded bg-gray-900 outline-none"
          placeholder="Ask anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}