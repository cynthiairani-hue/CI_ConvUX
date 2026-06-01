/**
 * Client-side helpers to pull real metrics from the Cube proxy route.
 * Each returns null when Cube isn't configured or the request fails, so callers
 * fall back to mock seed data — this is the "progressive readiness" seam.
 */

import type { SeedMonthlyPerformance } from "@/data/seed-company";

export interface CubePerformanceResult {
  perf: SeedMonthlyPerformance[];
  source: "cube";
}

export async function fetchCubePerformance(): Promise<CubePerformanceResult | null> {
  try {
    const res = await fetch("/api/cube?report=monthly-performance");
    if (!res.ok) return null;
    const json = (await res.json()) as {
      configured?: boolean;
      perf?: SeedMonthlyPerformance[];
      error?: string;
    };
    if (!json.configured || json.error || !json.perf?.length) return null;
    return { perf: json.perf, source: "cube" };
  } catch {
    return null;
  }
}
