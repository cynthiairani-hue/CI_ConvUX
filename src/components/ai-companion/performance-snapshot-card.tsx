"use client";

import { cn } from "@/lib/utils";

export interface PerformanceMetric {
  label: string;
  value: string;
  change?: { direction: "up" | "down" | "flat"; text: string };
  context?: string;
}

interface PerformanceSnapshotCardProps {
  title: string;
  period: string;
  metrics: PerformanceMetric[];
  /** Show "+ N more" in footer */
  moreCount?: number;
  /** Optional footer link */
  footerAction?: { label: string; onClick: () => void };
}

export function PerformanceSnapshotCard({
  title,
  period,
  metrics,
  moreCount,
  footerAction,
}: PerformanceSnapshotCardProps) {
  return (
    <div className="my-2 w-full overflow-hidden rounded-[20px] bg-white border border-black/[0.08] shadow-[0px_4px_16px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14">
        <span className="text-[15px] font-semibold text-[#0d0d0d] tracking-[-0.3px]">
          {title}
        </span>
        <span className="rounded-full bg-[#F5FAFF] px-2.5 py-1 text-[13px] font-semibold text-[#0169CC] tracking-[-0.18px]">
          {period}
        </span>
      </div>

      {/* Metrics list */}
      <div className="flex flex-col">
        {metrics.map((metric, i) => {
          const isUp = metric.change?.direction === "up";
          const isDown = metric.change?.direction === "down";

          const badgeBg = isUp
            ? "bg-[#EDFAF2]"
            : isDown
            ? "bg-[#FFF0F0]"
            : "bg-[#F5F5F5]";

          const badgeText = isUp
            ? "text-[#00A240]"
            : isDown
            ? "text-[#E02E2A]"
            : "text-[#5D5D5D]";

          const arrow = isUp ? "↑" : isDown ? "↓" : "";

          return (
            <div
              key={i}
              className="flex flex-col gap-2.5 border-t border-black/[0.05] px-4 py-3"
            >
              {/* Title row + badge */}
              <div className="flex items-center gap-2">
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="text-[15px] text-[#0d0d0d] tracking-[-0.4px] leading-[22px]">
                    {metric.label}
                  </span>
                  <span className="text-[13px] text-[#5d5d5d] tracking-[-0.18px] leading-[18px]">
                    {metric.value}
                  </span>
                </div>
                {metric.change && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-semibold tracking-[-0.18px]",
                      badgeBg,
                      badgeText
                    )}
                  >
                    {arrow}{metric.change.text}
                  </span>
                )}
              </div>
              {/* Context line */}
              {metric.context && (
                <span className="text-[13px] text-[#5d5d5d] tracking-[-0.3px] leading-[18px]">
                  {metric.context}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {(moreCount || footerAction) && (
        <div className="flex items-center justify-between border-t border-black/[0.05] px-4 pb-4 pt-3">
          {moreCount ? (
            <span className="text-[15px] text-[#5d5d5d] tracking-[-0.4px]">
              + {moreCount} more
            </span>
          ) : (
            <span />
          )}
          {footerAction && (
            <button
              onClick={footerAction.onClick}
              className="text-[13px] font-medium text-[#5d5d5d] tracking-[-0.18px] transition-colors hover:text-[#0d0d0d]"
            >
              {footerAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
