"use client";

import { useState, useCallback } from "react";
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
import { OBJECTIVE_OPTIONS } from "@/data/campaign-flow";

interface StrategyCardProps {
  plan: StrategyPlan;
  onUpdate?: (updated: StrategyPlan) => void;
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

export function StrategyCard({ plan, onUpdate }: StrategyCardProps) {
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

  /** Immutable update helper — updates a section and calls onUpdate */
  const updateSection = useCallback(
    (key: SectionKey, patch: Partial<StrategySection> & { data?: unknown }) => {
      if (!onUpdate) return;
      const now = new Date().toISOString();
      const current = plan[key];
      const updated: StrategyPlan = {
        ...plan,
        [key]: {
          ...current,
          ...patch,
          authorshipState: "edited" as const,
          lastModifiedAt: now,
        },
        lastModifiedAt: now,
        lastModifiedBy: "user",
      };
      onUpdate(updated);
    },
    [plan, onUpdate]
  );

  /** Objective change */
  const handleObjectiveChange = useCallback(
    (optionId: string) => {
      const opt = OBJECTIVE_OPTIONS.find((o) => o.id === optionId);
      if (!opt) return;
      updateSection("objective", {
        value: opt.value,
        provenance: {
          source: "user_input",
          reasoning: `User selected ${opt.label} as the campaign objective.`,
          confidence: "high",
        },
      });
    },
    [updateSection]
  );

  /** Budget change */
  const handleBudgetChange = useCallback(
    (field: "dailyBudget" | "monthlyBudget", raw: string) => {
      const num = parseInt(raw.replace(/,/g, "")) || 0;
      const currentData = plan.budgetSchedule.data;
      const newData =
        field === "dailyBudget"
          ? { ...currentData, dailyBudget: num, monthlyBudget: num * 30 }
          : { ...currentData, monthlyBudget: num, dailyBudget: Math.round(num / 30) };
      const value = `$${newData.dailyBudget}/day · $${(newData.monthlyBudget ?? 0).toLocaleString()}/month · ${newData.alwaysOn ? "Always on" : "Scheduled"}`;
      updateSection("budgetSchedule", { value, data: newData });
    },
    [plan.budgetSchedule.data, updateSection]
  );

  /** Always-on toggle */
  const handleAlwaysOnToggle = useCallback(() => {
    const currentData = plan.budgetSchedule.data;
    const newData = { ...currentData, alwaysOn: !currentData.alwaysOn };
    const value = `$${newData.dailyBudget}/day · $${(newData.monthlyBudget ?? 0).toLocaleString()}/month · ${newData.alwaysOn ? "Always on" : "Scheduled"}`;
    updateSection("budgetSchedule", { value, data: newData });
  }, [plan.budgetSchedule.data, updateSection]);

  /** Audience age range change */
  const handleAgeChange = useCallback(
    (end: "min" | "max", raw: string) => {
      const num = parseInt(raw) || (end === "min" ? 18 : 65);
      const currentData = plan.audience.data;
      const newRange = { ...currentData.ageRange, [end]: num };
      const newData = { ...currentData, ageRange: newRange };
      const value = `${newData.locations.join(", ")} · Ages ${newRange.min}-${newRange.max} · ${newData.gender === "all" ? "All genders" : newData.gender}`;
      updateSection("audience", { value, data: newData });
    },
    [plan.audience.data, updateSection]
  );

  /** Gender change */
  const handleGenderChange = useCallback(
    (gender: "all" | "male" | "female") => {
      const currentData = plan.audience.data;
      const newData = { ...currentData, gender };
      const value = `${newData.locations.join(", ")} · Ages ${newData.ageRange.min}-${newData.ageRange.max} · ${gender === "all" ? "All genders" : gender}`;
      updateSection("audience", { value, data: newData });
    },
    [plan.audience.data, updateSection]
  );

  /** Remove interest */
  const handleRemoveInterest = useCallback(
    (interest: string) => {
      const currentData = plan.audience.data;
      const newInterests = currentData.marketInterests.filter((mi) => mi !== interest);
      const newData = { ...currentData, marketInterests: newInterests };
      updateSection("audience", { data: newData });
    },
    [plan.audience.data, updateSection]
  );

  /** Remove location */
  const handleRemoveLocation = useCallback(
    (location: string) => {
      const currentData = plan.audience.data;
      const newLocations = currentData.locations.filter((l) => l !== location);
      const newData = { ...currentData, locations: newLocations };
      const value = `${newData.locations.join(", ") || "No locations"} · Ages ${newData.ageRange.min}-${newData.ageRange.max} · ${newData.gender === "all" ? "All genders" : newData.gender}`;
      updateSection("audience", { value, data: newData });
    },
    [plan.audience.data, updateSection]
  );

  /** Placement toggle */
  const handlePlacementToggle = useCallback(
    (placement: PlacementType) => {
      const current = plan.placements.data as PlacementType[];
      const updated = current.includes(placement)
        ? current.filter((p) => p !== placement)
        : [...current, placement];
      // Don't allow removing all placements
      if (updated.length === 0) return;
      const labels: Record<PlacementType, string> = {
        display: "Display", video: "Video", "ctv-ott": "CTV/OTT",
        native: "Native", audio: "Audio", dooh: "DOOH",
        "in-app": "In-App", "rich-media": "Rich Media",
      };
      const value = updated.map((p) => labels[p]).join(", ");
      updateSection("placements", { value, data: updated });
    },
    [plan.placements.data, updateSection]
  );

  const sections: { key: SectionKey; section: StrategySection }[] = SECTION_KEYS.map((key) => ({
    key,
    section: plan[key],
  }));

  // Determine current objective id from value
  const currentObjectiveId = OBJECTIVE_OPTIONS.find(
    (o) => o.value === plan.objective.value
  )?.id;

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
                {/* Objective — selectable buttons */}
                {key === "objective" && (
                  <div className="space-y-2">
                    <p className="text-[13px] text-[#394859] leading-relaxed mb-3">{section.value}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {OBJECTIVE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleObjectiveChange(opt.id)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                            currentObjectiveId === opt.id
                              ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                              : "border-[#E0E8F2] text-[#8492A6] hover:border-[#C4CDD8] hover:text-[#394859]"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget — editable form fields */}
                {key === "budgetSchedule" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#8492A6] mb-1">Daily budget</label>
                        <div className="flex items-center rounded-lg border border-[#E0E8F2] px-3 py-2 focus-within:border-[#2C9FDD]">
                          <span className="text-[13px] text-[#8492A6]">$</span>
                          <input
                            type="text"
                            defaultValue={plan.budgetSchedule.data.dailyBudget?.toString() || ""}
                            onBlur={(e) => handleBudgetChange("dailyBudget", e.target.value)}
                            className="ml-1 w-full bg-transparent text-[13px] text-[#394859] tabular-nums outline-none placeholder:text-[#C4CDD8]"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#8492A6] mb-1">Monthly budget</label>
                        <div className="flex items-center rounded-lg border border-[#E0E8F2] px-3 py-2 focus-within:border-[#2C9FDD]">
                          <span className="text-[13px] text-[#8492A6]">$</span>
                          <input
                            type="text"
                            defaultValue={plan.budgetSchedule.data.monthlyBudget?.toLocaleString() || ""}
                            onBlur={(e) => handleBudgetChange("monthlyBudget", e.target.value)}
                            className="ml-1 w-full bg-transparent text-[13px] text-[#394859] tabular-nums outline-none placeholder:text-[#C4CDD8]"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleAlwaysOnToggle}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                          plan.budgetSchedule.data.alwaysOn ? "bg-[#2C9FDD]" : "bg-[#C4CDD8]"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                          plan.budgetSchedule.data.alwaysOn ? "translate-x-[22px]" : "translate-x-[3px]"
                        )}
                        style={{ width: 18, height: 18 }}
                        />
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
                            <button type="button" onClick={() => handleRemoveLocation(loc)} className="text-[#C4CDD8] hover:text-[#8492A6]">&times;</button>
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
                            onBlur={(e) => handleAgeChange("min", e.target.value)}
                            className="w-16 rounded-lg border border-[#E0E8F2] px-2.5 py-1.5 text-[13px] text-[#394859] tabular-nums outline-none focus:border-[#2C9FDD]"
                          />
                          <span className="text-[#8492A6]">—</span>
                          <input
                            type="number"
                            defaultValue={plan.audience.data.ageRange.max}
                            onBlur={(e) => handleAgeChange("max", e.target.value)}
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
                              onClick={() => handleGenderChange(g)}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                                plan.audience.data.gender === g
                                  ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                                  : "border-[#E0E8F2] text-[#8492A6] hover:border-[#C4CDD8]"
                              )}
                            >
                              {g === "all" ? "All" : g.charAt(0).toUpperCase() + g.slice(1)}
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
                              <button type="button" onClick={() => handleRemoveInterest(mi)} className="text-[#1A7BB5]/40 hover:text-[#1A7BB5]">&times;</button>
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
                    onToggle={handlePlacementToggle}
                  />
                )}

                {/* Bidding — selectable for v1 */}
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
