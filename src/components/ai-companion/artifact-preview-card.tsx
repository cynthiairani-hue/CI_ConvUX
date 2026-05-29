"use client";

import { Megaphone, FileText, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";

const STATUS_STYLES: Record<string, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "bg-muted-foreground/40" },
  "pending-approval": { label: "Pending", dot: "bg-amber-400" },
  approved: { label: "Approved", dot: "bg-emerald-500" },
  active: { label: "Active", dot: "bg-emerald-500" },
  paused: { label: "Paused", dot: "bg-amber-400" },
  archived: { label: "Archived", dot: "bg-muted-foreground/40" },
  final: { label: "Final", dot: "bg-emerald-500" },
};

/**
 * Inline card that appears above the chat input when there's an active
 * artifact (strategy or narrative) but the canvas isn't visible.
 * Only shows explicitly active artifacts — not stale saved ones from prior sessions.
 * Only renders in fullscreen or docked mode — in split mode the canvas is already visible.
 */
export function ArtifactPreviewCard() {
  const { activeStrategy, activeNarrative } = useCampaign();
  const { state, setState } = useAICompanion();

  // Hide when the artifact canvas is already visible behind this panel.
  // The canvas renders whenever there's an active artifact, so the preview
  // card is only useful in fullscreen mode (where the overlay hides the canvas).
  if (state !== "fullscreen") return null;

  // Only show explicitly active artifacts — not fallback to last saved
  const artifact = activeNarrative || activeStrategy;
  if (!artifact) return null;

  const isNarrative = !!activeNarrative;
  const name = artifact.name;
  const status = artifact.status;
  const config = STATUS_STYLES[status] || STATUS_STYLES.draft;

  function handleOpenCanvas() {
    setState("split");
  }

  return (
    <button
      type="button"
      onClick={handleOpenCanvas}
      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2.5 text-left transition-all hover:border-border hover:bg-[#F5F7FA]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {isNarrative ? (
          <FileText className="h-3.5 w-3.5 text-foreground" />
        ) : (
          <Megaphone className="h-3.5 w-3.5 text-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dot)} />
          <span className="truncate text-[12px] font-medium text-foreground">{name}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {config.label} · Tap to view on canvas
        </span>
      </div>
      <PanelRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
    </button>
  );
}
