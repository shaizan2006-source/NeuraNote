"use client";

// =====================================================================
// TrackingProvider — mounts the session tracker once and gives track.js a
// way to fetch the Supabase access token for authenticated event flushes.
// Wrap any authenticated route group (dashboard, ask-ai, /progress) in this.
// =====================================================================

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { configureTracker, setSurface, track } from "@/lib/track";
import { EVENT_TYPES } from "@/lib/eventRegistry";
import { useSessionTracker } from "@/hooks/useSessionTracker";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function TrackingProvider({ surface, children }) {
  // Start a session lifecycle as soon as a user lands on a tracked surface.
  useSessionTracker();

  useEffect(() => {
    configureTracker({
      tokenProvider: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
      },
    });
  }, []);

  useEffect(() => {
    if (!surface) return;
    setSurface(surface);
    track(EVENT_TYPES.PAGE_VIEWED, {
      surface,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
  }, [surface]);

  return children;
}
