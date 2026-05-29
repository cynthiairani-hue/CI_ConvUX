"use client";

import { useState, useRef, useEffect } from "react";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useBrand } from "@/data/brand-profiles";
import { cn } from "@/lib/utils";
import { Users, Plus, Clock, Copy, Pencil, Share2, Archive, Trash2, Check, X } from "lucide-react";
import { CardOverflowMenu, type OverflowAction } from "@/components/patterns/card-overflow-menu";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AudienceSegment } from "@/types/campaign";

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  draft: { label: "Draft", dot: "bg-muted-foreground/40", bg: "bg-muted", text: "text-muted-foreground" },
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" },
  paused: { label: "Paused", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-600" },
  archived: { label: "Archived", dot: "bg-muted-foreground/40", bg: "bg-muted", text: "text-muted-foreground" },
};

const FILTER_OPTIONS = ["all", "draft", "active", "paused", "archived"] as const;

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

function AudienceRow({
  segment, onOpen, onAction, isRenaming, renameValue, onRenameChange, onRenameSubmit, onRenameCancel,
}: {
  segment: AudienceSegment;
  onOpen: () => void;
  onAction: (actionId: string) => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}) {
  const config = STATUS_CONFIG[segment.status] || STATUS_CONFIG.draft;
  const typeLabel = segment.type ? segment.type.replace("-", " ") : "audience";
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0EDFA]">
        <Users className="h-4 w-4 text-[#7C5CFC]" />
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
              <span className="truncate text-[13px] font-semibold text-foreground">{segment.name}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", config.bg, config.text)}>
                {config.label}
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="capitalize">{typeLabel}</span>
          {segment.estimatedSize && (
            <>
              <span>·</span>
              <span>{segment.estimatedSize}</span>
            </>
          )}
          {segment.platforms && segment.platforms.length > 0 && (
            <>
              <span>·</span>
              <span>{segment.platforms.join(", ")}</span>
            </>
          )}
          {segment.lastModifiedAt && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(segment.lastModifiedAt)}
              </span>
            </>
          )}
        </div>
      </div>
      {!isRenaming && <CardOverflowMenu actions={actions} />}
    </div>
  );
}

export default function AudiencesPage() {
  const {
    savedAudiences, setActiveAudience, activeNarrative, setActiveNarrative, setActiveStrategy, showToast,
    duplicateAudience, renameAudience, archiveAudience, removeAudience,
    hydrated,
  } = useCampaign();
  const { openFullscreen } = useAICompanion();
  const brand = useBrand();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEmpty = savedAudiences.length === 0;

  function handleBuildAudience() {
    openFullscreen("Help me build an audience segment");
  }

  function handleOpenAudience(segment: AudienceSegment) {
    if (activeNarrative) setActiveNarrative(null);
    setActiveStrategy(null);
    setActiveAudience(segment);
  }

  function handleAction(segment: AudienceSegment, actionId: string) {
    if (actionId === "share") {
      navigator.clipboard?.writeText(`${window.location.origin}/audiences?id=${segment.id}`);
      showToast("Share link copied to clipboard");
    } else if (actionId === "duplicate") {
      duplicateAudience(segment.id);
      showToast("Audience duplicated");
    } else if (actionId === "rename") {
      setRenamingId(segment.id);
      setRenameValue(segment.name);
    } else if (actionId === "archive") {
      archiveAudience(segment.id);
      showToast("Audience archived");
    } else if (actionId === "delete") {
      setDeletingId(segment.id);
    }
  }

  function handleRenameSubmit(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renameAudience(id, trimmed);
      showToast("Audience renamed");
    }
    setRenamingId(null);
  }

  const filtered = statusFilter === "all"
    ? savedAudiences
    : savedAudiences.filter((s) => s.status === statusFilter);

  const sorted = [...filtered].sort((a, b) => {
    const aTime = a.lastModifiedAt ? new Date(a.lastModifiedAt).getTime() : 0;
    const bTime = b.lastModifiedAt ? new Date(b.lastModifiedAt).getTime() : 0;
    return bTime - aTime;
  });

  if (!hydrated) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 sm:px-8 py-10">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Audiences</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 sm:px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Audiences</h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {isEmpty ? "Your audience segments will live here" : `${savedAudiences.length} audience${savedAudiences.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {!isEmpty && (
              <button
                type="button"
                onClick={handleBuildAudience}
                className="flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-foreground/90"
              >
                <Plus className="h-4 w-4" />
                New audience
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          {!isEmpty && (
            <div className="mt-4 flex items-center gap-1">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                    statusFilter === f
                      ? "bg-foreground text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {f === "all" ? "All" : STATUS_CONFIG[f]?.label || f}
                </button>
              ))}
            </div>
          )}

          {isEmpty ? (
            <div className="mt-10 flex flex-col items-center rounded-xl bg-white px-8 py-10 text-center">
              {brand?.pageImages?.audiences ? (
                <div className="mb-5 w-full max-w-md overflow-hidden rounded-lg">
                  <img src={brand.pageImages.audiences} alt="" className="h-48 w-full object-cover" />
                </div>
              ) : (
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <Users className="h-6 w-6 text-foreground/70" strokeWidth={1.5} />
                </div>
              )}
              <h2 className="text-base font-semibold text-foreground">Define who you want to reach</h2>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Build audience segments from your customer data, or let the AI suggest high-intent audiences based on your goals.
              </p>
              <button
                type="button"
                onClick={handleBuildAudience}
                className="mt-5 inline-flex items-center rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Build an audience
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {sorted.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted-foreground">No audiences match this filter.</p>
              ) : (
                sorted.map((s) => (
                  <AudienceRow
                    key={s.id}
                    segment={s}
                    onOpen={() => handleOpenAudience(s)}
                    onAction={(actionId) => handleAction(s, actionId)}
                    isRenaming={renamingId === s.id}
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onRenameSubmit={() => handleRenameSubmit(s.id)}
                    onRenameCancel={() => setRenamingId(null)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask about segments, lookalikes, or targeting..." />
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        title="Delete audience"
        description="Are you sure you want to delete this audience? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingId) {
            removeAudience(deletingId);
            showToast("Audience deleted");
          }
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
