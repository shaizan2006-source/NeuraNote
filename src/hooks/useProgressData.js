"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useProgressData() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadKey(k => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetch_() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setError("unauthenticated"); setLoading(false); return; }
        const res = await fetch("/api/progress/summary", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error("summary fetch failed");
        const json = await res.json();
        if (!cancelled) { setData(json); setLoading(false); }
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    }

    fetch_();
    return () => { cancelled = true; };
  }, [reloadKey]);

  return { data, loading, error, refetch };
}
