"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createDebouncedRefetch as _createDebouncedRefetch } from "@/lib/realtimeDebounce";

/**
 * useRealtimeProgress
 * ──────────────────────────────────────────────────────────────────────────
 * The heart of the live progress system.
 *
 * What it does:
 *  - Opens ONE Supabase Realtime channel per session for the current user.
 *  - Subscribes to postgres_changes on six progress-relevant tables, scoped
 *    to the current user_id via Realtime filters.
 *  - Whenever any change arrives, schedules a debounced (500ms) call to the
 *    provided refetch function. Multiple events in a burst coalesce into one
 *    refetch. Hard cap: 1 refetch per 2s.
 *  - When the websocket is unhealthy, falls back to 60s polling.
 *  - Pauses on tab hidden, resumes on tab visible.
 *  - Cleans up on auth sign-out and on unmount.
 *  - Race-proofs concurrent refetches (latest-wins via incrementing requestId).
 *
 * Returns { status, lastDelta, lastUpdateAt, manualRefetch }.
 * Connection status: 'connecting' | 'connected' | 'polling' | 'disconnected'.
 *
 * Companion migration: supabase/migrations/enable_realtime_for_progress.sql
 */

const TABLES = [
  "learning_events",
  "focus_progress",
  "mastery_topics",
  "study_streaks",
  "exams",
  "spaced_repetition_cards",
  "weak_topics", // Realtime migration 20260429_enable_realtime_weak_topics.sql required
];

const DEBOUNCE_MS = 500;
const MIN_REFETCH_INTERVAL_MS = 2000;
const SUBSCRIBE_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 60_000;

// Re-export so existing import sites keep working.
export { _createDebouncedRefetch as createDebouncedRefetch };

export function useRealtimeProgress({
  refetch,
  refetchDailyPlan,
  refetchExam,
  refetchWeakTopics,
} = {}) {
  const [status, setStatus] = useState("connecting");
  const [lastDelta, setLastDelta] = useState(null);
  const [lastUpdateAt, setLastUpdateAt] = useState(null);

  const channelRef     = useRef(null);
  const pollTimerRef   = useRef(null);
  const subTimeoutRef  = useRef(null);
  const requestIdRef   = useRef(0);
  const refetchRef           = useRef(refetch);
  const planRefetchRef       = useRef(refetchDailyPlan);
  const examRefetchRef       = useRef(refetchExam);
  const weakTopicsRefetchRef = useRef(refetchWeakTopics);
  const userIdRef      = useRef(null);
  const mountedRef     = useRef(true);

  refetchRef.current            = refetch;
  planRefetchRef.current        = refetchDailyPlan;
  examRefetchRef.current        = refetchExam;
  weakTopicsRefetchRef.current  = refetchWeakTopics;

  // The race-proofed refetch wrapper.
  const guardedRefetch = useCallback(async () => {
    if (!refetchRef.current) return;
    const id = ++requestIdRef.current;
    try {
      await refetchRef.current({ requestId: id });
      if (id !== requestIdRef.current || !mountedRef.current) return; // stale
      setLastUpdateAt(Date.now());
    } catch (err) {
      console.error("[useRealtimeProgress] refetch error:", err?.message || err);
    }
  }, []);

  const debouncedRefetchRef = useRef(null);
  if (!debouncedRefetchRef.current) {
    debouncedRefetchRef.current = _createDebouncedRefetch(guardedRefetch);
  }

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      if (document.hidden) return;
      guardedRefetch();
    }, POLL_INTERVAL_MS);
  }, [guardedRefetch]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const teardownChannel = useCallback(() => {
    if (subTimeoutRef.current) {
      clearTimeout(subTimeoutRef.current);
      subTimeoutRef.current = null;
    }
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
    }
  }, []);

  const setupChannel = useCallback((userId) => {
    teardownChannel();
    if (!userId) return;

    const channel = supabase.channel(`progress:${userId}`, {
      config: { broadcast: { ack: false }, presence: { key: "" } },
    });

    const handler = (table) => (payload) => {
      const eventType = payload?.eventType || payload?.event;
      const newRow    = payload?.new || null;
      const oldRow    = payload?.old || null;
      setLastDelta({ table, eventType, new: newRow, old: oldRow, ts: Date.now() });

      // Dual refetch: dailyPlan when a study_plan_task_done event arrives.
      if (
        table === "learning_events" &&
        newRow?.event_type === "study_plan_task_done" &&
        planRefetchRef.current
      ) {
        try { planRefetchRef.current(); } catch {}
      }

      debouncedRefetchRef.current?.();
      if (table === "exams" && examRefetchRef.current) {
        try { examRefetchRef.current(); } catch {}
      }
      if (table === "weak_topics" && weakTopicsRefetchRef.current) {
        try { weakTopicsRefetchRef.current(); } catch {}
      }
    };

    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        handler(table)
      );
    }

    channel.subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        if (subTimeoutRef.current) {
          clearTimeout(subTimeoutRef.current);
          subTimeoutRef.current = null;
        }
        stopPolling();
        setStatus("connected");
      } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT" || subStatus === "CLOSED") {
        setStatus("polling");
        startPolling();
      }
    });

    // If we don't reach SUBSCRIBED within the timeout, fall back to polling.
    subTimeoutRef.current = setTimeout(() => {
      if (status !== "connected") {
        setStatus("polling");
        startPolling();
      }
    }, SUBSCRIBE_TIMEOUT_MS);

    channelRef.current = channel;
  }, [teardownChannel, startPolling, stopPolling, status]);

  const init = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;
    userIdRef.current = userId;
    if (!userId) {
      setStatus("disconnected");
      return;
    }
    // Initial fetch + subscribe in parallel.
    guardedRefetch();
    if (planRefetchRef.current) {
      try { planRefetchRef.current(); } catch {}
    }
    setupChannel(userId);
  }, [guardedRefetch, setupChannel]);

  useEffect(() => {
    mountedRef.current = true;
    init();

    const onVis = () => {
      if (document.hidden) {
        teardownChannel();
        stopPolling();
      } else {
        guardedRefetch();
        if (userIdRef.current) setupChannel(userIdRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null;
      if (event === "SIGNED_OUT") {
        userIdRef.current = null;
        teardownChannel();
        stopPolling();
        setStatus("disconnected");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        if (newUserId && newUserId !== userIdRef.current) {
          userIdRef.current = newUserId;
          guardedRefetch();
          setupChannel(newUserId);
        } else if (newUserId) {
          // Token refresh on same user — just re-attach the channel.
          setupChannel(newUserId);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      try { authSub?.subscription?.unsubscribe?.(); } catch {}
      teardownChannel();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, lastDelta, lastUpdateAt, manualRefetch: guardedRefetch };
}
