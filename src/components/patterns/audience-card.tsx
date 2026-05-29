"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Users,
  Globe,
  Target,
  UserPlus,
  BarChart3,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AudienceSegment, AudienceSegmentType, AudienceRule } from "@/types/campaign";

const TYPE_CONFIG: Record<AudienceSegmentType, { label: string; icon: typeof Users; color: string; bg: string }> = {
  retargeting: { label: "Retargeting", icon: Target, color: "text-foreground", bg: "bg-muted" },
  lookalike: { label: "Lookalike", icon: UserPlus, color: "text-foreground", bg: "bg-muted" },
  "customer-list": { label: "Customer List", icon: Users, color: "text-foreground", bg: "bg-muted" },
  interest: { label: "Interest-based", icon: BarChart3, color: "text-foreground", bg: "bg-muted" },
};

const ALL_PLATFORMS = ["Meta", "Google", "TikTok", "LinkedIn", "X/Twitter"];

// CPM ranges by audience type (realistic mock data)
const CPM_BY_TYPE: Record<AudienceSegmentType, { min: number; max: number }> = {
  retargeting: { min: 8, max: 14 },
  lookalike: { min: 5, max: 10 },
  "customer-list": { min: 6, max: 12 },
  interest: { min: 3, max: 7 },
};

function parseSize(sizeStr: string): number {
  const cleaned = sizeStr.replace(/[^0-9,.\-–—]/g, " ").trim();
  const parts = cleaned.split(/[\-–—]/).map((s) => {
    const num = parseInt(s.replace(/[^0-9]/g, "")) || 0;
    return num;
  });
  if (parts.length >= 2) return Math.round((parts[0] + parts[1]) / 2);
  return parts[0] || 100000;
}

interface AudienceCardProps {
  segment: AudienceSegment;
  onUpdate?: (updated: AudienceSegment) => void;
}

type SectionId = "type" | "size" | "rules" | "forecast" | "platforms";

function SectionHeader({
  icon: Icon,
  label,
  collapsed,
  onToggle,
  showInfo,
  onInfoToggle,
}: {
  icon: typeof Users;
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  showInfo?: boolean;
  onInfoToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-[13px] font-medium text-foreground min-w-0">
        {label}
      </span>
      {onInfoToggle && (
        <button
          type="button"
          onClick={onInfoToggle}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
            showInfo ? "bg-accent text-muted-foreground" : "text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
          )}
          title="Why this value"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
      >
        {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ReachForecast({
  audienceSize,
  platformCount,
  audienceType,
}: {
  audienceSize: number;
  platformCount: number;
  audienceType: AudienceSegmentType;
}) {
  const [sizeMultiplier, setSizeMultiplier] = useState(50); // 0-100 slider, 50 = current size

  const forecast = useMemo(() => {
    const scale = 0.5 + (sizeMultiplier / 100);
    const adjustedSize = Math.round(audienceSize * scale);

    const platformMultiplier = Math.max(1, platformCount * 0.7);
    const weeklyReach = Math.round(adjustedSize * 0.35 * platformMultiplier);
    const dailyReach = Math.round(weeklyReach / 7);
    const weeklyImpressions = Math.round(weeklyReach * 3.2);
    const dailyImpressions = Math.round(weeklyImpressions / 7);

    const cpmRange = CPM_BY_TYPE[audienceType];
    const avgCpm = (cpmRange.min + cpmRange.max) / 2;
    const weeklyCost = Math.round((weeklyImpressions / 1000) * avgCpm);

    const confidence: "low" | "medium" | "high" =
      adjustedSize > 200000 && platformCount >= 2 ? "high" :
      adjustedSize > 50000 ? "medium" : "low";

    return {
      adjustedSize,
      weeklyReach,
      dailyReach,
      weeklyImpressions,
      dailyImpressions,
      weeklyCost,
      avgCpm,
      cpmRange,
      confidence,
    };
  }, [audienceSize, sizeMultiplier, platformCount, audienceType]);

  const confidenceColors = {
    low: "bg-amber-50 text-amber-600",
    medium: "bg-blue-50 text-blue-600",
    high: "bg-emerald-50 text-emerald-600",
  };

  const rows = [
    { label: "Adjusted audience", value: forecast.adjustedSize.toLocaleString() },
    { label: "Daily reach", value: forecast.dailyReach.toLocaleString() },
    { label: "Weekly reach", value: forecast.weeklyReach.toLocaleString() },
    { label: "Weekly impressions", value: forecast.weeklyImpressions.toLocaleString() },
    { label: "Est. weekly spend", value: `$${forecast.weeklyCost.toLocaleString()}` },
    { label: "Est. CPM", value: `$${forecast.cpmRange.min}–$${forecast.cpmRange.max}` },
  ];

  return (
    <div className="space-y-3">
      {/* Audience size slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-medium text-muted-foreground">Audience size</label>
          <span className="text-[12px] font-semibold tabular-nums text-foreground">
            {forecast.adjustedSize.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={sizeMultiplier}
          onChange={(e) => setSizeMultiplier(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border accent-[#2C9FDD] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2C9FDD] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-sm"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground/40">Narrower</span>
          <span className="text-[10px] text-muted-foreground/40">Broader</span>
        </div>
      </div>

      {/* Forecast table */}
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

      {/* Confidence */}
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-medium",
          confidenceColors[forecast.confidence]
        )}>
          {forecast.confidence} confidence
        </span>
        <span className="text-[11px] text-muted-foreground/40">
          · {forecast.confidence === "high" ? "Strong signal from audience size and platforms" : forecast.confidence === "medium" ? "Moderate signal — consider broadening" : "Limited data — estimates may vary significantly"}
        </span>
      </div>
    </div>
  );
}

export function AudienceCard({ segment, onUpdate }: AudienceCardProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionId>>(new Set());
  const [showRationale, setShowRationale] = useState<SectionId | null>(null);
  const [addingRule, setAddingRule] = useState(false);
  const [newRuleLabel, setNewRuleLabel] = useState("");
  const [newRuleValue, setNewRuleValue] = useState("");

  const config = TYPE_CONFIG[segment.type];
  const parsedSize = useMemo(() => parseSize(segment.estimatedSize), [segment.estimatedSize]);

  function toggleCollapse(id: SectionId) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRationale(id: SectionId) {
    setShowRationale((prev) => (prev === id ? null : id));
  }

  const emitUpdate = useCallback(
    (patch: Partial<AudienceSegment>) => {
      if (!onUpdate) return;
      onUpdate({
        ...segment,
        ...patch,
        lastModifiedAt: new Date().toISOString(),
      });
    },
    [segment, onUpdate]
  );

  const handleTypeChange = useCallback(
    (type: AudienceSegmentType) => {
      const typeLabel = TYPE_CONFIG[type].label;
      const nameParts = segment.name.split(" — ");
      const baseName = nameParts[0];
      emitUpdate({
        type,
        name: nameParts.length > 1 ? `${baseName} — ${typeLabel}` : segment.name,
      });
    },
    [segment.name, emitUpdate]
  );

  const handleSizeChange = useCallback(
    (value: string) => {
      if (value.trim() && value.trim() !== segment.estimatedSize) {
        emitUpdate({ estimatedSize: value.trim() });
      }
    },
    [segment.estimatedSize, emitUpdate]
  );

  const handleRuleValueChange = useCallback(
    (index: number, newValue: string) => {
      const updated = segment.rules.map((rule, i) =>
        i === index
          ? { ...rule, value: newValue, provenance: { ...rule.provenance, source: "user_input" as const } }
          : rule
      );
      emitUpdate({ rules: updated });
    },
    [segment.rules, emitUpdate]
  );

  const handleRuleLabelChange = useCallback(
    (index: number, newLabel: string) => {
      const updated = segment.rules.map((rule, i) =>
        i === index ? { ...rule, label: newLabel } : rule
      );
      emitUpdate({ rules: updated });
    },
    [segment.rules, emitUpdate]
  );

  const handleRemoveRule = useCallback(
    (index: number) => {
      const updated = segment.rules.filter((_, i) => i !== index);
      emitUpdate({ rules: updated });
    },
    [segment.rules, emitUpdate]
  );

  const handleAddRule = useCallback(() => {
    if (!newRuleLabel.trim() || !newRuleValue.trim()) return;
    const newRule: AudienceRule = {
      label: newRuleLabel.trim(),
      value: newRuleValue.trim(),
      provenance: { source: "user_input", reasoning: "Added by user" },
    };
    emitUpdate({ rules: [...segment.rules, newRule] });
    setNewRuleLabel("");
    setNewRuleValue("");
    setAddingRule(false);
  }, [newRuleLabel, newRuleValue, segment.rules, emitUpdate]);

  const handlePlatformToggle = useCallback(
    (platform: string) => {
      const current = segment.platforms;
      const updated = current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform];
      if (updated.length === 0) return;
      emitUpdate({ platforms: updated });
    },
    [segment.platforms, emitUpdate]
  );

  return (
    <div className="space-y-4">
      {/* Audience Type */}
      <div className="rounded-xl border border-border bg-white">
        <SectionHeader
          icon={config.icon}
          label="Audience Type"
          collapsed={collapsedSections.has("type")}
          onToggle={() => toggleCollapse("type")}
        />
        {!collapsedSections.has("type") && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(TYPE_CONFIG) as [AudienceSegmentType, typeof config][]).map(
                ([type, cfg]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors",
                      segment.type === type
                        ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                        : "border-border text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {cfg.label}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Estimated Size */}
      <div className="rounded-xl border border-border bg-white">
        <SectionHeader
          icon={Users}
          label="Estimated Size"
          collapsed={collapsedSections.has("size")}
          onToggle={() => toggleCollapse("size")}
        />
        {!collapsedSections.has("size") && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="flex items-center rounded-lg border border-border px-3 py-2 focus-within:border-[#2C9FDD]">
              <input
                type="text"
                defaultValue={segment.estimatedSize}
                onBlur={(e) => handleSizeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-full bg-transparent text-[14px] font-semibold text-foreground tabular-nums outline-none placeholder:text-muted-foreground/40"
                placeholder="e.g. 340,000 - 520,000"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Estimated reach across selected platforms
            </p>
          </div>
        )}
      </div>

      {/* Targeting Rules */}
      <div className="rounded-xl border border-border bg-white">
        <SectionHeader
          icon={Target}
          label="Targeting Rules"
          collapsed={collapsedSections.has("rules")}
          onToggle={() => toggleCollapse("rules")}
          showInfo={showRationale === "rules"}
          onInfoToggle={() => toggleRationale("rules")}
        />

        {showRationale === "rules" && (
          <div className="mx-4 mb-2 rounded-lg bg-accent px-3 py-2 text-[12px] text-muted-foreground leading-relaxed">
            Rules define who is included in this audience segment. AI-inferred rules are based on your brand profile and audience type. Edit any rule or add your own.
          </div>
        )}

        {!collapsedSections.has("rules") && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="space-y-2.5">
              {segment.rules.map((rule, i) => (
                <div key={i} className="group rounded-lg border border-border bg-accent px-3.5 py-2.5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        defaultValue={rule.label}
                        onBlur={(e) => {
                          if (e.target.value.trim() !== rule.label) {
                            handleRuleLabelChange(i, e.target.value.trim());
                          }
                        }}
                        className="block w-full bg-transparent text-[12px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40 focus:underline focus:decoration-[#2C9FDD] focus:underline-offset-2"
                        placeholder="Rule name"
                      />
                      <input
                        type="text"
                        defaultValue={rule.value}
                        onBlur={(e) => {
                          if (e.target.value.trim() !== rule.value) {
                            handleRuleValueChange(i, e.target.value.trim());
                          }
                        }}
                        className="block w-full bg-transparent text-[12px] text-muted-foreground outline-none placeholder:text-muted-foreground/40 focus:text-foreground focus:underline focus:decoration-[#2C9FDD] focus:underline-offset-2"
                        placeholder="Rule value"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          rule.provenance.source === "user_input"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {rule.provenance.source === "user_input" ? "Your input" : "AI inferred"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(i)}
                        className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                        title="Remove rule"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add rule */}
              {addingRule ? (
                <div className="rounded-lg border border-[#2C9FDD] bg-white px-3.5 py-2.5">
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={newRuleLabel}
                      onChange={(e) => setNewRuleLabel(e.target.value)}
                      placeholder="Rule name (e.g. Lookback window)"
                      className="block w-full bg-transparent text-[12px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newRuleValue}
                      onChange={(e) => setNewRuleValue(e.target.value)}
                      placeholder="Rule value (e.g. Last 90 days)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddRule();
                        if (e.key === "Escape") { setAddingRule(false); setNewRuleLabel(""); setNewRuleValue(""); }
                      }}
                      className="block w-full bg-transparent text-[12px] text-muted-foreground outline-none placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddRule}
                      disabled={!newRuleLabel.trim() || !newRuleValue.trim()}
                      className="rounded-md bg-[#2C9FDD] px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#1A7BB5] disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingRule(false); setNewRuleLabel(""); setNewRuleValue(""); }}
                      className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingRule(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-[12px] text-muted-foreground transition-colors hover:border-border hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add targeting rule
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reach Forecast */}
      <div className="rounded-xl border border-border bg-white">
        <SectionHeader
          icon={TrendingUp}
          label="Reach Forecast"
          collapsed={collapsedSections.has("forecast")}
          onToggle={() => toggleCollapse("forecast")}
          showInfo={showRationale === "forecast"}
          onInfoToggle={() => toggleRationale("forecast")}
        />

        {showRationale === "forecast" && (
          <div className="mx-4 mb-2 rounded-lg bg-accent px-3 py-2 text-[12px] text-muted-foreground leading-relaxed">
            Reach estimates are based on audience size, selected platforms, and historical CPM data for this audience type. Drag the slider to see how narrowing or broadening your audience affects projected reach and spend.
          </div>
        )}

        {!collapsedSections.has("forecast") && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <ReachForecast
              audienceSize={parsedSize}
              platformCount={segment.platforms.length}
              audienceType={segment.type}
            />
          </div>
        )}
      </div>

      {/* Platforms */}
      <div className="rounded-xl border border-border bg-white">
        <SectionHeader
          icon={Globe}
          label="Platforms"
          collapsed={collapsedSections.has("platforms")}
          onToggle={() => toggleCollapse("platforms")}
        />
        {!collapsedSections.has("platforms") && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {ALL_PLATFORMS.map((platform) => {
                const active = segment.platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handlePlatformToggle(platform)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all",
                      active
                        ? "border-[#2C9FDD] bg-[#EBF5FB] text-[#1A7BB5]"
                        : "border-border text-muted-foreground hover:border-border"
                    )}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
