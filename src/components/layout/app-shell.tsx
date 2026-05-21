"use client";

import { type ReactNode, useState, useCallback, useRef, useEffect } from "react";
import { Share2, FileDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeftRail } from "./left-rail";
import { MainCanvas } from "./main-canvas";
import { AIDockedPanel } from "@/components/ai-companion/ai-docked-panel";
import { AIFullscreen } from "@/components/ai-companion/ai-fullscreen";
import { AISplitPanel } from "@/components/ai-companion/ai-split-panel";
import { AIFloatingPanel } from "@/components/ai-companion/ai-floating-panel";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { StrategyCard } from "@/components/patterns/strategy-card";
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
  const color = status === "draft" ? "bg-[#F3F4F6] text-[#6B7280]"
    : status === "approved" || status === "active" || status === "final" ? "bg-emerald-50 text-emerald-600"
    : status === "pending-approval" ? "bg-amber-50 text-amber-600"
    : "bg-[#F3F4F6] text-[#6B7280]";
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize", color)}>
      {label}
    </span>
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
        className="truncate rounded border border-[#2C9FDD] bg-white px-1.5 py-0.5 text-[14px] font-semibold text-[#394859] outline-none"
        style={{ width: `${Math.max(draft.length, 10)}ch` }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-[#F7F9FB]"
      title="Click to rename"
    >
      <h1 className="truncate text-[14px] font-semibold text-[#394859]">{value}</h1>
      <span className="text-[#C4CDD8] opacity-0 transition-opacity group-hover:opacity-100">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
      </span>
    </button>
  );
}

function SplitStrategyCanvas({ strategy }: { strategy: NonNullable<ReturnType<typeof useCampaign>["activeStrategy"]> }) {
  const { saveStrategy, setActiveStrategy, showToast } = useCampaign();
  const { setState } = useAICompanion();

  function handleSave() {
    saveStrategy({ ...strategy, status: "draft", lastModifiedAt: new Date().toISOString() });
    showToast("Strategy saved", { label: "View in Campaigns", href: "/campaigns" });
  }

  function handleDiscard() {
    setActiveStrategy(null);
    setState("fullscreen");
    showToast("Changes discarded");
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
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-[#E0E8F2] px-3 py-1.5 text-[12px] font-medium text-[#394859] transition-colors hover:bg-[#F7F9FB]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <div className="mx-0.5 h-5 w-px bg-[#E0E8F2]" />
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#8492A6] transition-colors hover:bg-[#F7F9FB] hover:text-[#394859]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[#394859] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2D3A47]"
          >
            Save
          </button>
        </div>
      </header>
      {/* Grey canvas background — card floats on it */}
      <div className="flex-1 overflow-y-auto bg-[#F7F9FB] px-8 py-8">
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
    setActiveNarrative(null);
    setAIState("fullscreen");
    showToast("Changes discarded");
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
          <h1 className="truncate text-[14px] font-semibold text-[#394859]">{narrative.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={narrative.status} />
          {/* Secondary actions */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-[#E0E8F2] px-3 py-1.5 text-[12px] font-medium text-[#394859] transition-colors hover:bg-[#F7F9FB]"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-[#E0E8F2] px-3 py-1.5 text-[12px] font-medium text-[#394859] transition-colors hover:bg-[#F7F9FB]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          {/* Separator + destructive/primary actions */}
          <div className="mx-0.5 h-5 w-px bg-[#E0E8F2]" />
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#8492A6] transition-colors hover:bg-[#F7F9FB] hover:text-[#394859]"
          >
            Discard
          </button>
          {narrative.status === "draft" && (
            <button
              type="button"
              onClick={handleSendToCFO}
              className="flex items-center gap-1.5 rounded-lg bg-[#394859] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2D3A47]"
            >
              Send to CFO
            </button>
          )}
        </div>
      </header>
      {/* Grey canvas background — card floats on it */}
      <div className="flex-1 overflow-y-auto bg-[#F7F9FB] px-8 py-8">
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
    setActiveAudience(null);
    setAIState("fullscreen");
    showToast("Changes discarded");
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
          <div className="mx-0.5 h-5 w-px bg-[#E0E8F2]" />
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#8492A6] transition-colors hover:bg-[#F7F9FB] hover:text-[#394859]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[#394859] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2D3A47]"
          >
            Save
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto bg-[#F7F9FB] px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <AudienceCard segment={segment} onUpdate={handleUpdate} />
        </div>
      </div>
    </main>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dockSide } = useAICompanion();
  const { activeStrategy, savedStrategies, activeNarrative, activeAudience } = useCampaign();
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [dockedWidth, setDockedWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [chatMinimized, setChatMinimized] = useState(false);

  const strategy = activeStrategy || savedStrategies[savedStrategies.length - 1];

  // Reset minimized state when leaving split view
  useEffect(() => {
    if (state !== "split") setChatMinimized(false);
  }, [state]);

  const handleDrag = useCallback((deltaX: number) => {
    setChatWidth((prev) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, prev + deltaX)));
  }, []);

  const handleDockedDragRight = useCallback((deltaX: number) => {
    setDockedWidth((prev) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, prev - deltaX)));
  }, []);

  const handleDockedDragLeft = useCallback((deltaX: number) => {
    setDockedWidth((prev) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, prev + deltaX)));
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

  const showSplitChat = state === "split" && !chatMinimized;

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <LeftRail />
        {showSplitChat && (
          <>
            <AISplitPanel width={chatWidth} onMinimize={() => setChatMinimized(true)} />
            <ResizeDivider onDrag={handleDrag} />
          </>
        )}
        {state === "docked" && dockSide === "left" && (
          <>
            <AIDockedPanel side="left" width={dockedWidth} />
            <ResizeDivider onDrag={handleDockedDragLeft} />
          </>
        )}
        {state === "split" ? (
          renderSplitCanvas()
        ) : (
          <MainCanvas>{children}</MainCanvas>
        )}
        {state === "docked" && dockSide === "right" && (
          <>
            <ResizeDivider onDrag={handleDockedDragRight} />
            <AIDockedPanel side="right" width={dockedWidth} />
          </>
        )}
      </div>
      {state === "fullscreen" && <AIFullscreen />}
      {state === "floating" && <AIFloatingPanel />}

      {/* Floating chat bubble when minimized in split view */}
      {state === "split" && chatMinimized && (
        <button
          type="button"
          onClick={() => setChatMinimized(false)}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#2C9FDD] text-white shadow-lg transition-all hover:bg-[#1A7BB5] hover:scale-105 active:scale-95"
          title="Open chat"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      <Toast />
    </>
  );
}
