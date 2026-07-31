"use client";

/* ── The media plan as a live node graph (Flora-style) ──
   Plan → funnel-stage groups → line nodes → creative nodes, wired with
   visible ports. Node names float ABOVE the cards (Flora's signature), the
   cards stay clean content. Every action that exists in the media planner is
   alive on the nodes and mutates the SAME artifact through the same recalc
   engine (recalcMediaPlan) the card and the chat use. Clicking a node opens
   the inspector. One artifact, three modalities. */

import { useState } from "react";
import { Calendar, Check, ChevronDown, ChevronRight, Copy, Image as ImageIcon, Layers, Pause, Play, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasFrame } from "@/types/canvas";
import type { AudienceSegment, FunnelStage, MediaCampaign, MediaChannelKey, MediaPlan } from "@/types/campaign";
import { recalcMediaPlan, editCampaignBudget, addBlankLine } from "@/data/media-plan-flow";
import { CHANNEL_CREATIVE, FALLBACK_CREATIVE } from "@/data/creative-templates";
import { audienceForLine } from "@/data/marketplace";

const STAGE_W = 260;
const STAGE_H = 126;
const STAGE_GAP = 26;
const LINE_W = 310;
const LINE_H = 118;
const LINE_GAP = 24;
const CRE_W = 200;
const CRE_H = 112; // 16:9 thumb at 200w
const AUD_W = 240;
const AUD_H = 84;
const AUD_GAP = 22;
const COL_GAP_1 = 100; // frame → stages
const COL_GAP_2 = 80;  // stage → lines
const COL_GAP_3 = 80;  // line → creative
const COL_GAP_4 = 90;  // creative → audience

const STAGE_ORDER: FunnelStage[] = ["awareness", "consideration", "conversion"];

const ADD_CHANNELS: { key: string; label: string }[] = [
  { key: "ctv", label: "Connected TV" },
  { key: "dooh", label: "Digital Out-of-Home" },
  { key: "lookalike", label: "Lookalike" },
  { key: "social", label: "Social" },
  { key: "retargeting", label: "Retargeting" },
];

/* Rough month-range parser for flight strings like "Jul 24 – Sep 30" — good
   enough to place bars proportionally on the plan's own window. */
const MONTH_IDX: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseFlight(s: string | undefined): { start: number; end: number } | null {
  if (!s) return null;
  const m = s.toLowerCase().match(/([a-z]{3})[a-z]*\s*(\d{1,2})?\s*[–—-]\s*([a-z]{3})[a-z]*\s*(\d{1,2})?/);
  if (!m) return null;
  const sm = MONTH_IDX[m[1]], em = MONTH_IDX[m[3]];
  if (sm === undefined || em === undefined) return null;
  return { start: sm * 31 + (m[2] ? +m[2] : 1), end: em * 31 + (m[4] ? +m[4] : 28) };
}

const STAGE_BAR: Record<FunnelStage, string> = {
  awareness: "#8B5CF6",
  consideration: "#3B82F6",
  conversion: "#10B981",
};

const FLIGHT_W = 930;
const FLIGHT_ROW_H = 24;
const FLIGHT_PAD = 64;
const FLIGHT_GAP = 40;

export function flightingHeight(plan: MediaPlan): number {
  return FLIGHT_PAD + plan.campaigns.filter((c) => c.enabled).length * FLIGHT_ROW_H;
}

const STAGE_META: Record<FunnelStage, { label: string; dot: string }> = {
  awareness: { label: "Awareness", dot: "bg-violet-500" },
  consideration: { label: "Consideration", dot: "bg-blue-500" },
  conversion: { label: "Conversion", dot: "bg-emerald-500" },
};

export type InspectTarget =
  | { kind: "line" | "creative"; planId: string; lineId: string }
  | { kind: "audience"; audienceId: string }
  | { kind: "market"; nodeId: string };

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
  let maxY = last
    ? last.y + (last.expanded ? Math.max(STAGE_H, last.lines.length * (LINE_H + LINE_GAP) - LINE_GAP) : STAGE_H)
    : frame.y;
  if (anyExpanded) maxY += FLIGHT_GAP + flightingHeight(plan);
  const maxX = frame.x + frame.w + COL_GAP_1 + STAGE_W + (anyExpanded ? COL_GAP_2 + LINE_W + COL_GAP_3 + CRE_W + COL_GAP_4 + AUD_W : 0);
  return { maxX, maxY };
}

export function creativeFor(line: MediaCampaign) {
  // An explicit swap (line.creative holds a creative key) wins over the
  // channel default — changing a creative is a real, persisted line edit.
  if (line.creative && CHANNEL_CREATIVE[line.creative]) return CHANNEL_CREATIVE[line.creative];
  return CHANNEL_CREATIVE[line.channel] ?? FALLBACK_CREATIVE;
}

/** Positions of the graph's audience nodes — shared with the canvas so the
    same segment's full frame can be wired to its node when both are visible. */
export function audienceNodePositions(frame: CanvasFrame, plan: MediaPlan, audiences: AudienceSegment[]):
  { audience: AudienceSegment; lineIds: string[]; x: number; y: number; w: number; h: number }[] {
  const stages = layoutStages(frame, plan);
  const audX = frame.x + frame.w + COL_GAP_1 + STAGE_W + COL_GAP_2 + LINE_W + COL_GAP_3 + CRE_W + COL_GAP_4;
  const rows: { audience: AudienceSegment; lineIds: string[]; x: number; y: number; w: number; h: number }[] = [];
  let cursor = frame.y;
  const seen = new Map<string, number>();
  stages.filter((s) => s.expanded).forEach((s) =>
    s.lines.forEach((c) => {
      const a = audienceForLine(c, audiences);
      if (!a) return;
      const idx = seen.get(a.id);
      if (idx !== undefined) {
        rows[idx].lineIds.push(c.id);
      } else {
        seen.set(a.id, rows.length);
        rows.push({ audience: a, lineIds: [c.id], x: audX, y: cursor, w: AUD_W, h: AUD_H });
        cursor += AUD_H + AUD_GAP;
      }
    })
  );
  return rows;
}

/* Flora-style floating label above a node */
function NodeLabel({ children, meta }: { children: React.ReactNode; meta?: string }) {
  return (
    <div className="pointer-events-none absolute -top-[22px] left-0.5 flex w-full items-center gap-1.5 text-[11px] text-muted-foreground">
      {children}
      {meta && <span className="ml-auto truncate pr-1 text-muted-foreground/60">{meta}</span>}
    </div>
  );
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

/* ── The graph ── */

export function PlanGraph({ frame, plan, audiences, onUpdate, onToggleStage, selected, onToggleSelect, onSelectAll, onClearSelection, onRequestRemove, inspected, onInspect }: {
  frame: CanvasFrame;
  plan: MediaPlan;
  audiences: AudienceSegment[];
  onUpdate: (updated: MediaPlan, toast?: string) => void;
  onToggleStage: (frameId: string, stage: string) => void;
  selected: Set<string>;
  onToggleSelect: (lineId: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onRequestRemove: (ids: string[]) => void;
  inspected: InspectTarget | null;
  onInspect: (target: InspectTarget | null) => void;
}) {
  const live = plan.reviewState === "active";
  const stages = layoutStages(frame, plan);
  const stageX = frame.x + frame.w + COL_GAP_1;
  const lineX = stageX + STAGE_W + COL_GAP_2;
  const creX = lineX + LINE_W + COL_GAP_3;
  const audX = creX + CRE_W + COL_GAP_4;
  const planPort = { x: frame.x + frame.w, y: frame.y + 48 };

  /* Audience column — unique segments the expanded lines target, each one a
     shared node so the blast radius of an audience change is visible. */
  const lineY = new Map<string, number>();
  stages.filter((s) => s.expanded).forEach((s) =>
    s.lines.forEach((c, i) => lineY.set(c.id, s.y + i * (LINE_H + LINE_GAP)))
  );
  const audienceRows = audienceNodePositions(frame, plan, audiences);

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

  const planLineIds = plan.campaigns.map((c) => c.id);
  const selectedHere = planLineIds.filter((id) => selected.has(id));

  function bulkSetEnabled(enabled: boolean) {
    const ids = new Set(selectedHere);
    const campaigns = plan.campaigns.map((c) => (ids.has(c.id) ? { ...c, enabled } : c));
    const verb = enabled ? (live ? "live" : "back in the plan") : (live ? "paused" : "taken off the plan");
    onUpdate(recalcMediaPlan({ ...plan, campaigns }), `${ids.size} ${ids.size === 1 ? "line" : "lines"} ${verb}`);
  }

  const wireStroke = (isLive: boolean) => (isLive ? "#10B981" : "hsl(var(--muted-foreground) / 0.35)");
  const inspectedLineId = inspected && (inspected.kind === "line" || inspected.kind === "creative") ? inspected.lineId : null;
  const inspectedKind = inspected?.kind ?? null;

  return (
    <>
      {/* Selection bar — appears only once something is checked; checking is a
          rare bulk-edit gesture, so it stays out of the way until then */}
      {selectedHere.length > 0 && (
      <div
        data-canvas-frame
        className="absolute flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1.5 shadow-md"
        style={{ left: lineX, top: frame.y - 64, zIndex: frame.z + 1 }}
      >
          <>
            <span className="px-1.5 text-[12px] font-medium text-foreground">{selectedHere.length} selected</span>
            {selectedHere.length < planLineIds.length && (
              <button
                type="button"
                onClick={() => onSelectAll(planLineIds)}
                className="rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Select every line in the plan"
              >
                All
              </button>
            )}
            <span className="mx-0.5 h-4 w-px bg-border" />
            <button
              type="button"
              onClick={() => bulkSetEnabled(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
              title={live ? "Launch the selected lines" : "Include the selected lines in the plan"}
            >
              <Play className="h-3 w-3" /> {live ? "Launch" : "Include"}
            </button>
            <button
              type="button"
              onClick={() => bulkSetEnabled(false)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
              title={live ? "Pause the selected lines" : "Exclude the selected lines from the plan"}
            >
              <Pause className="h-3 w-3" /> {live ? "Pause" : "Exclude"}
            </button>
            <button
              type="button"
              onClick={() => onRequestRemove(selectedHere)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-accent hover:text-red-600"
              title="Delete the selected lines from the plan"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <button
              type="button"
              onClick={onClearSelection}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
      </div>
      )}

      {/* Wires + ports */}
      <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} style={{ zIndex: frame.z }} aria-hidden>
        {/* plan output port */}
        <circle cx={planPort.x} cy={planPort.y} r={4} fill="white" stroke="hsl(var(--muted-foreground) / 0.6)" strokeWidth={1.5} />
        {stages.map((s) => {
          const sy = s.y + STAGE_H / 2;
          const stageLive = live && s.lines.some((c) => c.enabled);
          return (
            <g key={s.stage}>
              <path
                d={`M ${planPort.x} ${planPort.y} C ${planPort.x + 50} ${planPort.y}, ${stageX - 50} ${sy}, ${stageX} ${sy}`}
                fill="none"
                stroke={wireStroke(stageLive)}
                strokeWidth={1.25}
              />
              <circle cx={stageX} cy={sy} r={3.5} fill="white" stroke={wireStroke(stageLive)} strokeWidth={1.5} />
              {s.expanded && <circle cx={stageX + STAGE_W} cy={sy} r={3.5} fill="white" stroke={wireStroke(stageLive)} strokeWidth={1.5} />}
              {s.expanded && s.lines.map((c, i) => {
                const ly = s.y + i * (LINE_H + LINE_GAP) + LINE_H / 2;
                const lineLive = live && c.enabled;
                const cy = s.y + i * (LINE_H + LINE_GAP) + CRE_H / 2;
                return (
                  <g key={c.id}>
                    <path
                      d={`M ${stageX + STAGE_W} ${sy} C ${stageX + STAGE_W + 40} ${sy}, ${lineX - 40} ${ly}, ${lineX} ${ly}`}
                      fill="none"
                      stroke={wireStroke(lineLive)}
                      strokeWidth={1.25}
                    />
                    <circle cx={lineX} cy={ly} r={3.5} fill="white" stroke={wireStroke(lineLive)} strokeWidth={1.5} />
                    {/* line → creative */}
                    <path
                      d={`M ${lineX + LINE_W} ${ly} C ${lineX + LINE_W + 40} ${ly}, ${creX - 40} ${cy}, ${creX} ${cy}`}
                      fill="none"
                      stroke={wireStroke(lineLive)}
                      strokeWidth={1.25}
                    />
                    <circle cx={lineX + LINE_W} cy={ly} r={3.5} fill="white" stroke={wireStroke(lineLive)} strokeWidth={1.5} />
                    <circle cx={creX} cy={cy} r={3.5} fill="white" stroke={wireStroke(lineLive)} strokeWidth={1.5} />
                  </g>
                );
              })}
            </g>
          );
        })}
        {/* line → audience (shared nodes collect wires from every line that targets them) */}
        {audienceRows.map((row) =>
          row.lineIds.map((lineId) => {
            const ly = (lineY.get(lineId) ?? frame.y) + LINE_H / 2;
            const ay = row.y + AUD_H / 2;
            const line = plan.campaigns.find((c) => c.id === lineId);
            const isLive = live && !!line?.enabled;
            return (
              <g key={`${row.audience.id}-${lineId}`}>
                <path
                  d={`M ${lineX + LINE_W} ${ly} C ${lineX + LINE_W + 140} ${ly}, ${audX - 60} ${ay}, ${audX} ${ay}`}
                  fill="none"
                  stroke={wireStroke(isLive)}
                  strokeWidth={1.25}
                />
                <circle cx={audX} cy={ay} r={3.5} fill="white" stroke={wireStroke(isLive)} strokeWidth={1.5} />
              </g>
            );
          })
        )}
      </svg>

      {/* Stage nodes */}
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
            <NodeLabel meta={`${liveCount}/${s.lines.length} ${live ? "live" : "in plan"}`}>
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
              <Layers className="h-3 w-3" />
              {meta.label}
            </NodeLabel>
            <p className="text-[17px] font-semibold text-foreground">${budget.toLocaleString()}</p>
            <button
              type="button"
              onClick={() => onToggleStage(frame.id, s.stage)}
              className="mt-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {s.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {s.expanded ? "Hide lines" : `Show ${s.lines.length} ${s.lines.length === 1 ? "line" : "lines"}`}
            </button>
            {/* Add a line to this stage — same builder the plan card uses */}
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const res = addBlankLine(plan, s.stage, e.target.value as MediaChannelKey);
                onUpdate(recalcMediaPlan(res.plan), `New ${meta.label.toLowerCase()} line added — set its budget and audience`);
              }}
              className="mt-1.5 w-full cursor-pointer rounded-md border border-dashed border-border bg-transparent px-1.5 py-1 text-[11px] text-muted-foreground outline-none transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <option value="">＋ Add line…</option>
              {ADD_CHANNELS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
        );
      })}

      {/* Flighting — bars mirror each line's flight on the plan's window */}
      {stages.some((s) => s.expanded) && (() => {
        const lastS = stages[stages.length - 1];
        const colBottom = lastS.y + (lastS.expanded ? Math.max(STAGE_H, lastS.lines.length * (LINE_H + LINE_GAP) - LINE_GAP) : STAGE_H);
        const fy = colBottom + FLIGHT_GAP;
        const win = parseFlight(plan.flight) ?? { start: 6 * 31 + 1, end: 8 * 31 + 30 };
        const span = Math.max(1, win.end - win.start);
        const enabled = plan.campaigns.filter((c) => c.enabled);
        const months: number[] = [];
        for (let mi = Math.floor(win.start / 31); mi <= Math.floor((win.end - 1) / 31); mi++) months.push(mi);
        const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        return (
          <div
            data-canvas-frame
            className="absolute rounded-xl border border-border bg-white px-4 py-3 shadow-[0px_2px_8px_rgba(71,88,114,0.06)]"
            style={{ left: stageX, top: fy, width: FLIGHT_W, zIndex: frame.z }}
          >
            <NodeLabel meta={plan.flight}>
              <Calendar className="h-3 w-3" />
              Flighting
            </NodeLabel>
            <div className="relative mb-1 ml-[158px] mr-[72px] h-4">
              {months.map((mi) => (
                <span
                  key={mi}
                  className="absolute text-[10px] uppercase tracking-wider text-muted-foreground/70"
                  style={{ left: `${clamp01((mi * 31 + 1 - win.start) / span) * 100}%` }}
                >
                  {MONTH_NAMES[mi]}
                </span>
              ))}
            </div>
            {enabled.map((c) => {
              const f = parseFlight(c.flightDates) ?? win;
              const l = clamp01((f.start - win.start) / span);
              const w = Math.max(0.04, clamp01((f.end - f.start) / span) - Math.max(0, l + clamp01((f.end - f.start) / span) - 1));
              return (
                <div key={c.id} className="flex h-6 items-center gap-2">
                  <span className="w-[150px] truncate text-[11px] text-muted-foreground">{c.label}</span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute h-2 rounded-full"
                      style={{ left: `${l * 100}%`, width: `${w * 100}%`, background: STAGE_BAR[c.funnelStage] }}
                    />
                  </div>
                  <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">${c.budget.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Line nodes + creative nodes */}
      {stages.filter((s) => s.expanded).map((s) =>
        s.lines.map((c, i) => {
          const y = s.y + i * (LINE_H + LINE_GAP);
          const lineLive = live && c.enabled;
          const cre = creativeFor(c);
          const isInspected = inspectedLineId === c.id;
          return (
            <div key={c.id}>
              <LineNode
                line={c}
                planLive={live}
                x={lineX}
                y={y}
                z={frame.z}
                isSelected={selected.has(c.id)}
                anySelection={selectedHere.length > 0}
                isInspected={isInspected && inspectedKind === "line"}
                onSelect={() => onToggleSelect(c.id)}
                onInspect={() => onInspect({ planId: plan.id, lineId: c.id, kind: "line" })}
                onToggle={() => toggleLine(c)}
                onDuplicate={() => duplicateLine(c)}
                onRemove={() => onRequestRemove([c.id])}
                onBudget={(v) => onUpdate(editCampaignBudget(plan, c.id, v))}
              />
              {/* Creative node — how the ads show up, linked */}
              <div
                data-canvas-frame
                onClick={() => onInspect({ planId: plan.id, lineId: c.id, kind: "creative" })}
                className={cn(
                  "absolute cursor-pointer overflow-hidden rounded-xl border bg-white shadow-[0px_2px_8px_rgba(71,88,114,0.06)] transition-shadow hover:shadow-[0px_4px_14px_rgba(71,88,114,0.14)]",
                  isInspected && inspectedKind === "creative" ? "border-foreground/50 ring-1 ring-foreground/20" : "border-border",
                  !c.enabled && "opacity-60"
                )}
                style={{ left: creX, top: y, width: CRE_W, height: CRE_H, zIndex: frame.z }}
              >
                <NodeLabel meta={cre.format}>
                  <ImageIcon className="h-3 w-3" />
                  Creative
                </NodeLabel>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cre.imageUrl} alt={cre.headline} draggable={false} className="h-full w-full bg-muted object-cover" />
                {lineLive && (
                  <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Audience nodes — shared segments; multiple lines wiring into one node
          makes the blast radius of an audience change visible */}
      {audienceRows.map(({ audience, lineIds, y }) => {
        const anyLive = live && lineIds.some((id) => plan.campaigns.find((c) => c.id === id)?.enabled);
        const isInspected = inspected?.kind === "audience" && inspected.audienceId === audience.id;
        return (
          <div
            key={audience.id}
            data-canvas-frame
            onClick={() => onInspect({ kind: "audience", audienceId: audience.id })}
            className={cn(
              "absolute cursor-pointer rounded-xl border bg-white px-3.5 py-3 shadow-[0px_2px_8px_rgba(71,88,114,0.06)] transition-shadow hover:shadow-[0px_4px_14px_rgba(71,88,114,0.14)]",
              isInspected ? "border-foreground/50 ring-1 ring-foreground/20" : "border-border"
            )}
            style={{ left: audX, top: y, width: AUD_W, height: AUD_H, zIndex: frame.z }}
          >
            <NodeLabel meta={audience.type.replace("-", " ")}>
              <Users className="h-3 w-3" />
              Audience
            </NodeLabel>
            <p className="truncate text-[13px] font-medium text-foreground">{audience.name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Est. {audience.estimatedSize}</span>
              {audience.type === "lookalike" && (
                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title="Segment TTL — refresh before it expires">
                  Expires in 6d
                </span>
              )}
              {anyLive && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  {lineIds.length} {lineIds.length === 1 ? "line" : "lines"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function LineNode({ line, planLive, x, y, z, isSelected, anySelection, isInspected, onSelect, onInspect, onToggle, onDuplicate, onRemove, onBudget }: {
  line: MediaCampaign;
  planLive: boolean;
  x: number;
  y: number;
  z: number;
  isSelected: boolean;
  anySelection: boolean;
  isInspected: boolean;
  onSelect: () => void;
  onInspect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
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
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, input")) return;
        onInspect();
      }}
      className={cn(
        "group absolute cursor-pointer rounded-xl border bg-white px-3 py-2.5 shadow-[0px_2px_8px_rgba(71,88,114,0.06)] transition-shadow hover:shadow-[0px_4px_14px_rgba(71,88,114,0.14)]",
        isSelected || isInspected ? "border-foreground/50 ring-1 ring-foreground/20" : "border-border",
        !line.enabled && "opacity-60"
      )}
      style={{ left: x, top: y, width: LINE_W, height: LINE_H, zIndex: z }}
    >
      <NodeLabel meta={line.channel.toUpperCase()}>
        <span className="truncate font-medium text-muted-foreground">{line.label}</span>
      </NodeLabel>
      <div className="flex items-center gap-1.5">
        {/* Bulk-select is a rare gesture — the checkbox only surfaces on hover
            or while a selection is underway. In-plan/Live is the real state. */}
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
            isSelected ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50",
            isSelected || anySelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          title={isSelected ? "Deselect" : "Select for bulk actions"}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </button>
        <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
          {line.forecast.impressions > 0 && `${(line.forecast.impressions / 1_000_000).toFixed(1)}M impr`}
          {line.forecast.conversions > 0 && ` · ${line.forecast.conversions.toLocaleString()} conv`}
        </span>
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
      <div className="mt-2.5 flex items-center gap-1.5">
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
        <button
          type="button"
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-red-600"
          title="Remove this line from the plan"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
