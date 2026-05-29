"use client";

import { type ReactNode, useState, useCallback, useRef, useEffect } from "react";
import { Share2, FileDown, Sparkles, Clock, X, Send, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { approvers } from "@/data/approvers";
import { usePersona } from "@/contexts/persona-context";
import { LeftRail } from "./left-rail";
import { MainCanvas } from "./main-canvas";
import { AIFullscreen } from "@/components/ai-companion/ai-fullscreen";
import { AISplitPanel } from "@/components/ai-companion/ai-split-panel";
import { AIFloatingPanel } from "@/components/ai-companion/ai-floating-panel";
import { useAICompanion, type AICompanionState } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { useLayout } from "@/contexts/layout-context";
import { StrategyCard } from "@/components/patterns/strategy-card";
import type { StrategyPlan } from "@/types/campaign";
import { CFONarrativeCard } from "@/components/patterns/cfo-narrative-card";
import { AudienceCard } from "@/components/patterns/audience-card";
import { getCurrentBrand } from "@/data/brand-profiles";
import { FFERN_SEED_PERFORMANCE } from "@/data/seed-ffern";
import { Toast } from "@/components/ui/toast-notification";

const MIN_CHAT_WIDTH = 320;
const MAX_CHAT_WIDTH = 640;
const DEFAULT_CHAT_WIDTH = 420;

/** Status badge for artifact status */
function StatusBadge({ status }: { status: string }) {
  const label = status === "draft" ? "Draft" : status === "approved" ? "Approved" : status === "active" ? "Active" : status === "final" ? "Final" : status;
  const color = status === "draft" ? "bg-muted text-muted-foreground"
    : status === "approved" || status === "active" || status === "final" ? "bg-emerald-50 text-emerald-600"
    : status === "pending-approval" ? "bg-amber-50 text-amber-600"
    : "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize", color)}>
      {label}
    </span>
  );
}

/** Approver picker → sends the strategy for approval. Only shown for drafts. */
function SendForApprovalButton({ onSend }: { onSend: (approverId: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
      >
        <Send className="h-3.5 w-3.5" />
        Send for Approval
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-[0px_4px_12px_rgba(71,88,114,0.15)]">
          <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Send to
          </div>
          {approvers.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onSend(a.id);
                setOpen(false);
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <span className="text-[13px] font-medium text-foreground">{a.name}</span>
              <span className="text-[11px] text-muted-foreground">{a.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableName({
  value,
  onSave,
}: {
  value: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="truncate rounded border border-[#2C9FDD] bg-white px-1.5 py-0.5 text-[14px] font-semibold text-foreground outline-none"
        style={{ width: `${Math.max(draft.length, 10)}ch` }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-accent"
      title="Click to rename"
    >
      <h1 className="truncate text-[14px] font-semibold text-foreground">{value}</h1>
      <span className="text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
      </span>
    </button>
  );
}

function ReturnVisitBanner({ strategy, onDismiss }: { strategy: StrategyPlan; onDismiss: () => void }) {
  const lastMod = strategy.lastModifiedAt;
  const now = Date.now();
  const diffMs = now - new Date(lastMod).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  // Only show if last modified > 5 minutes ago (real return visit)
  if (diffMins < 5) return null;

  const timeAgo =
    diffMins < 60 ? `${diffMins}m ago` :
    diffMins < 1440 ? `${Math.floor(diffMins / 60)}h ago` :
    `${Math.floor(diffMins / 1440)}d ago`;

  // Count sections that need review
  const sectionKeys = ["objective", "budgetSchedule", "audience", "placements", "bidding", "creative", "forecast"] as const;
  const needsReview = sectionKeys.filter((k) => !strategy[k].filled).length;
  const readySections = sectionKeys.filter((k) => strategy[k].readiness === "ready").length;

  return (
    <div className="mx-auto mb-4 flex max-w-2xl items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF5FB]">
        <Clock className="h-4 w-4 text-[#1A7BB5]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">
          Welcome back to {strategy.name}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Last edited {timeAgo} · {readySections}/{sectionKeys.length} sections ready
          {needsReview > 0 && ` · ${needsReview} need${needsReview === 1 ? "s" : ""} review`}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SplitStrategyCanvas({ strategy }: { strategy: NonNullable<ReturnType<typeof useCampaign>["activeStrategy"]> }) {
  const { saveStrategy, setActiveStrategy, showToast, sendForApproval } = useCampaign();
  const { setState } = useAICompanion();
  const { activePersona } = usePersona();
  const [showReturnBanner, setShowReturnBanner] = useState(true);

  function handleSendForApproval(approverId: string) {
    // Ensure the strategy is persisted before it enters the approval queue.
    const saved = { ...strategy, lastModifiedAt: new Date().toISOString() };
    saveStrategy(saved);
    sendForApproval(saved.id, approverId, activePersona.id);
  }

  function handleSave() {
    saveStrategy({ ...strategy, lastModifiedAt: new Date().toISOString() });
    showToast("Strategy saved", { label: "View in Campaigns", href: "/campaigns" });
  }

  function handleDiscard() {
    saveStrategy({ ...strategy, status: "draft", lastModifiedAt: new Date().toISOString() });
    setActiveStrategy(null);
    setState("fullscreen");
    showToast("Strategy saved as draft", { label: "View in Campaigns", href: "/campaigns" });
  }

  function handleShare() {
    showToast("Share link copied to clipboard");
  }

  function handleStrategyUpdate(updated: typeof strategy) {
    setActiveStrategy(updated);
    saveStrategy(updated);
  }

  function handleRename(name: string) {
    const updated = { ...strategy, name, lastModifiedAt: new Date().toISOString() };
    setActiveStrategy(updated);
    saveStrategy(updated);
    showToast("Campaign renamed");
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Page-level header — actions live here, not in the card */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
        <div className="min-w-0">
          <EditableName value={strategy.name} onSave={handleRename} />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={strategy.status} />
          {strategy.status === "draft" && (
            <SendForApprovalButton onSend={handleSendForApproval} />
          )}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <div className="mx-0.5 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90"
          >
            Save
          </button>
        </div>
      </header>
      {/* Grey canvas background — card floats on it */}
      <div className="flex-1 overflow-y-auto bg-accent px-8 py-8">
        {showReturnBanner && (
          <ReturnVisitBanner strategy={strategy} onDismiss={() => setShowReturnBanner(false)} />
        )}
        <div className="mx-auto max-w-2xl">
          <StrategyCard plan={strategy} onUpdate={handleStrategyUpdate} />
        </div>
      </div>
    </main>
  );
}

function SplitNarrativeCanvas({ narrative }: { narrative: NonNullable<ReturnType<typeof useCampaign>["activeNarrative"]> }) {
  const { saveNarrative, setActiveNarrative, showToast } = useCampaign();
  const { setState: setAIState } = useAICompanion();
  const brand = getCurrentBrand();

  function handleShare() {
    showToast("Share link copied to clipboard");
  }

  function handleExportPDF() {
    // Open a print-friendly window with the narrative content
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const monthLabel = monthNames[narrative.period.month - 1];
    const sectionKeys = ["spendByChannel","attributionByChannel","whatChanged","recommendedNextMoves","confidenceSummary"] as const;
    const sections = sectionKeys.map((key) => ({ label: narrative[key].label, value: narrative[key].value }));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${narrative.name}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#394859;line-height:1.6}h1{font-size:20px;font-weight:600;margin-bottom:4px}.subtitle{font-size:13px;color:#8492A6;margin-bottom:32px}h2{font-size:14px;font-weight:600;margin-top:24px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #EDF1F5}.section-content{font-size:13px;white-space:pre-wrap;margin-bottom:16px}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #EDF1F5;font-size:11px;color:#8492A6}@media print{body{margin:20px}}</style></head><body><h1>${narrative.name}</h1><div class="subtitle">${narrative.advertiserId} · ${monthLabel} ${narrative.period.year}</div>${sections.map((s) => `<h2>${s.label}</h2><div class="section-content">${s.value}</div>`).join("")}<div class="footer">Generated by FuseIQ · ${new Date().toLocaleDateString()}</div></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); }
  }

  function handleDiscard() {
    saveNarrative({ ...narrative, lastModifiedAt: new Date().toISOString() });
    setActiveNarrative(null);
    setAIState("fullscreen");
    showToast("Report saved as draft", { label: "View in Reports", href: "/reports" });
  }

  function handleSendToCFO() {
    const updated = { ...narrative, status: "final" as const, lastModifiedAt: new Date().toISOString() };
    saveNarrative(updated);
    setActiveNarrative(updated);
    showToast("Narrative finalized and sent");
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Page-level header — actions live here, not in the card */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold text-foreground">{narrative.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={narrative.status} />
          {/* Secondary actions */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          {/* Separator + destructive/primary actions */}
          <div className="mx-0.5 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Discard
          </button>
          {narrative.status === "draft" && (
            <button
              type="button"
              onClick={handleSendToCFO}
              className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90"
            >
              Send to CFO
            </button>
          )}
        </div>
      </header>
      {/* Grey canvas background — card floats on it */}
      <div className="flex-1 overflow-y-auto bg-accent px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <CFONarrativeCard narrative={narrative} seedData={brand ? FFERN_SEED_PERFORMANCE : undefined} hideHeaderActions />
        </div>
      </div>
    </main>
  );
}

/** Draggable divider between chat and canvas */
function ResizeDivider({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDrag(delta);
    },
    [onDrag]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center"
      onMouseDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        lastX.current = e.clientX;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
    >
      {/* Hover / active indicator */}
      <div className="absolute inset-y-0 -left-0.5 w-1.5 transition-colors group-hover:bg-[#2C9FDD]/30 group-active:bg-[#2C9FDD]/50" />
    </div>
  );
}

function SplitAudienceCanvas({ segment }: { segment: NonNullable<ReturnType<typeof useCampaign>["activeAudience"]> }) {
  const { setActiveAudience, saveAudience, showToast } = useCampaign();
  const { setState: setAIState } = useAICompanion();

  function handleUpdate(updated: typeof segment) {
    setActiveAudience(updated);
  }

  function handleRename(name: string) {
    const updated = { ...segment, name, lastModifiedAt: new Date().toISOString() };
    setActiveAudience(updated);
    saveAudience(updated);
    showToast("Audience renamed");
  }

  function handleDiscard() {
    saveAudience({ ...segment, lastModifiedAt: new Date().toISOString() });
    setActiveAudience(null);
    setAIState("fullscreen");
    showToast("Audience saved as draft", { label: "View in Audiences", href: "/audiences" });
  }

  function handleSave() {
    const updated = { ...segment, lastModifiedAt: new Date().toISOString() };
    saveAudience(updated);
    setActiveAudience(updated);
    showToast("Audience saved", { label: "View in Audiences", href: "/audiences" });
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
        <div className="min-w-0">
          <EditableName value={segment.name} onSave={handleRename} />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={segment.status} />
          <div className="mx-0.5 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90"
          >
            Save
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto bg-accent px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <AudienceCard segment={segment} onUpdate={handleUpdate} />
        </div>
      </div>
    </main>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dockSide, setState } = useAICompanion();
  const { activeStrategy, savedStrategies, activeNarrative, activeAudience } = useCampaign();
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);

  const strategy = activeStrategy || savedStrategies[savedStrategies.length - 1];
  const hasArtifact = !!(activeStrategy || activeNarrative || activeAudience);
  const { collapseLeftRail } = useLayout();
  // Track whether the user manually closed the AI panel this session
  const userClosedRef = useRef(false);
  // Track previous hasArtifact to detect transitions (false → true)
  const prevHasArtifactRef = useRef(hasArtifact);
  // Track previous state to detect user-initiated close (visible → resting)
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== "resting" && state === "resting" && hasArtifact) {
      userClosedRef.current = true;
    }
    prevStateRef.current = state;
  }, [state, hasArtifact]);
  // Reset the userClosed flag when artifact is cleared (navigating away)
  useEffect(() => {
    if (!hasArtifact) userClosedRef.current = false;
  }, [hasArtifact]);

  // Rule: collapse left rail when an artifact is open OR when split panel is active
  useEffect(() => {
    if (hasArtifact || state === "split") collapseLeftRail();
  }, [hasArtifact, state, collapseLeftRail]);

  // Rule: auto-open AI panel when an artifact opens (first time only, unless user closed it)
  useEffect(() => {
    const wasOpen = prevHasArtifactRef.current;
    prevHasArtifactRef.current = hasArtifact;

    // Only trigger on transition from no-artifact → has-artifact
    if (!hasArtifact || wasOpen) return;
    // Don't auto-open if user explicitly closed this session
    if (userClosedRef.current) return;
    // Don't auto-open if AI is already showing
    if (state !== "resting") return;

    // Check user's preferred layout from localStorage
    const preferred = typeof window !== "undefined"
      ? localStorage.getItem("fuseiq-layout-state") as AICompanionState | null
      : null;

    if (preferred === "floating") {
      setState("floating");
    } else {
      // Default to split panel for first-time users or those who prefer split
      setState("split");
    }
  }, [hasArtifact, state, setState]);

  const handleDrag = useCallback((deltaX: number) => {
    setChatWidth((prev) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, prev + deltaX)));
  }, []);

  const handleDragRight = useCallback((deltaX: number) => {
    setChatWidth((prev) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, prev - deltaX)));
  }, []);

  const renderSplitCanvas = () => {
    if (activeAudience) {
      return <SplitAudienceCanvas segment={activeAudience} />;
    }
    if (activeNarrative) {
      return <SplitNarrativeCanvas narrative={activeNarrative} />;
    }
    if (strategy) {
      return <SplitStrategyCanvas strategy={strategy} />;
    }
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">No artifact to display</p>
      </main>
    );
  };

  const showSplitChat = state === "split";

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <LeftRail />
        {showSplitChat && dockSide === "left" && (
          <>
            <AISplitPanel width={chatWidth} side="left" />
            <ResizeDivider onDrag={handleDrag} />
          </>
        )}
        {hasArtifact ? (
          renderSplitCanvas()
        ) : (
          <MainCanvas>{children}</MainCanvas>
        )}
        {showSplitChat && dockSide === "right" && (
          <>
            <ResizeDivider onDrag={handleDragRight} />
            <AISplitPanel width={chatWidth} side="right" />
          </>
        )}
      </div>
      {state === "fullscreen" && <AIFullscreen />}
      {state === "floating" && <AIFloatingPanel />}

      {/* Chat bubble — visible when artifact is open and chat isn't showing in any panel */}
      {(() => {
        const chatVisible =
          state === "fullscreen" ||
          state === "floating" ||
          state === "split";
        const showBubble = hasArtifact && !chatVisible;
        if (!showBubble) return null;
        return (
          <button
            type="button"
            onClick={() => setState("floating")}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:bg-foreground/90 hover:scale-105 active:scale-95"
            title="Open chat"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        );
      })()}

      <Toast />
    </>
  );
}
