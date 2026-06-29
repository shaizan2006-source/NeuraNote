"use client";
/**
 * clientFetch — authenticated fetch wrapper for browser/client components.
 *
 * Automatically injects the Supabase session token as a Bearer Authorization
 * header. Use this instead of bare fetch() for all private /api/* calls from
 * React components, hooks, and context.
 *
 * USAGE:
 *   import { clientFetch } from "@/lib/clientFetch";
 *
 *   const res  = await clientFetch("/api/some-route");
 *   const data = await clientFetch("/api/other", { method: "POST", body: JSON.stringify({...}) });
 *
 * Returns the raw Response — call .json(), .text(), etc. as normal.
 * Returns null and logs a warning when no session is found (unauthenticated state).
 */

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Fetch with automatic Bearer token injection.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response|null>}
 */
export async function clientFetch(url, options = {}) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn(`clientFetch: no active session for ${url}`);
    return null;
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${session.access_token}`,
  };

  // Don't override Content-Type if FormData is being sent (browser sets boundary automatically)
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  return fetch(url, { ...options, headers });
}
