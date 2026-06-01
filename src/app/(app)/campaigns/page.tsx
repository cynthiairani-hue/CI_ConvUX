"use client";

import { useState, useRef, useEffect } from "react";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useBrand } from "@/data/brand-profiles";
import { cn } from "@/lib/utils";
import { Megaphone, Plus, Clock, Copy, Pencil, Share2, Archive, Trash2, Check, X } from "lucide-react";
import { CardOverflowMenu, type OverflowAction } from "@/components/patterns/card-overflow-menu";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StrategyPlan, StrategyPlanStatus } from "@/types/campaign";

const STATUS_CONFIG: Record<StrategyPlanStatus, { label: string; dot: string; bg: string; text: string }> = {
  draft: { label: "Draft", dot: "bg-muted-foreground/40", bg: "bg-muted", text: "text-muted-foreground" },
  "pending-approval": { label: "Pending", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-600" },
  approved: { label: "Approved", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  paused: { label: "Paused", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-600" },
  archived: { label: "Archived", dot: "bg-muted-foreground/40", bg: "bg-muted", text: "text-muted-foreground" },
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

function StrategyRow({
  strategy, onOpen, onAction, isRenaming, renameValue, onRenameChange, onRenameSubmit, onRenameCancel,
}: {
  strategy: StrategyPlan;
  onOpen: () => void;
  onAction: (actionId: string) => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}) {
  const config = STATUS_CONFIG[strategy.status];
  const objectiveLabel = strategy.objective?.value || "No objective";
  const budget = strategy.budgetSchedule?.data?.monthlyBudget
    ? `$${strategy.budgetSchedule.data.monthlyBudget.toLocaleString()}/mo`
    : strategy.budgetSchedule?.value || "No budget";
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameRef.current) renameRef.current.focus();
  }, [isRenaming]);

  const actions: OverflowAction[] = [
    { id: "duplicate", label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => onAction("duplicate") },
    { id: "rename", label: "Rename", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => onAction("rename") },
    { id: "share", label: "Share", icon: <Share2 className="h-3.5 w-3.5" />, onClick: () => onAction("share") },
    { id: "archive", label: "Archive", icon: <Archive className="h-3.5 w-3.5" />, onClick: () => onAction("archive") },
    { id: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: () => onAction("delete") },
  ];

  return (
    <div
      onClick={isRenaming ? undefined : onOpen}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-border bg-white px-4 py-3.5 text-left transition-all hover:shadow-sm",
        isRenaming ? "ring-1 ring-[#2C9FDD]" : "cursor-pointer"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EBF5FB]">
        <Megaphone className="h-4 w-4 text-[#2C9FDD]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                ref={renameRef}
                type="text"
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameSubmit();
                  if (e.key === "Escape") onRenameCancel();
                }}
                className="min-w-0 flex-1 rounded-md border border-border px-2 py-0.5 text-[13px] font-semibold text-foreground outline-none focus:border-ring"
              />
              <button onClick={onRenameSubmit} className="flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={onRenameCancel} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <span className="truncate text-[13px] font-semibold text-foreground">{strategy.name}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", config.bg, config.text)}>
                {config.label}
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
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
      {!isRenaming && <CardOverflowMenu actions={actions} />}
    </div>
  );
}

const FILTER_OPTIONS: (StrategyPlanStatus | "all")[] = ["all", "draft", "pending-approval", "approved", "active", "paused", "archived"];
const FILTER_LABELS: Record<string, string> = {
  all: "All",
  draft: "Draft",
  "pending-approval": "Pending",
  approved: "Approved",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export default function CampaignsPage() {
  const {
    savedStrategies, savedAdvertisers, setActiveStrategy,
    activeNarrative, setActiveNarrative, showToast,
    duplicateStrategy, renameStrategy, archiveStrategy, removeStrategy,
    hydrated,
  } = useCampaign();
  const { openFullscreen } = useAICompanion();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build advertiser name lookup
  const advNames = new Map(savedAdvertisers.map((a) => [a.id, a.companyName]));

  // Filter by status
  const filtered = statusFilter === "all"
    ? savedStrategies
    : savedStrategies.filter((s) => s.status === statusFilter);

  // Group strategies by advertiser — normalize name to avoid duplicates (e.g. "Ffern" vs "FFERN")
  const grouped = filtered.reduce<Record<string, StrategyPlan[]>>((acc, s) => {
    const raw = advNames.get(s.advertiserId) || s.advertiserId || "Unassigned";
    const key = raw.toUpperCase();
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
    if (activeNarrative) setActiveNarrative(null);
    setActiveStrategy(strategy);
  }

  function handleNewCampaign() {
    openFullscreen("Build me a campaign");
  }

  function handleAction(strategy: StrategyPlan, actionId: string) {
    if (actionId === "share") {
      navigator.clipboard?.writeText(`${window.location.origin}/campaigns?id=${strategy.id}`);
      showToast("Share link copied to clipboard");
    } else if (actionId === "duplicate") {
      duplicateStrategy(strategy.id);
      showToast("Campaign duplicated");
    } else if (actionId === "rename") {
      setRenamingId(strategy.id);
      setRenameValue(strategy.name);
    } else if (actionId === "archive") {
      archiveStrategy(strategy.id);
      showToast("Campaign archived");
    } else if (actionId === "delete") {
      setDeletingId(strategy.id);
    }
  }

  function handleRenameSubmit(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renameStrategy(id, trimmed);
      showToast("Campaign renamed");
    }
    setRenamingId(null);
  }

  const isEmpty = savedStrategies.length === 0;
  const brand = useBrand();

  // Prevent hydration mismatch: server renders with [] strategies, client
  // loads from localStorage. Render only the stable header until hydrated.
  if (!hydrated) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto my-auto w-full max-w-3xl px-4 sm:px-8 py-10">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaigns</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-3xl px-4 sm:px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaigns</h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {isEmpty ? "Your campaigns will live here" : `${savedStrategies.length} campaign${savedStrategies.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {!isEmpty && (
              <button
                type="button"
                onClick={handleNewCampaign}
                className="flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-foreground/90"
              >
                <Plus className="h-4 w-4" />
                New campaign
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          {!isEmpty && (
            <div className="mt-4 flex items-center gap-1 overflow-x-auto">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                    statusFilter === f
                      ? "bg-foreground text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {FILTER_LABELS[f] || f}
                </button>
              ))}
            </div>
          )}

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
                className="mt-5 inline-flex items-center rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Get started
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {groupEntries.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted-foreground">No campaigns match this filter.</p>
              ) : (
                groupEntries.map(([advertiser, strategies]) => (
                  <div key={advertiser}>
                    <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                      {advertiser}
                    </h3>
                    <div className="space-y-2">
                      {strategies
                        .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
                        .map((s) => (
                          <StrategyRow
                            key={s.id}
                            strategy={s}
                            onOpen={() => handleOpenStrategy(s)}
                            onAction={(actionId) => handleAction(s, actionId)}
                            isRenaming={renamingId === s.id}
                            renameValue={renameValue}
                            onRenameChange={setRenameValue}
                            onRenameSubmit={() => handleRenameSubmit(s.id)}
                            onRenameCancel={() => setRenamingId(null)}
                          />
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask about strategy, budgets, or creative next steps..." />
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        title="Delete campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingId) {
            removeStrategy(deletingId);
            showToast("Campaign deleted");
          }
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
