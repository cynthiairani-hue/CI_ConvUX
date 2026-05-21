"use client";

import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { getCurrentBrand } from "@/data/brand-profiles";
import { cn } from "@/lib/utils";
import { Megaphone, Plus, Clock, Sparkles, Copy, Pencil, Share2, Archive, Trash2 } from "lucide-react";
import { CardOverflowMenu, type OverflowAction } from "@/components/patterns/card-overflow-menu";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";
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

function StrategyRow({ strategy, onOpen, onAction }: { strategy: StrategyPlan; onOpen: () => void; onAction: (actionId: string) => void }) {
  const config = STATUS_CONFIG[strategy.status];
  const objectiveLabel = strategy.objective.value || "No objective";
  const budget = strategy.budgetSchedule.data.monthlyBudget
    ? `$${strategy.budgetSchedule.data.monthlyBudget.toLocaleString()}/mo`
    : "No budget";

  const actions: OverflowAction[] = [
    { id: "duplicate", label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => onAction("duplicate") },
    { id: "rename", label: "Rename", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => onAction("rename") },
    { id: "share", label: "Share", icon: <Share2 className="h-3.5 w-3.5" />, onClick: () => onAction("share") },
    { id: "archive", label: "Archive", icon: <Archive className="h-3.5 w-3.5" />, onClick: () => onAction("archive") },
    { id: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: () => onAction("delete") },
  ];

  return (
    <div
      onClick={onOpen}
      className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3.5 text-left transition-all hover:border-[#C4CDD8] hover:shadow-sm"
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
      <CardOverflowMenu actions={actions} />
    </div>
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
  const brand = getCurrentBrand();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaigns</h1>
              <p className="mt-0.5 text-[13px] text-[#8492A6]">
                {isEmpty ? "Your campaigns will live here" : `${savedStrategies.length} campaign${savedStrategies.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {!isEmpty && (
              <button
                type="button"
                onClick={handleNewCampaign}
                className="flex items-center gap-1.5 rounded-lg bg-[#2C9FDD] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#1A7BB5]"
              >
                <Plus className="h-4 w-4" />
                New campaign
              </button>
            )}
          </div>

          {isEmpty ? (
            <div className="mt-10 flex flex-col items-center rounded-xl bg-white px-8 py-10 text-center">
              {brand?.pageImages?.campaigns ? (
                <div className="mb-5 w-full max-w-md overflow-hidden rounded-lg">
                  <img src={brand.pageImages.campaigns} alt="" className="h-48 w-full object-cover" />
                </div>
              ) : (
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Megaphone className="h-6 w-6 text-foreground/70" strokeWidth={1.5} />
                </div>
              )}
              <h2 className="text-base font-semibold text-foreground">Build your first campaign</h2>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                The AI will walk you through targeting, budget, and creative — step by step.
              </p>
              <button
                type="button"
                onClick={handleNewCampaign}
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <Sparkles className="h-4 w-4" />
                Get started
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
                        <StrategyRow key={s.id} strategy={s} onOpen={() => handleOpenStrategy(s)} onAction={() => {}} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask about strategy, budgets, or creative next steps..." />
      </div>
    </div>
  );
}
