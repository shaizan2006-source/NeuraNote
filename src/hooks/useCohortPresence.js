"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/supabase-js";

export function useCohortPresence(cohortId, handle) {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!cohortId || !handle) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const channel = supabase
      .channel(`cohort:${cohortId}`, {
        config: { presence: { key: handle } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setActiveCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ status: "active", handle });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cohortId, handle]);

  return activeCount;
}
