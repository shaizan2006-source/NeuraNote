"use client";

import { useEffect } from "react";
import { captureUtm } from "@/lib/utmCapture";

/**
 * Invisible component — runs captureUtm() on every page load.
 * Included in the root layout so UTM params are captured regardless of
 * which page the user lands on (homepage, /pricing, /blog, direct /signup, etc.).
 *
 * First-touch attribution: captureUtm() is a no-op if params are already stored.
 */
export default function UtmCapture() {
  useEffect(() => {
    captureUtm();
  }, []);

  return null;
}
