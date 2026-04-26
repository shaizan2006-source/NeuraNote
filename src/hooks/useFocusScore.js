"use client";
import { useMemo } from "react";
import { computeFocusScore } from "@/lib/analytics/computeFocusScore";

/** Returns memoized focus score and breakdown derived from progress summary data. */
export function useFocusScore(data) {
  return useMemo(() => computeFocusScore(data), [data]);
}
