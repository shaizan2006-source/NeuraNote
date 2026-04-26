"use client";
import { useMemo } from "react";
import { generateInsights } from "@/lib/analytics/generateInsights";
import { computeTrends }    from "@/lib/analytics/computeTrends";

/**
 * Returns memoized array of up to 5 ranked insights.
 * Passes computed trends as context so generateInsights can use consistencyPct etc.
 */
export function useStudyInsights(data) {
  return useMemo(() => {
    const trends = computeTrends(data);
    return generateInsights(data, { trends });
  }, [data]);
}
