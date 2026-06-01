/**
 * Maps Cube `/load` result rows into the prototype's SeedMonthlyPerformance[]
 * shape, so the existing Reports cards render real numbers unchanged.
 *
 * Cube returns rows like:
 *   { "marketing.date.month": "2026-05T00:00:00.000", "marketing.channel": "Paid Social",
 *     "marketing.spend": 55500, "marketing.revenue": 168000, "marketing.conversions": 58 }
 */

import type { SeedChannel, SeedMonthlyPerformance } from "@/data/seed-company";
import type { CubeConfig } from "./config";

type CubeRow = Record<string, string | number | null>;

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "channel";
}

/** Normalize a Cube time value (any granularity key) to "YYYY-MM". */
function toMonthKey(v: string | number | null): string {
  if (v == null) return "unknown";
  const s = String(v);
  return s.length >= 7 ? s.slice(0, 7) : s;
}

/**
 * Cube returns the time dimension under "<dim>.<granularity>" (e.g.
 * "marketing.date.month"). Find whichever key starts with the time dimension.
 */
function findTimeKey(row: CubeRow, timeDimension: string): string | null {
  if (timeDimension in row) return timeDimension;
  const prefix = `${timeDimension}.`;
  return Object.keys(row).find((k) => k.startsWith(prefix)) ?? null;
}

export function adaptCubeToPerformance(
  rows: CubeRow[],
  cfg: CubeConfig
): SeedMonthlyPerformance[] {
  if (!rows.length) return [];
  const { measures, dimensions, timeDimension } = cfg;
  const timeKey = findTimeKey(rows[0], timeDimension) ?? timeDimension;

  // Group rows by month → channel rows.
  const byMonth = new Map<string, CubeRow[]>();
  for (const row of rows) {
    const month = toMonthKey(row[timeKey] as string);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(row);
  }

  const months = Array.from(byMonth.keys()).sort();
  // Build per-channel spend history so we can derive month-over-month trend.
  const prevSpendByChannel = new Map<string, number>();

  const result: SeedMonthlyPerformance[] = [];
  for (const month of months) {
    const channelRows = byMonth.get(month)!;
    const totalSpend = channelRows.reduce((s, r) => s + num(r[measures.spend]), 0);
    const totalRevenue = channelRows.reduce((s, r) => s + num(r[measures.revenue]), 0);
    const totalConversions = channelRows.reduce((s, r) => s + num(r[measures.conversions]), 0);

    const channels: SeedChannel[] = channelRows.map((r) => {
      const name = String(r[dimensions.channel] ?? "Unknown");
      const monthlySpend = num(r[measures.spend]);
      const conversions = num(r[measures.conversions]);
      const revenue = num(r[measures.revenue]);
      const cpa = measures.cpa
        ? num(r[measures.cpa])
        : conversions > 0
        ? Math.round(monthlySpend / conversions)
        : 0;

      const prev = prevSpendByChannel.get(name);
      let trend: SeedChannel["trend"] = "flat";
      let trendPercent = 0;
      if (prev !== undefined && prev > 0) {
        const change = ((monthlySpend - prev) / prev) * 100;
        trendPercent = Math.abs(Math.round(change));
        trend = change > 1 ? "up" : change < -1 ? "down" : "flat";
      }
      prevSpendByChannel.set(name, monthlySpend);

      return {
        id: slug(name),
        name,
        monthlySpend,
        cpa,
        conversions,
        attributedRevenuePercent:
          totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
        trend,
        trendPercent,
        status: "healthy",
      };
    });

    result.push({ month, totalSpend, totalRevenue, totalConversions, channels });
  }

  return result;
}
