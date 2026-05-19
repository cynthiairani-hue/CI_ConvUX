"use client";

import { useState } from "react";
import {
  Check,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Target,
  DollarSign,
  Users,
  Layout,
  BarChart3,
  Palette,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  StrategyPlan,
  StrategySection,
  ReadinessState,
  PlacementType,
} from "@/types/campaign";
import { PLACEMENT_TYPES } from "@/data/iab-categories";

interface StrategyCardProps {
  plan: StrategyPlan;
}

function ReadinessBadge({ state }: { state: ReadinessState }) {
  if (state === "ready")
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
        <Check className="h-3 w-3" /> Ready
      </span>
    );
  if (state === "limited")
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
        <AlertTriangle className="h-3 w-3" /> Limited
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500">
      <XCircle className="h-3 w-3" /> Blocked
    </span>
  );
}

function SectionIcon({ section }: { section: string }) {
  const icons: Record<string, typeof Target> = {
    objective: Target,
    budgetSchedule: DollarSign,
    audience: Users,
    placements: Layout,
    bidding: BarChart3,
    creative: Palette,
    forecast: TrendingUp,
  };
  const Icon = icons[section] || Target;
  return <Icon className="h-4 w-4 text-[#8492A6]" />;
}

const SECTION_KEYS = [
  "objective",
  "budgetSchedule",
  "audience",
  "placements",
  "bidding",
  "creative",
  "forecast",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

function PlacementGrid({ placements, onToggle }: {
  placements: PlacementType[];
  onToggle: (p: PlacementType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {PLACEMENT_TYPES.map((pt) => {
        const active = placements.includes(pt.id);
        return (
          <button
            key={pt.id}
            type="button"
            onClick={() => onToggle(pt.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition-all",
              active
                ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                : "border-[#E0E8F2] text-[#8492A6] hover:border-[#C4CDD8]"
            )}
          >
            <span className="font-medium">{pt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ForecastTable({ forecast }: { forecast: StrategyPlan["forecast"]["data"] }) {
  const rows = [
    { label: "Daily reach", value: forecast.dailyReach.toLocaleString() },
    { label: "Weekly reach", value: forecast.weeklyReach.toLocaleString() },
    { label: "Daily impressions", value: forecast.dailyImpressions.toLocaleString() },
    { label: "Weekly impressions", value: forecast.weeklyImpressions.toLocaleString() },
    { label: "Est. households", value: forecast.estimatedHouseholds.toLocaleString() },
  ];

  const confidenceColors = {
    low: "bg-amber-50 text-amber-600",
    medium: "bg-blue-50 text-blue-600",
    high: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div>
      <div className="rounded-lg border border-[#EDF1F5] overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between px-3 py-1.5 text-[12px]",
              i > 0 && "border-t border-[#EDF1F5]"
            )}
          >
            <span className="text-[#8492A6]">{row.label}</span>
            <span className="font-medium tabular-nums text-[#394859]">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-medium",
          confidenceColors[forecast.confidenceLevel]
        )}>
          {forecast.confidenceLevel} confidence
        </span>
      </div>
    </div>
  );
}

export function StrategyCard({ plan }: StrategyCardProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionKey>>(new Set());
  const [showRationale, setShowRationale] = useState<SectionKey | null>(null);

  function toggleCollapse(key: SectionKey) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sections: { key: SectionKey; section: StrategySection }[] = SECTION_KEYS.map((key) => ({
    key,
    section: plan[key],
  }));

  return (
    <div className="space-y-4">
      {sections.map(({ key, section }) => {
        const isCollapsed = collapsedSections.has(key);
        const showingRationale = showRationale === key;

        return (
          <div key={key} className="rounded-xl border border-[#E0E8F2] bg-white">
            {/* Section header */}
            <div className="flex items-center gap-2 px-4 py-3">
              <SectionIcon section={key} />
              <span className="flex-1 text-[13px] font-medium text-[#394859] min-w-0">
                {section.label}
              </span>
              <ReadinessBadge state={section.readiness} />
              <button
                type="button"
                onClick={() => setShowRationale(showingRationale ? null : key)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[#C4CDD8] transition-colors hover:bg-[#F7F9FB] hover:text-[#8492A6]"
                title="Why this value"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleCollapse(key)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[#C4CDD8] transition-colors hover:bg-[#F7F9FB] hover:text-[#8492A6]"
              >
                {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Provenance rationale */}
            {showingRationale && (
              <div className="mx-4 mb-2 rounded-lg bg-[#F7F9FB] px-3 py-2 text-[12px] text-[#8492A6] leading-relaxed">
                {section.provenance.confidence && (
                  <span className={cn(
                    "mr-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    section.provenance.confidence === "high" ? "bg-emerald-50 text-emerald-600" :
                    section.provenance.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                    "bg-red-50 text-red-500"
                  )}>
                    {section.provenance.confidence}
                  </span>
                )}
                {section.provenance.reasoning}
              </div>
            )}

            {/* Section content — always visible unless collapsed */}
            {!isCollapsed && (
              <div className="border-t border-[#EDF1F5] px-4 pb-4 pt-3">
                {/* Objective — read-only display */}
                {key === "objective" && (
                  <p className="text-[13px] text-[#394859] leading-relaxed">{section.value}</p>
                )}

                {/* Budget — editable form fields */}
                {key === "budgetSchedule" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#8492A6] mb-1">Daily budget</label>
                        <div className="flex items-center rounded-lg border border-[#E0E8F2] px-3 py-2">
                          <span className="text-[13px] text-[#8492A6]">$</span>
                          <input
                            type="text"
                            defaultValue={plan.budgetSchedule.data.dailyBudget?.toString() || ""}
                            className="ml-1 w-full bg-transparent text-[13px] text-[#394859] tabular-nums outline-none placeholder:text-[#C4CDD8]"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#8492A6] mb-1">Monthly budget</label>
                        <div className="flex items-center rounded-lg border border-[#E0E8F2] px-3 py-2">
                          <span className="text-[13px] text-[#8492A6]">$</span>
                          <input
                            type="text"
                            defaultValue={plan.budgetSchedule.data.monthlyBudget?.toLocaleString() || ""}
                            className="ml-1 w-full bg-transparent text-[13px] text-[#394859] tabular-nums outline-none placeholder:text-[#C4CDD8]"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          plan.budgetSchedule.data.alwaysOn ? "bg-[#2C9FDD]" : "bg-[#E0E8F2]"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                          plan.budgetSchedule.data.alwaysOn ? "translate-x-4" : "translate-x-0.5"
                        )} />
                      </button>
                      <span className="text-[12px] text-[#394859]">Always on</span>
                    </div>
                  </div>
                )}

                {/* Audience — form fields */}
                {key === "audience" && (
                  <div className="space-y-3 text-[12px]">
                    <div>
                      <label className="block text-[11px] font-medium text-[#8492A6] mb-1.5">Locations</label>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.audience.data.locations.map((loc) => (
                          <span key={loc} className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[#394859]">
                            {loc}
                            <button type="button" className="text-[#C4CDD8] hover:text-[#8492A6]">&times;</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          placeholder="Add location..."
                          className="rounded-full border border-dashed border-[#E0E8F2] px-2.5 py-1 text-[12px] outline-none placeholder:text-[#C4CDD8] focus:border-[#2C9FDD]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#8492A6] mb-1">Age range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            defaultValue={plan.audience.data.ageRange.min}
                            className="w-16 rounded-lg border border-[#E0E8F2] px-2.5 py-1.5 text-[13px] text-[#394859] tabular-nums outline-none focus:border-[#2C9FDD]"
                          />
                          <span className="text-[#8492A6]">—</span>
                          <input
                            type="number"
                            defaultValue={plan.audience.data.ageRange.max}
                            className="w-16 rounded-lg border border-[#E0E8F2] px-2.5 py-1.5 text-[13px] text-[#394859] tabular-nums outline-none focus:border-[#2C9FDD]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#8492A6] mb-1">Gender</label>
                        <div className="flex gap-1">
                          {(["all", "male", "female"] as const).map((g) => (
                            <button
                              key={g}
                              type="button"
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                                plan.audience.data.gender === g
                                  ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                                  : "border-[#E0E8F2] text-[#8492A6] hover:border-[#C4CDD8]"
                              )}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {plan.audience.data.marketInterests.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-medium text-[#8492A6] mb-1.5">Interests</label>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.audience.data.marketInterests.map((mi) => (
                            <span key={mi} className="inline-flex items-center gap-1 rounded-full bg-[#EBF5FB] px-2.5 py-1 text-[#1A7BB5]">
                              {mi}
                              <button type="button" className="text-[#1A7BB5]/40 hover:text-[#1A7BB5]">&times;</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Placements — toggle grid */}
                {key === "placements" && (
                  <PlacementGrid
                    placements={plan.placements.data}
                    onToggle={() => {}}
                  />
                )}

                {/* Bidding — read-only for v1 */}
                {key === "bidding" && (
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-[#2C9FDD] bg-[#EBF5FB] px-3 py-1.5 text-[12px] font-medium text-[#1A7BB5]">
                      Automatic
                    </span>
                    <span className="rounded-lg border border-[#E0E8F2] px-3 py-1.5 text-[12px] text-[#C4CDD8]">
                      Manual (coming soon)
                    </span>
                  </div>
                )}

                {/* Creative — placeholder */}
                {key === "creative" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-dashed border-[#E0E8F2] px-4 py-6 text-center text-[12px] text-[#8492A6] transition-colors hover:border-[#C4CDD8] hover:bg-[#F7F9FB]"
                    >
                      <Palette className="mx-auto mb-1.5 h-5 w-5 text-[#C4CDD8]" />
                      Upload creative
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-dashed border-[#E0E8F2] px-4 py-6 text-center text-[12px] text-[#8492A6] transition-colors hover:border-[#C4CDD8] hover:bg-[#F7F9FB]"
                    >
                      <TrendingUp className="mx-auto mb-1.5 h-5 w-5 text-[#C4CDD8]" />
                      Generate with AI
                    </button>
                  </div>
                )}

                {/* Forecast — table */}
                {key === "forecast" && (
                  <ForecastTable forecast={plan.forecast.data} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
