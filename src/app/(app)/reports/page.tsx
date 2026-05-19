"use client";

import { useCampaign } from "@/contexts/campaign-context";
import { CFONarrativeCard } from "@/components/patterns/cfo-narrative-card";
import { FileText, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusDot: Record<string, string> = {
  draft: "bg-[#C4CDD8]",
  final: "bg-emerald-500",
};

export default function ReportsPage() {
  const {
    savedNarratives,
    activeNarrative,
    setActiveNarrative,
    loadNarrative,
    saveNarrative,
  } = useCampaign();

  // Show active narrative card
  if (activeNarrative) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button
          type="button"
          onClick={() => setActiveNarrative(null)}
          className="mb-4 flex items-center gap-1.5 text-[13px] text-[#8492A6] transition-colors hover:text-[#394859]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to reports
        </button>
        <CFONarrativeCard
          narrative={activeNarrative}
          onSendToCFO={() => {
            const updated = {
              ...activeNarrative,
              status: "final" as const,
              lastModifiedAt: new Date().toISOString(),
            };
            saveNarrative(updated);
            setActiveNarrative(updated);
          }}
        />
      </div>
    );
  }

  // Empty state
  if (savedNarratives.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-8 w-8 text-[#C4CDD8]" />
          <h2 className="mt-3 text-lg font-medium text-foreground">Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No narratives yet. Ask the AI companion to draft one.
          </p>
          <p className="mt-0.5 text-xs text-[#C4CDD8]">
            Try: &ldquo;Draft my CFO narrative for May&rdquo;
          </p>
        </div>
      </div>
    );
  }

  // Group by period (year-month)
  const grouped = savedNarratives.reduce<Record<string, typeof savedNarratives>>(
    (acc, n) => {
      const key = `${n.period.year}-${String(n.period.month).padStart(2, "0")}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(n);
      return acc;
    },
    {}
  );

  const sortedKeys = Object.keys(grouped).sort().reverse();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#394859]">Reports</h1>
        <p className="mt-0.5 text-[13px] text-[#8492A6]">CFO narratives and performance reports</p>
      </div>

      <div className="space-y-6">
        {sortedKeys.map((periodKey) => {
          const narratives = grouped[periodKey];
          const [year, month] = periodKey.split("-").map(Number);
          const label = `${MONTH_NAMES[month - 1]} ${year}`;

          return (
            <div key={periodKey}>
              <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#8492A6]">
                {label}
              </h2>
              <div className="space-y-1">
                {narratives.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => loadNarrative(n.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-[#E0E8F2] px-4 py-3 text-left transition-colors hover:bg-[#F7F9FB]"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-[#8492A6]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[#394859] truncate">
                          {n.name}
                        </span>
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[n.status])} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#8492A6]">
                        {n.advertiserId} · Last modified {new Date(n.lastModifiedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      n.status === "draft" ? "bg-[#F3F4F6] text-[#6B7280]" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {n.status === "draft" ? "Draft" : "Final"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
