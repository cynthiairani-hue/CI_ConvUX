"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardMetric } from "@/types/persona";

export function MetricCard({ label, value, change, trend }: DashboardMetric) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {trend === "up" && (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
        )}
        {trend === "down" && (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        )}
        {trend === "neutral" && (
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span
          className={cn(
            "text-xs font-medium",
            trend === "up" && "text-emerald-600",
            trend === "down" && "text-red-500",
            trend === "neutral" && "text-muted-foreground"
          )}
        >
          {change}
        </span>
      </div>
    </div>
  );
}
