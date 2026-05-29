"use client";

import { useState, useCallback, useRef } from "react";
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
  Upload,
  Wand2,
  X,
  Calendar,
  Hash,
  MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  StrategyPlan,
  StrategySection,
  ReadinessState,
  PlacementType,
  AudienceTargetingMode,
  OptimizationTarget,
  AuthorshipState,
  ProvenanceSource,
} from "@/types/campaign";
import { PLACEMENT_TYPES } from "@/data/iab-categories";
import { OBJECTIVE_OPTIONS } from "@/data/campaign-flow";
import { getCurrentBrand } from "@/data/brand-profiles";
import { generateForecast } from "@/data/forecast-mocks";

const OPTIMIZATION_TARGETS: { id: OptimizationTarget; label: string }[] = [
  { id: "conversions", label: "Conversions" },
  { id: "clicks", label: "Clicks" },
  { id: "impressions", label: "Impressions" },
  { id: "reach", label: "Reach" },
  { id: "video-views", label: "Video views" },
];

const TARGETING_MODES: { id: AudienceTargetingMode; label: string }[] = [
  { id: "accounts", label: "Accounts" },
  { id: "contacts", label: "Contacts" },
  { id: "lookalike", label: "Lookalike" },
];

interface CreativeAsset {
  id: string;
  src: string;
  label: string;
  source: "uploaded" | "ai-generated";
}

/** Gradient placeholders for AI-generated creatives when no brand images exist */
const AI_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
];

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

const AUTHORSHIP_LABELS: Record<AuthorshipState, { label: string; className: string }> = {
  proposed: { label: "AI proposed", className: "text-muted-foreground bg-muted" },
  decided: { label: "Confirmed", className: "text-emerald-600 bg-emerald-50" },
  edited: { label: "Edited", className: "text-[#1A7BB5] bg-[#EBF5FB]" },
  locked: { label: "Locked", className: "text-muted-foreground bg-muted" },
};

const SOURCE_LABELS: Record<ProvenanceSource, string> = {
  user_input: "User input",
  ai_inferred: "AI inferred",
  brief_extracted: "Extracted from brief",
  default: "System default",
  previous_campaign: "Previous campaign",
};

function AuthorshipBadge({ state, filled }: { state: AuthorshipState; filled: boolean }) {
  // Unfilled + proposed = needs review
  if (!filled && state === "proposed") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
        Needs review
      </span>
    );
  }
  const config = AUTHORSHIP_LABELS[state];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", config.className)}>
      {config.label}
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
  return <Icon className="h-4 w-4 text-muted-foreground" />;
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

const PREMIUM_PLACEMENTS = new Set<PlacementType>(["ctv-ott", "dooh"]);

function PlacementGrid({ placements, onToggle }: {
  placements: PlacementType[];
  onToggle: (p: PlacementType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {PLACEMENT_TYPES.map((pt) => {
        const active = placements.includes(pt.id);
        const isPremium = PREMIUM_PLACEMENTS.has(pt.id);
        return (
          <button
            key={pt.id}
            type="button"
            onClick={() => onToggle(pt.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition-all",
              active
                ? isPremium
                  ? "border-[#7C3AED] bg-[#F5F3FF] text-[#6D28D9]"
                  : "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                : "border-border text-muted-foreground hover:border-border"
            )}
          >
            <span className="font-medium">{pt.label}</span>
            {isPremium && (
              <span className={cn(
                "rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                active ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-muted text-muted-foreground"
              )}>
                Premium
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ForecastTable({ forecast }: { forecast: StrategyPlan["forecast"]["data"] }) {
  const rows = [
    ...(forecast.potentialAudienceSize ? [{ label: "Potential audience", value: forecast.potentialAudienceSize.toLocaleString() }] : []),
    { label: "Weekly reach", value: forecast.weeklyReach.toLocaleString() },
    { label: "Daily reach", value: forecast.dailyReach.toLocaleString() },
    { label: "Weekly impressions", value: forecast.weeklyImpressions.toLocaleString() },
    { label: "Daily impressions", value: forecast.dailyImpressions.toLocaleString() },
    ...(forecast.estimatedCPM ? [{ label: "Est. CPM", value: `$${forecast.estimatedCPM.toFixed(2)}` }] : []),
    ...(forecast.estimatedFrequency ? [{ label: "Frequency", value: `${forecast.estimatedFrequency.toFixed(1)}x` }] : []),
    { label: "Est. households", value: forecast.estimatedHouseholds.toLocaleString() },
  ];

  const confidenceColors = {
    low: "bg-amber-50 text-amber-600",
    medium: "bg-blue-50 text-blue-600",
    high: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div>
      <div className="rounded-lg border border-border overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between px-3 py-1.5 text-[12px]",
              i > 0 && "border-t border-border"
            )}
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums text-foreground">{row.value}</span>
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

/** Controlled budget input — shows formatted value, edits raw number */
function BudgetInput({ label, value, onChange }: { label: string; value: number; onChange: (raw: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  return (
    <div>
      <label className="block text-[11px] font-medium text-muted-foreground mb-1">{label}</label>
      <div className="flex items-center rounded-lg border border-border px-3 py-2 focus-within:border-[#2C9FDD]">
        <span className="text-[13px] text-muted-foreground">$</span>
        <input
          type="text"
          value={editing ? editValue : value.toLocaleString()}
          onFocus={() => { setEditing(true); setEditValue(value.toString()); }}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => { setEditing(false); onChange(editValue); }}
          onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
          className="ml-1 w-full bg-transparent text-[13px] text-foreground tabular-nums outline-none placeholder:text-muted-foreground/40"
          placeholder="0"
        />
      </div>
    </div>
  );
}

export function StrategyCard({ plan, onUpdate }: StrategyCardProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionKey>>(new Set());
  const [showRationale, setShowRationale] = useState<SectionKey | null>(null);
  const [creativeAssets, setCreativeAssets] = useState<CreativeAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleCollapse(key: SectionKey) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** Immutable update helper — updates a section, recalculates forecast, and calls onUpdate */
  const updateSection = useCallback(
    (key: SectionKey, patch: Partial<StrategySection> & { data?: unknown }) => {
      if (!onUpdate) return;
      const now = new Date().toISOString();
      const current = plan[key];
      // Push previous value into edit history
      const prevEdit = {
        previousValue: current.value,
        editedAt: now,
        editedBy: "user" as const,
      };
      const editHistory = [...(current.editHistory || []), prevEdit];

      const updated: StrategyPlan = {
        ...plan,
        [key]: {
          ...current,
          ...patch,
          authorshipState: "edited" as const,
          editHistory,
          lastModifiedAt: now,
        },
        lastModifiedAt: now,
        lastModifiedBy: "user",
      };

      // Recalculate forecast when budget, placements, or audience change
      if (key === "budgetSchedule" || key === "placements" || key === "audience") {
        const budget = key === "budgetSchedule"
          ? (patch.data as { dailyBudget?: number })?.dailyBudget ?? plan.budgetSchedule.data.dailyBudget ?? 0
          : plan.budgetSchedule.data.dailyBudget ?? 0;
        const placements = key === "placements"
          ? (patch.data as PlacementType[])
          : (plan.placements.data as PlacementType[]);
        const audience = key === "audience"
          ? { ...plan.audience.data, ...(patch.data as Record<string, unknown>) }
          : plan.audience.data;

        const newForecast = generateForecast(budget, placements, audience);
        updated.forecast = {
          ...updated.forecast,
          data: newForecast,
          value: `${newForecast.weeklyReach.toLocaleString()} weekly reach · ${newForecast.dailyImpressions.toLocaleString()} daily impressions`,
          provenance: {
            ...updated.forecast.provenance,
            reasoning: "Forecast recalculated based on your changes to budget, placements, or audience.",
          },
          authorshipState: "edited",
        };
      }

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

  /** Sync creative section value + readiness when assets change */
  const syncCreativeSection = useCallback(
    (assets: CreativeAsset[]) => {
      if (assets.length === 0) {
        updateSection("creative", {
          value: "No creative assets",
          readiness: "limited" as ReadinessState,
        });
      } else {
        const uploadCount = assets.filter((a) => a.source === "uploaded").length;
        const aiCount = assets.filter((a) => a.source === "ai-generated").length;
        const parts: string[] = [];
        if (uploadCount > 0) parts.push(`${uploadCount} uploaded`);
        if (aiCount > 0) parts.push(`${aiCount} AI-generated`);
        updateSection("creative", {
          value: `${assets.length} asset${assets.length !== 1 ? "s" : ""} ready — ${parts.join(", ")}`,
          readiness: "ready" as ReadinessState,
          filled: true,
          provenance: {
            source: "user_input" as const,
            reasoning: `User added ${assets.length} creative asset${assets.length !== 1 ? "s" : ""}.`,
            confidence: "high" as const,
          },
        });
      }
    },
    [updateSection]
  );

  /** Handle file upload */
  const handleCreativeUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const newAsset: CreativeAsset = {
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            src: reader.result as string,
            label: file.name,
            source: "uploaded",
          };
          setCreativeAssets((prev) => {
            const next = [...prev, newAsset];
            syncCreativeSection(next);
            return next;
          });
        };
        reader.readAsDataURL(file);
      });
      // Reset so re-uploading the same file triggers onChange
      e.target.value = "";
    },
    [syncCreativeSection]
  );

  /** Generate AI creatives (simulated) */
  const handleGenerateAI = useCallback(() => {
    if (isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => {
      const brand = getCurrentBrand();
      const variations = ["Variation A", "Variation B", "Variation C"];
      const newAssets: CreativeAsset[] = variations.map((label, i) => ({
        id: `ai-${Date.now()}-${i}`,
        src: brand?.cardImages?.[i] ?? `gradient:${i}`,
        label,
        source: "ai-generated" as const,
      }));
      setCreativeAssets((prev) => {
        const next = [...prev, ...newAssets];
        syncCreativeSection(next);
        return next;
      });
      setIsGenerating(false);
    }, 1500);
  }, [isGenerating, syncCreativeSection]);

  /** Remove a creative asset */
  const handleRemoveCreative = useCallback(
    (id: string) => {
      setCreativeAssets((prev) => {
        const next = prev.filter((a) => a.id !== id);
        syncCreativeSection(next);
        return next;
      });
    },
    [syncCreativeSection]
  );

  const sections: { key: SectionKey; section: StrategySection }[] = SECTION_KEYS.map((key) => ({
    key,
    section: plan[key],
  }));

  // Determine current objective id from value
  const currentObjectiveId = OBJECTIVE_OPTIONS.find(
    (o) => o.value === plan.objective.value
  )?.id;

  const hasKeywords = plan.keywords && plan.keywords.length > 0;

  return (
    <div className="space-y-4">
      {sections.map(({ key, section }) => {
        const isCollapsed = collapsedSections.has(key);
        const showingRationale = showRationale === key;

        return (
          <div key={key} className="rounded-xl border border-border bg-white">
            {/* Section header */}
            <div className="flex items-center gap-2 px-4 py-3">
              <SectionIcon section={key} />
              <span className="flex-1 text-[13px] font-medium text-foreground min-w-0">
                {section.label}
              </span>
              <AuthorshipBadge state={section.authorshipState} filled={section.filled} />
              <ReadinessBadge state={section.readiness} />
              <button
                type="button"
                onClick={() => setShowRationale(showingRationale ? null : key)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                  showingRationale
                    ? "bg-[#EBF5FB] text-[#1A7BB5]"
                    : "text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
                )}
                title="Why this value"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleCollapse(key)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
              >
                {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Provenance rationale */}
            {showingRationale && (
              <div className="mx-4 mb-2 rounded-lg bg-accent px-3 py-2.5 text-[12px] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {SOURCE_LABELS[section.provenance.source]}
                  </span>
                  {section.provenance.confidence && (
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      section.provenance.confidence === "high" ? "bg-emerald-50 text-emerald-600" :
                      section.provenance.confidence === "medium" ? "bg-amber-50 text-amber-600" :
                      "bg-red-50 text-red-500"
                    )}>
                      {section.provenance.confidence} confidence
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground">{section.provenance.reasoning}</p>
                {section.editHistory && section.editHistory.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground/40">
                    {section.editHistory.length} previous {section.editHistory.length === 1 ? "edit" : "edits"}
                  </p>
                )}
              </div>
            )}

            {/* Section content — always visible unless collapsed */}
            {!isCollapsed && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                {/* Objective — selectable buttons */}
                {key === "objective" && (
                  <div className="space-y-2">
                    <p className="text-[13px] text-foreground leading-relaxed mb-3">{section.value}</p>
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
                              : "border-border text-muted-foreground hover:border-border hover:text-foreground"
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
                      <BudgetInput
                        label="Daily budget"
                        value={plan.budgetSchedule.data.dailyBudget ?? 0}
                        onChange={(v) => handleBudgetChange("dailyBudget", v)}
                      />
                      <BudgetInput
                        label="Monthly budget"
                        value={plan.budgetSchedule.data.monthlyBudget ?? 0}
                        onChange={(v) => handleBudgetChange("monthlyBudget", v)}
                      />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleAlwaysOnToggle}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                          plan.budgetSchedule.data.alwaysOn ? "bg-[#2C9FDD]" : "bg-muted-foreground/40"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                          plan.budgetSchedule.data.alwaysOn ? "translate-x-[22px]" : "translate-x-[3px]"
                        )}
                        style={{ width: 18, height: 18 }}
                        />
                      </button>
                      <span className="text-[12px] text-foreground">Always on</span>
                    </div>

                    {/* Schedule — start / end dates */}
                    {!plan.budgetSchedule.data.alwaysOn && (
                      <div className="rounded-lg border border-border p-3">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Schedule
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Start date</label>
                            <input
                              type="date"
                              defaultValue={plan.budgetSchedule.data.startDate || ""}
                              onBlur={(e) => {
                                const currentData = plan.budgetSchedule.data;
                                updateSection("budgetSchedule", {
                                  data: { ...currentData, startDate: e.target.value || null },
                                });
                              }}
                              className="w-full rounded-lg border border-border px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-ring"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">End date</label>
                            <input
                              type="date"
                              defaultValue={plan.budgetSchedule.data.endDate || ""}
                              onBlur={(e) => {
                                const currentData = plan.budgetSchedule.data;
                                updateSection("budgetSchedule", {
                                  data: { ...currentData, endDate: e.target.value || null },
                                });
                              }}
                              className="w-full rounded-lg border border-border px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-ring"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audience — form fields */}
                {key === "audience" && (
                  <div className="space-y-3 text-[12px]">
                    {/* Targeting mode tabs */}
                    <div className="flex items-center gap-1 rounded-lg bg-accent p-0.5">
                      {TARGETING_MODES.map((mode) => {
                        const isActive = (plan.audience.data.targetingMode || "accounts") === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              const currentData = plan.audience.data;
                              updateSection("audience", { data: { ...currentData, targetingMode: mode.id } });
                            }}
                            className={cn(
                              "flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                              isActive
                                ? "bg-white text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {mode.label}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Locations</label>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.audience.data.locations.map((loc) => (
                          <span key={loc} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-foreground">
                            {loc}
                            <button type="button" onClick={() => handleRemoveLocation(loc)} className="text-muted-foreground/40 hover:text-muted-foreground">&times;</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          placeholder="Add location..."
                          className="rounded-full border border-dashed border-border px-2.5 py-1 text-[12px] outline-none placeholder:text-muted-foreground/40 focus:border-ring"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Age range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            defaultValue={plan.audience.data.ageRange.min}
                            onBlur={(e) => handleAgeChange("min", e.target.value)}
                            className="w-16 rounded-lg border border-border px-2.5 py-1.5 text-[13px] text-foreground tabular-nums outline-none focus:border-ring"
                          />
                          <span className="text-muted-foreground">—</span>
                          <input
                            type="number"
                            defaultValue={plan.audience.data.ageRange.max}
                            onBlur={(e) => handleAgeChange("max", e.target.value)}
                            className="w-16 rounded-lg border border-border px-2.5 py-1.5 text-[13px] text-foreground tabular-nums outline-none focus:border-ring"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Gender</label>
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
                                  : "border-border text-muted-foreground hover:border-border"
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
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Interests</label>
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

                    {/* Contextual keywords */}
                    {(plan.audience.data.contextualKeywords?.length ?? 0) > 0 && (
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                          <Hash className="mr-1 inline h-3 w-3" />
                          Contextual keywords
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.audience.data.contextualKeywords!.map((kw) => (
                            <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-foreground">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exclude segments */}
                    <div className="rounded-lg border border-dashed border-border p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <MinusCircle className="h-3 w-3" />
                        Exclude
                      </div>
                      {(plan.audience.data.excludeSegments?.length ?? 0) > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {plan.audience.data.excludeSegments!.map((seg) => (
                            <span key={seg} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[12px] text-red-600">
                              {seg}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-[12px] text-muted-foreground/40">No excluded segments. Click to add.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Placements — toggle grid */}
                {key === "placements" && (
                  <PlacementGrid
                    placements={plan.placements.data}
                    onToggle={handlePlacementToggle}
                  />
                )}

                {/* Bidding — bid strategy + optimization target */}
                {key === "bidding" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Bid strategy</label>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg border border-[#2C9FDD] bg-[#EBF5FB] px-3 py-1.5 text-[12px] font-medium text-[#1A7BB5]">
                          Automatic
                        </span>
                        <span className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground/40">
                          Manual (coming soon)
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Optimization target</label>
                      <div className="flex flex-wrap gap-1.5">
                        {OPTIMIZATION_TARGETS.map((opt) => {
                          const isActive = (plan.bidding.data.optimizationTarget || "conversions") === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                const currentData = plan.bidding.data;
                                updateSection("bidding", { data: { ...currentData, optimizationTarget: opt.id } });
                              }}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                                isActive
                                  ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                                  : "border-border text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Creative — upload + AI generate */}
                {key === "creative" && (
                  <div className="space-y-3">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      onChange={handleCreativeUpload}
                      className="hidden"
                    />

                    {/* Action buttons — Upload is primary, Generate is secondary */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-[1.2] rounded-lg border-2 border-dashed border-[#2C9FDD]/30 bg-[#EBF5FB]/30 px-4 py-6 text-center text-[12px] text-foreground transition-colors hover:border-[#2C9FDD]/50 hover:bg-[#EBF5FB]/60"
                      >
                        <Upload className="mx-auto mb-1.5 h-5 w-5 text-[#2C9FDD]" />
                        <span className="font-medium">Upload your assets</span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">Images, video, or display ads</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateAI}
                        disabled={isGenerating}
                        className={cn(
                          "flex-[0.8] rounded-lg border border-dashed border-border px-4 py-6 text-center text-[12px] text-muted-foreground transition-colors",
                          isGenerating
                            ? "animate-pulse bg-accent"
                            : "hover:border-border hover:bg-accent"
                        )}
                      >
                        <Wand2 className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/40" />
                        {isGenerating ? "Generating..." : "Generate with AI"}
                        <span className="mt-1 block text-[11px] text-muted-foreground/40">~15 min · best for new CTV</span>
                      </button>
                    </div>

                    {/* Creative thumbnails grid */}
                    {creativeAssets.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {creativeAssets.map((asset) => {
                          const isGradient = asset.src.startsWith("gradient:");
                          const gradientIdx = isGradient ? parseInt(asset.src.split(":")[1]) : 0;
                          return (
                            <div
                              key={asset.id}
                              className="group relative aspect-square overflow-hidden rounded-lg border border-border"
                            >
                              {isGradient ? (
                                <div
                                  className="flex h-full w-full items-center justify-center"
                                  style={{ background: AI_GRADIENTS[gradientIdx % AI_GRADIENTS.length] }}
                                >
                                  <span className="text-[11px] font-medium text-white/90 drop-shadow-sm">
                                    {asset.label}
                                  </span>
                                </div>
                              ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={asset.src}
                                  alt={asset.label}
                                  className="h-full w-full object-cover"
                                />
                              )}

                              {/* AI badge */}
                              {asset.source === "ai-generated" && (
                                <span className="absolute left-1.5 top-1.5 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                  AI
                                </span>
                              )}

                              {/* Remove button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveCreative(asset.id)}
                                className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <X className="h-3 w-3" />
                              </button>

                              {/* Label on hover for non-gradient assets */}
                              {!isGradient && (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#394859]/70 to-transparent px-2 pb-1.5 pt-4 opacity-0 transition-opacity group-hover:opacity-100">
                                  <span className="text-[10px] font-medium text-white truncate block">
                                    {asset.label}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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

      {/* Keywords section — separate from the collapsible sections */}
      {hasKeywords && (
        <div className="rounded-xl border border-border bg-white">
          <div className="flex items-center gap-2 px-4 py-3">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-[13px] font-medium text-foreground">
              Keywords
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {plan.keywords.length}
            </span>
          </div>
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {plan.keywords.map((kw) => (
                <span
                  key={kw.id}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[12px]",
                    kw.selected
                      ? "bg-[#EBF5FB] text-[#1A7BB5]"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {kw.label}
                  <span className="ml-1 text-[10px] opacity-60 capitalize">
                    {kw.category}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
