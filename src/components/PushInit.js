"use client";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push";

export default function PushInit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // DEV SELF-HEAL: a service worker previously registered (incl. via the LAN IP) keeps
      // serving cached HTML/JS chunks, which caused phantom stale-build / hydration / key-prop
      // errors that survived dev restarts. Actively unregister any SW and purge its caches so
      // dev always runs fresh code — no manual DevTools cleanup needed.
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
      }
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
      return;
    }
    registerServiceWorker();
  }, []);
  return null;
}
