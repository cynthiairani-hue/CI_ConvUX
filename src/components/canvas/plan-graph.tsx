"use client";

/* ── The media plan as a live node graph ──
   Plan → funnel-stage groups → line nodes, wired. Every action that exists in
   the media planner is alive on the nodes and mutates the SAME artifact
   through the same recalc engine (recalcMediaPlan) the card and the chat use:
   launch/pause a single line, duplicate a line, edit its budget inline,
   activate or pause the whole plan. One artifact, three modalities. */

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasFrame } from "@/types/canvas";
import type { FunnelStage, MediaCampaign, MediaPlan } from "@/types/campaign";
import { recalcMediaPlan, editCampaignBudget } from "@/data/media-plan-flow";

const STAGE_W = 280;
const STAGE_H = 104;
const STAGE_GAP = 18;
const LINE_W = 310;
const LINE_H = 118;
const LINE_GAP = 14;
const COL_GAP_1 = 90; // frame → stage column
const COL_GAP_2 = 70; // stage → line column

const STAGE_ORDER: FunnelStage[] = ["awareness", "consideration", "conversion"];

const STAGE_META: Record<FunnelStage, { label: string; dot: string }> = {
  awareness: { label: "Awareness", dot: "bg-violet-500" },
  consideration: { label: "Consideration", dot: "bg-blue-500" },
  conversion: { label: "Conversion", dot: "bg-emerald-500" },
};

interface StageLayout {
  stage: FunnelStage;
  lines: MediaCampaign[];
  expanded: boolean;
  y: number;
}

function layoutStages(frame: CanvasFrame, plan: MediaPlan): StageLayout[] {
  const expandedSet = new Set(frame.expandedStages ?? []);
  let cursorY = frame.y;
  const out: StageLayout[] = [];
  for (const stage of STAGE_ORDER) {
    const lines = plan.campaigns.filter((c) => c.funnelStage === stage);
    if (lines.length === 0) continue;
    const expanded = expandedSet.has(stage);
    out.push({ stage, lines, expanded, y: cursorY });
    const blockH = expanded ? Math.max(STAGE_H, lines.length * (LINE_H + LINE_GAP) - LINE_GAP) : STAGE_H;
    cursorY += blockH + STAGE_GAP;
  }
  return out;
}

/** Rightmost/bottommost extent of the graph, for fit-to-content. */
export function planGraphExtent(frame: CanvasFrame, plan: MediaPlan): { maxX: number; maxY: number } {
  const stages = layoutStages(frame, plan);
  const anyExpanded = stages.some((s) => s.expanded);
  const last = stages[stages.length - 1];
  const maxY = last
    ? last.y + (last.expanded ? Math.max(STAGE_H, last.lines.length * (LINE_H + LINE_GAP) - LINE_GAP) : STAGE_H)
    : frame.y;
  const maxX = frame.x + frame.w + COL_GAP_1 + STAGE_W + (anyExpanded ? COL_GAP_2 + LINE_W : 0);
  return { maxX, maxY };
}

/* ── Compact plan body shown while the plan is decomposed ── */

export function PlanComposedBody({ plan, onUpdate }: {
  plan: MediaPlan;
  onUpdate: (updated: MediaPlan, toast?: string) => void;
}) {
  const live = plan.reviewState === "active";
  const enabledCount = plan.campaigns.filter((c) => c.enabled).length;

  function setReviewState(reviewState: MediaPlan["reviewState"], toast: string) {
    onUpdate(recalcMediaPlan({ ...plan, reviewState }), toast);
  }

  return (
    <div className="p-5">
      <p className="text-[15px] font-medium text-foreground">
        ${plan.summary.totalBudget.toLocaleString()} · {plan.flight} · {enabledCount} of {plan.campaigns.length} lines in plan
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Est. {(plan.summary.estImpressions / 1_000_000).toFixed(1)}M impressions · {plan.summary.estConversions.toLocaleString()} conversions · {plan.summary.estRoas}x ROAS
      </p>
      <div className="mt-3 flex items-center gap-2">
        {plan.reviewState === "approved" && (
          <button
            type="button"
            onClick={() => setReviewState("active", `Plan activated — ${enabledCount} lines live`)}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Play className="h-3.5 w-3.5" /> Activate plan
          </button>
        )}
        {live && (
          <button
            type="button"
            onClick={() => setReviewState("paused", "Plan paused — all lines stopped")}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Pause className="h-3.5 w-3.5" /> Pause plan
          </button>
        )}
        {plan.reviewState === "paused" && (
          <button
            type="button"
            onClick={() => setReviewState("active", `Plan resumed — ${enabledCount} lines live`)}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Play className="h-3.5 w-3.5" /> Resume plan
          </button>
        )}
        {(plan.reviewState === "draft" || plan.reviewState === "pending-approval") && (
          <span className="text-[12px] text-muted-foreground">
            {plan.reviewState === "draft" ? "Draft — send for approval from the full plan" : "Awaiting approval"}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground/60">Collapse the graph to edit the full plan</p>
    </div>
  );
}

/* ── The graph: stage groups + line nodes + wires ── */

export function PlanGraph({ frame, plan, onUpdate, onToggleStage }: {
  frame: CanvasFrame;
  plan: MediaPlan;
  onUpdate: (updated: MediaPlan, toast?: string) => void;
  onToggleStage: (frameId: string, stage: string) => void;
}) {
  const live = plan.reviewState === "active";
  const stages = layoutStages(frame, plan);
  const stageX = frame.x + frame.w + COL_GAP_1;
  const lineX = stageX + STAGE_W + COL_GAP_2;
  const planPort = { x: frame.x + frame.w, y: frame.y + 48 };

  function toggleLine(c: MediaCampaign) {
    const campaigns = plan.campaigns.map((x) => (x.id === c.id ? { ...x, enabled: !x.enabled } : x));
    const toast = live
      ? c.enabled ? `${c.label} paused — budget returns to the plan pool` : `${c.label} is live`
      : c.enabled ? `${c.label} excluded from the plan` : `${c.label} back in the plan`;
    onUpdate(recalcMediaPlan({ ...plan, campaigns }), toast);
  }

  function duplicateLine(c: MediaCampaign) {
    const copy: MediaCampaign = { ...c, id: `${c.id}-copy-${Date.now().toString(36)}`, label: `${c.label} (copy)` };
    const idx = plan.campaigns.findIndex((x) => x.id === c.id);
    const campaigns = [...plan.campaigns.slice(0, idx + 1), copy, ...plan.campaigns.slice(idx + 1)];
    onUpdate(recalcMediaPlan({ ...plan, campaigns }), `${c.label} duplicated — same budget, edit before launch`);
  }

  return (
    <>
      <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} style={{ zIndex: frame.z }} aria-hidden>
        {stages.map((s) => {
          const sy = s.y + STAGE_H / 2;
          const stageLive = live && s.lines.some((c) => c.enabled);
          return (
            <g key={s.stage}>
              <path
                d={`M ${planPort.x} ${planPort.y} C ${planPort.x + 45} ${planPort.y}, ${stageX - 45} ${sy}, ${stageX} ${sy}`}
                fill="none"
                stroke={stageLive ? "#10B981" : "hsl(var(--muted-foreground) / 0.35)"}
                strokeWidth={1.5}
                strokeDasharray={stageLive ? undefined : "6 4"}
              />
              {s.expanded && s.lines.map((c, i) => {
                const ly = s.y + i * (LINE_H + LINE_GAP) + LINE_H / 2;
                const lineLive = live && c.enabled;
                return (
                  <path
                    key={c.id}
                    d={`M ${stageX + STAGE_W} ${sy} C ${stageX + STAGE_W + 35} ${sy}, ${lineX - 35} ${ly}, ${lineX} ${ly}`}
                    fill="none"
                    stroke={lineLive ? "#10B981" : "hsl(var(--muted-foreground) / 0.35)"}
                    strokeWidth={1.5}
                    strokeDasharray={lineLive ? undefined : "6 4"}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {stages.map((s) => {
        const meta = STAGE_META[s.stage];
        const budget = s.lines.filter((c) => c.enabled).reduce((sum, c) => sum + c.budget, 0);
        const liveCount = s.lines.filter((c) => c.enabled).length;
        return (
          <div
            key={s.stage}
            data-canvas-frame
            className="absolute rounded-xl border border-border bg-white px-3.5 py-3 shadow-[0px_2px_8px_rgba(71,88,114,0.06)]"
            style={{ left: stageX, top: s.y, width: STAGE_W, height: STAGE_H, zIndex: frame.z }}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
              <span className="text-[12px] font-medium text-foreground">{meta.label}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {liveCount}/{s.lines.length} {live ? "live" : "in plan"}
              </span>
            </div>
            <p className="mt-1.5 text-[15px] font-semibold text-foreground">${budget.toLocaleString()}</p>
            <button
              type="button"
              onClick={() => onToggleStage(frame.id, s.stage)}
              className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {s.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {s.expanded ? "Hide lines" : `Show ${s.lines.length} ${s.lines.length === 1 ? "line" : "lines"}`}
            </button>
          </div>
        );
      })}

      {stages.filter((s) => s.expanded).map((s) =>
        s.lines.map((c, i) => (
          <LineNode
            key={c.id}
            line={c}
            planLive={live}
            x={lineX}
            y={s.y + i * (LINE_H + LINE_GAP)}
            z={frame.z}
            onToggle={() => toggleLine(c)}
            onDuplicate={() => duplicateLine(c)}
            onBudget={(v) => onUpdate(editCampaignBudget(plan, c.id, v))}
          />
        ))
      )}
    </>
  );
}

function LineNode({ line, planLive, x, y, z, onToggle, onDuplicate, onBudget }: {
  line: MediaCampaign;
  planLive: boolean;
  x: number;
  y: number;
  z: number;
  onToggle: () => void;
  onDuplicate: () => void;
  onBudget: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const lineLive = planLive && line.enabled;

  function commitBudget() {
    if (draft === null) return;
    const v = parseInt(draft.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(v) && v !== line.budget) onBudget(v);
    setDraft(null);
  }

  return (
    <div
      data-canvas-frame
      className={cn(
        "absolute rounded-xl border border-border bg-white px-3 py-2.5 shadow-[0px_2px_8px_rgba(71,88,114,0.06)]",
        !line.enabled && "opacity-60"
      )}
      style={{ left: x, top: y, width: LINE_W, height: LINE_H, zIndex: z }}
    >
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{line.label}</span>
        {lineLive ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Live
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {line.enabled ? "In plan" : "Off"}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {line.channel.toUpperCase()}
        {line.forecast.impressions > 0 && ` · ${(line.forecast.impressions / 1_000_000).toFixed(1)}M impr`}
        {line.forecast.conversions > 0 && ` · ${line.forecast.conversions.toLocaleString()} conv`}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[12px] text-muted-foreground">$</span>
        <input
          value={draft ?? line.budget.toLocaleString()}
          onFocus={(e) => { setDraft(String(line.budget)); e.currentTarget.select(); }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitBudget}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-20 rounded-md border border-border px-1.5 py-1 text-[12px] tabular-nums text-foreground outline-none focus:border-foreground/40"
          aria-label="Line budget"
        />
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent",
            line.enabled ? "text-foreground" : "text-muted-foreground"
          )}
          title={planLive
            ? line.enabled ? "Pause this line" : "Launch this line"
            : line.enabled ? "Exclude from the plan" : "Include in the plan"}
        >
          {line.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Duplicate this line"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
