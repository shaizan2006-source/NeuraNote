"use client";
import { useMemo } from "react";
import { computeAccuracy } from "@/lib/analytics/computeAccuracy";

/** Returns memoized accuracy breakdown (overall, recent proxy, byTopic, trend). */
export function useAccuracy(data) {
  return useMemo(() => computeAccuracy(data), [data]);
}
