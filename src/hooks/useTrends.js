"use client";
import { useMemo } from "react";
import { computeTrends } from "@/lib/analytics/computeTrends";

/** Returns memoized trend signals (focusScoreTrend, studyTimeTrend, streakMomentum, consistencyPct). */
export function useTrends(data) {
  return useMemo(() => computeTrends(data), [data]);
}
