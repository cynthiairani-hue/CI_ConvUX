"use client";

import { type ReactNode, useState, useCallback, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Share2, FileDown, Sparkles, Clock, X, Send, ChevronDown, CheckCircle2, Zap, MessageSquare, Eye, Link2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { approvers } from "@/data/approvers";
import { usePersona } from "@/contexts/persona-context";
import { LeftRail } from "./left-rail";
import { MainCanvas } from "./main-canvas";
import { AIFullscreen } from "@/components/ai-companion/ai-fullscreen";
import { AISplitPanel } from "@/components/ai-companion/ai-split-panel";
import { AIFloatingPanel } from "@/components/ai-companion/ai-floating-panel";
import { useAICompanion, type AICompanionState, ENTRY_LAYOUT_KEY } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { useLayout } from "@/contexts/layout-context";
import { StrategyCard } from "@/components/patterns/strategy-card";
import type { StrategyPlan } from "@/types/campaign";
import { CFONarrativeCard } from "@/components/patterns/cfo-narrative-card";
import { CompetitiveBriefCard } from "@/components/patterns/competitive-brief-card";
import { OperatorAuthorizationCard } from "@/components/patterns/operator-authorization-card";
import { MediaPlanComments } from "@/components/patterns/comment-thread";
import { CardOverflowMenu, type OverflowAction } from "@/components/patterns/card-overflow-menu";
import { MediaPlanCard } from "@/components/patterns/media-plan-card";
import { AudienceCard } from "@/components/patterns/audience-card";
import { getCurrentBrand } from "@/data/brand-profiles";
import { FFERN_SEED_PERFORMANCE } from "@/data/seed-ffern";
import { Toast } from "@/components/ui/toast-notification";
import { FeedbackButton } from "./feedback-dialog";

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
    // Closing the artifact clears it only — it must NOT change the chat's layout
    // (Interaction Rule 1). Whatever mode the user was in, they stay in.
    saveStrategy({ ...strategy, status: "draft", lastModifiedAt: new Date().toISOString() });
    setActiveStrategy(null);
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
          {/* "Run with AI" (Operator) hidden — half-baked flow, see BACKLOG. */}
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
      <div className="flex flex-1 flex-col overflow-y-auto bg-accent px-8 py-8">
        {showReturnBanner && (
          <ReturnVisitBanner strategy={strategy} onDismiss={() => setShowReturnBanner(false)} />
        )}
        <div className="mx-auto my-auto w-full max-w-2xl">
          <StrategyCard plan={strategy} onUpdate={handleStrategyUpdate} />
        </div>
      </div>
    </main>
  );
}

function SplitNarrativeCanvas({ narrative }: { narrative: NonNullable<ReturnType<typeof useCampaign>["activeNarrative"]> }) {
  const { saveNarrative, setActiveNarrative, showToast } = useCampaign();
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
    // Clear the artifact only — leave the chat layout as the user set it (Rule 1).
    saveNarrative({ ...narrative, lastModifiedAt: new Date().toISOString() });
    setActiveNarrative(null);
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
      <div className="flex flex-1 flex-col overflow-y-auto bg-accent px-8 py-8">
        <div className="mx-auto my-auto w-full max-w-2xl">
          <CFONarrativeCard narrative={narrative} seedData={brand?.domain === "ffern.co" ? FFERN_SEED_PERFORMANCE : undefined} hideHeaderActions />
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

const MP_REVIEW_STYLE: Record<string, { label: string; tint: string }> = {
  draft: { label: "Draft", tint: "bg-muted text-muted-foreground" },
  "pending-approval": { label: "Pending approval", tint: "bg-amber-50 text-amber-600" },
  approved: { label: "Approved", tint: "bg-emerald-50 text-emerald-600" },
  active: { label: "Active", tint: "bg-emerald-50 text-emerald-600" },
};

// Comment drop-tool cursor: the same teardrop pin as the canvas markers, drawn
// white (empty) since no message exists yet. Hotspot at the bottom-left tail.
const COMMENT_CURSOR =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='-2 -2 28 28'%3E%3Cpath fill='white' stroke='%237C5CFC' stroke-width='2' d='M12 0 A12 12 0 0 1 24 12 A12 12 0 0 1 12 24 L0 24 L0 12 A12 12 0 0 1 12 0 Z'/%3E%3C/svg%3E") 1 19, auto`;

function SplitMediaPlanCanvas({ plan }: { plan: NonNullable<ReturnType<typeof useCampaign>["activeMediaPlan"]> }) {
  const { setActiveMediaPlan, saveMediaPlan, showToast, addMediaPlanComment, resolveMediaPlanComment, shareMediaPlanWithClient, setClientApproval } = useCampaign();
  const router = useRouter();
  const { activePersona } = usePersona();
  const isClient = activePersona.role === "client";

  const [commentsOpen, setCommentsOpen] = useState(false);
  // Pin-drop is an explicit, armed sub-mode of the comments panel. Default OFF so
  // opening Comments to READ never turns canvas edits into stray pins (3.3).
  const [pinMode, setPinMode] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [draftPin, setDraftPin] = useState<{ xPct: number; yPct: number } | null>(null);
  const [draftText, setDraftText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [previewAsClient, setPreviewAsClient] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isClientView = isClient || previewAsClient;
  const authorRole: "agency" | "client" = isClientView ? "client" : "agency";
  const unresolved = (plan.comments ?? []).filter((c) => !c.resolved).length;
  // Client sign-off (separate from the internal agency review gate).
  const clientName = isClient ? activePersona.name : "Jordan Reyes";
  const clientApproverId: typeof activePersona.id = isClient ? activePersona.id : "jordan-reyes";
  const signoff = plan.clientApproval;

  function clientApprove() {
    setClientApproval(plan.id, { state: "approved", byName: clientName });
    addMediaPlanComment(plan.id, { authorId: clientApproverId, authorRole: "client", content: "Approved this plan. ✅" });
    showToast("Plan approved — your agency has been notified");
  }
  function clientUndoApproval() {
    // Reconcile the thread: clearing only the badge left a stale "Approved ✅"
    // comment, so the agency saw a contradictory record. Post a withdrawal note too.
    setClientApproval(plan.id, null);
    addMediaPlanComment(plan.id, { authorId: clientApproverId, authorRole: "client", content: "Withdrew my approval — taking another look." });
    showToast("Approval withdrawn — your agency has been notified");
  }
  function clientRequestChanges(note: string) {
    setClientApproval(plan.id, { state: "changes-requested", byName: clientName, note });
    addMediaPlanComment(plan.id, { authorId: clientApproverId, authorRole: "client", content: `Requested changes: ${note}` });
    setChangesOpen(false);
    showToast("Sent back to your agency with your notes");
  }

  // Keep the active plan and the persisted list in sync on every change.
  const commit = (updated: typeof plan) => { setActiveMediaPlan(updated); saveMediaPlan(updated); };

  // Build → Approve → Activate, explicit and visible (review scales with impact).
  function sendForApproval() {
    commit({ ...plan, reviewState: "pending-approval", lastModifiedAt: new Date().toISOString() });
    showToast("Sent to Marcus Patel for approval — Slack notification fired");
  }
  function approve() {
    commit({ ...plan, reviewState: "approved", lastModifiedAt: new Date().toISOString() });
    showToast("Media plan approved — ready to activate");
  }
  function activate() {
    commit({ ...plan, reviewState: "active", checkInDays: 45, lastModifiedAt: new Date().toISOString() });
    showToast(`${plan.campaigns.filter((c) => c.enabled).length} campaigns created in AdRoll · check-in set for +45 days`);
    // The activation drop: launching lands you on the canvas — mission control
    // for what just went live. The canvas captures the still-active plan into a
    // frame (with its Live status) via its normal capture path.
    router.push("/canvas");
  }

  // Figma/Miro comment tool: in comment mode the cursor is a comment icon and a
  // click anywhere on the canvas drops a pin at that spot (stored as % of the box).
  const pinnedTops = (plan.comments ?? []).filter((c) => !c.parentId && c.pin);
  function dropPin(e: React.MouseEvent) {
    const box = canvasRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    setDraftPin({ xPct, yPct });
    setDraftText("");
  }
  function submitDraft() {
    const t = draftText.trim();
    if (!t || !draftPin) return;
    addMediaPlanComment(plan.id, { authorId: activePersona.id, authorRole, content: t, pin: draftPin });
    setDraftPin(null);
    setDraftText("");
    // Disarm after one pin so the card becomes editable again — never trap the
    // user in pin-drop mode (3.3). They re-arm via "Add comment" for the next pin.
    setPinMode(false);
  }
  function cancelDraft() {
    setDraftPin(null);
    setDraftText("");
    setPinMode(false);
  }
  // Esc disarms pin-drop mode (when not mid-compose) so editing resumes.
  useEffect(() => {
    if (!pinMode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !draftPin) setPinMode(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinMode, draftPin]);

  // Share is the primary CTA; everything else (Comments, Export, Preview) lives
  // in the overflow so the bar stays calm.
  const headerActions: OverflowAction[] = [
    { id: "comments", label: `Comments${unresolved > 0 ? ` (${unresolved})` : ""}`, icon: <MessageSquare className="h-3.5 w-3.5" />, onClick: () => setCommentsOpen(true) },
    { id: "export", label: "Export PDF", icon: <FileDown className="h-3.5 w-3.5" />, onClick: () => showToast("Plan exported to PDF") },
    ...(plan.sharedWithClient ? [{ id: "preview", label: "Preview as client", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => setPreviewAsClient(true) }] : []),
  ];

  const review = MP_REVIEW_STYLE[plan.reviewState] ?? MP_REVIEW_STYLE.draft;

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {previewAsClient && (
        <div className="flex h-9 shrink-0 items-center justify-center gap-3 border-b border-[#7C5CFC]/30 bg-[#F3F0FF] text-[12px] text-[#7C5CFC]">
          <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Previewing as Jordan Reyes — read-only</span>
          <button onClick={() => setPreviewAsClient(false)} className="font-medium underline underline-offset-2">Exit preview</button>
        </div>
      )}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="truncate text-[14px] font-semibold text-foreground">{plan.name}</h1>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", review.tint)}>
            {review.label}
          </span>
          {plan.sharedWithClient && !isClientView && !signoff && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
              <Check className="h-3 w-3" /> Shared
            </span>
          )}
          {!isClientView && signoff?.state === "approved" && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Client approved
            </span>
          )}
          {!isClientView && signoff?.state === "changes-requested" && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
              <AlertCircle className="h-3 w-3" /> Client: changes requested
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Client keeps Comments as a visible button (their main collaboration tool) */}
          {isClientView && (
            <button
              type="button"
              onClick={() => { setCommentsOpen((v) => !v); }}
              className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors", commentsOpen ? "border-[#7C5CFC] bg-[#F3F0FF] text-[#7C5CFC]" : "border-border text-foreground hover:bg-accent")}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Comments{unresolved > 0 ? ` (${unresolved})` : ""}
            </button>
          )}

          {!isClientView && (
            <>
              {/* Primary CTA — get the plan in front of the client */}
              <button type="button" onClick={() => setShareOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90">
                <Share2 className="h-3.5 w-3.5" /> Share with client
              </button>

              {/* Lifecycle gate — kept visible (secondary) so Approve/Activate isn't buried */}
              {plan.reviewState === "draft" && (
                <button type="button" onClick={sendForApproval} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent">
                  <Send className="h-3.5 w-3.5" /> Send for approval
                </button>
              )}
              {plan.reviewState === "pending-approval" && (
                <button type="button" onClick={approve} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
              )}
              {plan.reviewState === "approved" && (
                <button type="button" onClick={activate} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent">
                  <Zap className="h-3.5 w-3.5" /> Activate
                </button>
              )}

              {/* Comments, Export, Preview — overflow, with an unread dot so comments aren't hidden */}
              <span className="relative">
                <CardOverflowMenu actions={headerActions} />
                {unresolved > 0 && <span className="pointer-events-none absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[#7C5CFC] ring-2 ring-white" />}
              </span>
            </>
          )}

          {/* Client sign-off — separate from the internal agency gate */}
          {isClientView && (
            signoff?.state === "approved" ? (
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[12px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> You approved this plan
                <button type="button" onClick={clientUndoApproval} className="ml-1 text-[11px] font-medium text-emerald-700 underline underline-offset-2">Undo</button>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setChangesOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <AlertCircle className="h-3.5 w-3.5" /> Request changes
                </button>
                <button
                  type="button"
                  onClick={clientApprove}
                  className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve plan
                </button>
              </>
            )
          )}

          <div className="mx-0.5 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => setActiveMediaPlan(null)}
            title="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto bg-accent px-8 py-8">
          <div ref={canvasRef} className="relative mx-auto w-full max-w-6xl">
            <MediaPlanCard
              plan={plan}
              onChange={(updated) => commit(updated)}
              readOnly={isClientView}
            />

            {/* Comment-drop capture layer — ONLY when pin-drop is explicitly armed
                (and not mid-compose). When the panel is open just to READ comments,
                no overlay sits over the card, so every edit control stays clickable. */}
            {commentsOpen && pinMode && !draftPin && (
              <div className="absolute inset-0 z-30" style={{ cursor: COMMENT_CURSOR }} onClick={dropPin} />
            )}

            {/* Armed-mode cue (Figma/Miro-style) so it's obvious why clicks drop pins. */}
            {commentsOpen && pinMode && !draftPin && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center">
                <span className="rounded-full bg-[#7C5CFC] px-3 py-1 text-[11px] font-medium text-white shadow-md">
                  Click anywhere on the plan to drop a comment · Esc to cancel
                </span>
              </div>
            )}

            {/* Comment pins (Figma/Miro) — positioned as % of the canvas box.
                One shape everywhere: blue teardrop with a number when it has a
                message, white teardrop when empty (the draft). */}
            <div className="pointer-events-none absolute inset-0 z-40">
              {pinnedTops.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setActiveCommentId(c.id); setCommentsOpen(true); }}
                  style={{ left: `${c.pin!.xPct}%`, top: `${c.pin!.yPct}%` }}
                  className={cn(
                    "pointer-events-auto absolute flex h-6 w-6 -translate-x-1 -translate-y-full items-center justify-center rounded-full rounded-bl-none text-[10px] font-bold shadow-md ring-2 ring-white transition-transform hover:scale-110",
                    c.resolved ? "bg-muted text-muted-foreground" : activeCommentId === c.id ? "bg-[#5B3FD6] text-white" : "bg-[#7C5CFC] text-white"
                  )}
                  title={c.content}
                >
                  {i + 1}
                </button>
              ))}

              {/* Draft pin + composer popover (white = empty, no message yet) */}
              {draftPin && (
                <div style={{ left: `${draftPin.xPct}%`, top: `${draftPin.yPct}%` }} className="pointer-events-auto absolute">
                  <span className="absolute -translate-x-1 -translate-y-full flex h-6 w-6 items-center justify-center rounded-full rounded-bl-none border-2 border-[#7C5CFC] bg-white shadow-md" />
                  <div className="absolute left-2 top-1 w-64 rounded-xl border border-border bg-white p-2.5 shadow-xl">
                    <textarea
                      autoFocus
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitDraft(); } if (e.key === "Escape") { cancelDraft(); } }}
                      placeholder="Add a comment…"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border px-2.5 py-1.5 text-[13px] outline-none focus:border-[#7C5CFC]"
                    />
                    <div className="mt-1.5 flex items-center justify-end gap-2">
                      <button onClick={cancelDraft} className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                      <button onClick={submitDraft} disabled={!draftText.trim()} className="flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-white hover:bg-foreground/90 disabled:opacity-40">
                        <Send className="h-3 w-3" /> Comment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {commentsOpen && (
          <MediaPlanComments
            plan={plan}
            activeCommentId={activeCommentId}
            pinMode={pinMode}
            onTogglePin={() => setPinMode((v) => !v)}
            onFocusComment={setActiveCommentId}
            onReply={(parentId, content) => addMediaPlanComment(plan.id, { authorId: activePersona.id, authorRole, content, parentId })}
            onResolve={(commentId, resolved) => resolveMediaPlanComment(plan.id, commentId, resolved)}
            onClose={() => { setCommentsOpen(false); setDraftPin(null); setPinMode(false); }}
          />
        )}
      </div>

      {shareOpen && (
        <ShareWithClientDialog
          shared={!!plan.sharedWithClient}
          onCopyLink={() => { navigator.clipboard?.writeText(`https://app.fuseiq.example/p/${plan.id}`); showToast("Share link copied to clipboard"); }}
          onShare={() => { shareMediaPlanWithClient(plan.id, "jordan-reyes"); setShareOpen(false); showToast("Shared with Jordan Reyes — they can view & comment"); }}
          onClose={() => setShareOpen(false)}
        />
      )}

      {changesOpen && (
        <RequestChangesDialog
          onSubmit={(note) => clientRequestChanges(note)}
          onClose={() => setChangesOpen(false)}
        />
      )}
    </main>
  );
}

function RequestChangesDialog({ onSubmit, onClose }: { onSubmit: (note: string) => void; onClose: () => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground">Request changes</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">Tell your agency what to adjust. They&apos;ll see your note and follow up.</p>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Shift a bit more budget to awareness, and let's revisit the CTV split."
          rows={4}
          className="mt-3 w-full resize-none rounded-lg border border-border px-3 py-2 text-[13px] text-foreground outline-none focus:border-[#7C5CFC]"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Cancel</button>
          <button
            onClick={() => onSubmit(note.trim())}
            disabled={!note.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" /> Send to agency
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareWithClientDialog({ shared, onCopyLink, onShare, onClose }: { shared: boolean; onCopyLink: () => void; onShare: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-foreground">Share with client</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">Your client gets a read-only view of this plan and can leave comments.</p>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3F0FF] text-[11px] font-semibold text-[#7C5CFC]">JR</span>
            <div>
              <div className="text-[13px] font-medium text-foreground">Jordan Reyes</div>
              <div className="text-[11px] text-muted-foreground">Client Lead</div>
            </div>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">Can view &amp; comment</span>
        </div>

        <button onClick={onCopyLink} className="mt-3 flex w-full items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-accent">
          <Link2 className="h-3.5 w-3.5" /> Copy share link
        </button>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Cancel</button>
          <button onClick={onShare} className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90">
            {shared ? <><Check className="h-3.5 w-3.5" /> Re-share</> : <><Share2 className="h-3.5 w-3.5" /> Share</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function SplitOperatorCanvas({ operator }: { operator: NonNullable<ReturnType<typeof useCampaign>["activeOperator"]> }) {
  const { setActiveOperator, showToast } = useCampaign();

  function handleAuthorize(guardrails: typeof operator.guardrails) {
    setActiveOperator({ ...operator, mode: "operator", guardrails, status: "active" });
    showToast(`Operator authorized — managing ${operator.strategyName} within your guardrails`);
  }

  function handleManual() {
    // Clear the artifact only — chat layout stays as the user set it (Rule 1).
    showToast("Staying manual — I'll keep proposing, you approve every change");
    setActiveOperator(null);
  }

  function handleTakeControl() {
    showToast("Control returned to you");
    setActiveOperator(null);
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
        <h1 className="truncate text-[14px] font-semibold text-foreground">Run with AI — {operator.strategyName}</h1>
        <button
          type="button"
          onClick={() => setActiveOperator(null)}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Close
        </button>
      </header>
      <div className="flex flex-1 flex-col overflow-y-auto bg-accent px-8 py-8">
        <div className="mx-auto my-auto w-full max-w-2xl">
          <OperatorAuthorizationCard
            plan={operator}
            onAuthorize={handleAuthorize}
            onManual={handleManual}
            onTakeControl={handleTakeControl}
          />
        </div>
      </div>
    </main>
  );
}

function SplitBriefCanvas({ brief }: { brief: NonNullable<ReturnType<typeof useCampaign>["activeBrief"]> }) {
  const { setActiveBrief, showToast } = useCampaign();

  function handleShare() {
    showToast("Share link copied to clipboard");
  }

  function handleDiscard() {
    // Clear the artifact only — chat layout stays as the user set it (Rule 1).
    setActiveBrief(null);
  }

  function handleConnectPixel() {
    showToast("Site pixel connected — competitor tracking is on", { label: "View campaigns", href: "/campaigns" });
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold text-foreground">{brief.name}</h1>
        </div>
        <div className="flex items-center gap-2">
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
            Close
          </button>
        </div>
      </header>
      <div className="flex flex-1 flex-col overflow-y-auto bg-accent px-8 py-8">
        <div className="mx-auto my-auto w-full max-w-2xl">
          <CompetitiveBriefCard brief={brief} onConnectPixel={handleConnectPixel} />
        </div>
      </div>
    </main>
  );
}

function SplitAudienceCanvas({ segment }: { segment: NonNullable<ReturnType<typeof useCampaign>["activeAudience"]> }) {
  const { setActiveAudience, saveAudience, showToast } = useCampaign();

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
    // Clear the artifact only — chat layout stays as the user set it (Rule 1).
    saveAudience({ ...segment, lastModifiedAt: new Date().toISOString() });
    setActiveAudience(null);
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
      <div className="flex flex-1 flex-col overflow-y-auto bg-accent px-8 py-8">
        <div className="mx-auto my-auto w-full max-w-2xl">
          <AudienceCard segment={segment} onUpdate={handleUpdate} />
        </div>
      </div>
    </main>
  );
}

/**
 * Reactive AI bubble (Notion-style). When the user opens a manual artifact GUI
 * without the chat, this sits bottom-right and greets once per session with
 * "I'm here if you need me," then stays out of the way.
 */
function ChatBubble({ onOpen }: { onOpen: () => void }) {
  const [showTip, setShowTip] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("fuseiq-bubble-tip-seen")) return;
    setShowTip(true);
    const t = window.setTimeout(() => setShowTip(false), 6000);
    return () => window.clearTimeout(t);
  }, []);
  function dismissTip() {
    setShowTip(false);
    try { sessionStorage.setItem("fuseiq-bubble-tip-seen", "1"); } catch { /* ignore */ }
  }
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5">
      {showTip && (
        <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] text-foreground shadow-md animate-in fade-in slide-in-from-right-2 duration-300">
          <span>I&apos;m here if you need me</span>
          <button type="button" onClick={dismissTip} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Dismiss">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => { dismissTip(); onOpen(); }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-all hover:bg-foreground/90 hover:scale-105 active:scale-95"
        title="Ask the AI"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dockSide, setState, reopenChat } = useAICompanion();
  const { activeStrategy, savedStrategies, activeNarrative, activeAudience, activeBrief, activeOperator, activeMediaPlan } = useCampaign();
  const { activePersona } = usePersona();
  // Client portal is read-only — no AI build companion at all (just view + comment).
  const isClient = activePersona.role === "client";
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);

  const strategy = activeStrategy || savedStrategies[savedStrategies.length - 1];
  // On /canvas, artifacts render inside canvas frames — the split-canvas takeover
  // is suppressed (Operator excepted: it has its own authorization surface).
  const pathname = usePathname();
  const onCanvasPage = pathname?.startsWith("/canvas") ?? false;
  const hasArtifact = onCanvasPage
    ? !!activeOperator
    : !!(activeStrategy || activeNarrative || activeAudience || activeBrief || activeOperator || activeMediaPlan);
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
    // Clients never get the auto-opened AI companion.
    if (isClient) return;
    // Manual-GUI-first (Notion-style): a main CTA opened the artifact for manual
    // editing — keep the chat closed; the bubble offers the AI reactively.
    if (typeof window !== "undefined" && sessionStorage.getItem("fuseiq-suppress-autochat")) {
      sessionStorage.removeItem("fuseiq-suppress-autochat");
      return;
    }
    // Don't auto-open if user explicitly closed this session
    if (userClosedRef.current) return;
    // Don't auto-open if AI is already showing
    if (state !== "resting") return;

    // Honor the user's explicit layout preference (set via the ChatLayoutPicker).
    // Auto-split is the documented default for everyone else.
    const preferred = typeof window !== "undefined"
      ? localStorage.getItem(ENTRY_LAYOUT_KEY) as AICompanionState | null
      : null;

    if (preferred === "floating") {
      setState("floating");
    } else {
      // Default to split panel for first-time users or those who prefer split
      setState("split");
    }
  }, [hasArtifact, state, setState, isClient]);

  const handleDrag = useCallback((deltaX: number) => {
    setChatWidth((prev) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, prev + deltaX)));
  }, []);

  const handleDragRight = useCallback((deltaX: number) => {
    setChatWidth((prev) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, prev - deltaX)));
  }, []);

  const renderSplitCanvas = () => {
    if (activeMediaPlan) {
      return <SplitMediaPlanCanvas plan={activeMediaPlan} />;
    }
    if (activeOperator) {
      return <SplitOperatorCanvas operator={activeOperator} />;
    }
    if (activeBrief) {
      return <SplitBriefCanvas brief={activeBrief} />;
    }
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

  const showSplitChat = state === "split" && !isClient;

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
      {!isClient && state === "fullscreen" && <AIFullscreen />}
      {!isClient && state === "floating" && <AIFloatingPanel />}

      {/* Chat bubble — visible when artifact is open and chat isn't showing in any panel.
          Clients don't get the AI companion at all. */}
      {(() => {
        if (isClient) return null;
        const chatVisible =
          state === "fullscreen" ||
          state === "floating" ||
          state === "split";
        // No bubble on /canvas — the page has a permanent chat input already.
        const showBubble = hasArtifact && !chatVisible && !onCanvasPage;
        if (!showBubble) return null;
        // Reopen consistently with the user's preferred docked layout (keeps the
        // artifact visible) — not always floating, which used to differ from how
        // auto-open and minimize bring the chat back.
        return <ChatBubble onOpen={reopenChat} />;
      })()}

      <FeedbackButton />
      <Toast />
    </>
  );
}
