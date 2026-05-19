"use client";

import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { cn } from "@/lib/utils";
import { Megaphone, Plus, Clock, ChevronRight } from "lucide-react";
import type { StrategyPlan, StrategyPlanStatus } from "@/types/campaign";

const STATUS_CONFIG: Record<StrategyPlanStatus, { label: string; dot: string; bg: string; text: string }> = {
  draft: { label: "Draft", dot: "bg-[#C4CDD8]", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
  "pending-approval": { label: "Pending", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-600" },
  approved: { label: "Approved", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  paused: { label: "Paused", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-600" },
  archived: { label: "Archived", dot: "bg-[#C4CDD8]", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StrategyRow({ strategy, onOpen }: { strategy: StrategyPlan; onOpen: () => void }) {
  const config = STATUS_CONFIG[strategy.status];
  const objectiveLabel = strategy.objective.value || "No objective";
  const budget = strategy.budgetSchedule.data.monthlyBudget
    ? `$${strategy.budgetSchedule.data.monthlyBudget.toLocaleString()}/mo`
    : "No budget";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-4 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3.5 text-left transition-all hover:border-[#C4CDD8] hover:shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EBF5FB]">
        <Megaphone className="h-4 w-4 text-[#2C9FDD]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-[#394859]">{strategy.name}</span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", config.bg, config.text)}>
            {config.label}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[#8492A6]">
          <span className="truncate">{objectiveLabel}</span>
          <span>·</span>
          <span>{budget}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(strategy.lastModifiedAt)}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#C4CDD8] transition-colors group-hover:text-[#8492A6]" />
    </button>
  );
}

export default function CampaignsPage() {
  const { savedStrategies, savedAdvertisers, setActiveStrategy, activeNarrative, setActiveNarrative } = useCampaign();
  const { openFullscreen, setState } = useAICompanion();

  // Build advertiser name lookup
  const advNames = new Map(savedAdvertisers.map((a) => [a.id, a.companyName]));

  // Group strategies by advertiser — use company name as the display key
  const grouped = savedStrategies.reduce<Record<string, StrategyPlan[]>>((acc, s) => {
    const key = advNames.get(s.advertiserId) || s.advertiserId || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  // Sort groups by most recently modified
  const groupEntries = Object.entries(grouped).sort((a, b) => {
    const aLatest = Math.max(...a[1].map((s) => new Date(s.lastModifiedAt).getTime()));
    const bLatest = Math.max(...b[1].map((s) => new Date(s.lastModifiedAt).getTime()));
    return bLatest - aLatest;
  });

  function handleOpenStrategy(strategy: StrategyPlan) {
    // Clear any active narrative so the split canvas shows the strategy
    if (activeNarrative) setActiveNarrative(null);
    setActiveStrategy(strategy);
    setState("split");
  }

  function handleNewCampaign() {
    openFullscreen("Build me a campaign");
  }

  const isEmpty = savedStrategies.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="mt-0.5 text-[13px] text-[#8492A6]">
            {isEmpty ? "No campaigns yet" : `${savedStrategies.length} campaign${savedStrategies.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewCampaign}
          className="flex items-center gap-1.5 rounded-lg bg-[#2C9FDD] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#1A7BB5]"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </button>
      </div>

      {isEmpty ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F9FB]">
            <Megaphone className="h-6 w-6 text-[#C4CDD8]" />
          </div>
          <h2 className="mt-4 text-[14px] font-semibold text-[#394859]">No campaigns yet</h2>
          <p className="mt-1 max-w-xs text-[13px] text-[#8492A6]">
            Build your first campaign and it will show up here. You can also save drafts from the AI companion.
          </p>
          <button
            type="button"
            onClick={handleNewCampaign}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#2C9FDD] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#1A7BB5]"
          >
            <Plus className="h-4 w-4" />
            Build a campaign
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groupEntries.map(([advertiser, strategies]) => (
            <div key={advertiser}>
              <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wider text-[#8492A6]">
                {advertiser}
              </h3>
              <div className="space-y-2">
                {strategies
                  .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
                  .map((s) => (
                    <StrategyRow key={s.id} strategy={s} onOpen={() => handleOpenStrategy(s)} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
