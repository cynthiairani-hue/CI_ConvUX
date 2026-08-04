"use client";

/* ── Flow nodes + wires on the infinite canvas ──
   Each orchestration flow renders as compact trigger/condition/action node
   cards connected by wires. The trigger card carries the flow's controls
   (status, activate/pause, delete). Actions must be individually authorized
   before the flow can activate — the agent loop, visible and enforced. */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BookmarkPlus, Check, Filter, Play, Pause, Sparkles, Trash2, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrchestrationFlow, FlowNode, FlowNodeKind, FlowStatus } from "@/types/orchestration";

export const NODE_W = 300;

/* Estimated card heights per kind — used for wire anchors and fit-to-content.
   Nodes have fixed content structure, so these stay close to reality. */
export const NODE_EST_H: Record<FlowNodeKind, number> = {
  trigger: 196,
  condition: 110,
  action: 152,
};

const NODE_META: Record<FlowNodeKind, { label: string; icon: LucideIcon }> = {
  trigger: { label: "Trigger", icon: Zap },
  condition: { label: "Condition", icon: Filter },
  action: { label: "Action", icon: Play },
};

const STATUS_META: Record<FlowStatus, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "bg-muted-foreground/50" },
  active: { label: "Active", dot: "bg-emerald-500" },
  paused: { label: "Paused", dot: "bg-amber-500" },
};

function anchor(node: FlowNode): { inX: number; inY: number; outX: number; outY: number } {
  const midY = node.y + NODE_EST_H[node.kind] / 2;
  return { inX: node.x, inY: midY, outX: node.x + NODE_W, outY: midY };
}

/* ── Wires (rendered under the node cards, inside the camera transform) ── */

export function FlowWires({ flows }: { flows: OrchestrationFlow[] }) {
  return (
    <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
      {flows.map((flow) =>
        flow.edges.map((edge) => {
          const from = flow.nodes.find((n) => n.id === edge.from);
          const to = flow.nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const a = anchor(from);
          const b = anchor(to);
          const dx = Math.max(48, (b.inX - a.outX) / 2);
          const live = flow.status === "active";
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <path
                d={`M ${a.outX} ${a.outY} C ${a.outX + dx} ${a.outY}, ${b.inX - dx} ${b.inY}, ${b.inX} ${b.inY}`}
                fill="none"
                stroke={live ? "#10B981" : "hsl(var(--muted-foreground) / 0.4)"}
                strokeWidth={live ? 2 : 1.5}
                strokeDasharray={flow.status === "draft" ? "6 4" : undefined}
              />
              <circle cx={b.inX} cy={b.inY} r={3} fill={live ? "#10B981" : "hsl(var(--muted-foreground) / 0.5)"} />
            </g>
          );
        })
      )}
    </svg>
  );
}

/* ── A single flow node card ── */

export function FlowNodeCard({
  flow,
  node,
  scale,
  onMove,
  onAuthorize,
  onActivate,
  onPause,
  onDelete,
  onAsk,
  onSaveTemplate,
}: {
  flow: OrchestrationFlow;
  node: FlowNode;
  scale: number;
  onMove: (flowId: string, nodeId: string, x: number, y: number) => void;
  onAuthorize: (flowId: string, nodeId: string) => void;
  onActivate: (flowId: string) => void;
  onPause: (flowId: string) => void;
  onDelete: (flowId: string) => void;
  onAsk: (flow: OrchestrationFlow) => void;
  onSaveTemplate: (flow: OrchestrationFlow) => void;
}) {
  const meta = NODE_META[node.kind];
  const Icon = meta.icon;
  const status = STATUS_META[flow.status];
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const actions = flow.nodes.filter((n) => n.kind === "action");
  const allAuthorized = actions.every((a) => a.authorized);
  const locked = flow.status === "active";

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: node.x, oy: node.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    onMove(flow.id, node.id, drag.ox + (e.clientX - drag.startX) / scale, drag.oy + (e.clientY - drag.startY) / scale);
  }

  function onPointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div
      data-canvas-frame
      data-node-id={node.id}
      className={cn(
        "absolute select-none rounded-xl border border-border bg-white shadow-[0px_2px_12px_rgba(71,88,114,0.08)]",
        dragging ? "cursor-grabbing shadow-[0px_8px_24px_rgba(71,88,114,0.16)]" : "cursor-grab"
      )}
      style={{ left: node.x, top: node.y, width: NODE_W }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* The trigger card anchors the flow: name, status, and controls live here. */}
      {node.kind === "trigger" && (
        <div className="flex items-center gap-2 rounded-t-xl border-b border-border bg-muted/40 px-3 py-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)} />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{flow.name}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{status.label}</span>
          <button
            type="button"
            onClick={() => onAsk(flow)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Ask the AI about this flow"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSaveTemplate(flow)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Save this flow as a reusable template"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(flow.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-red-600"
            title="Delete flow"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="px-3 pt-2.5 pb-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{meta.label}</span>
        </div>
        <p className="text-[13px] font-medium leading-5 text-foreground">{node.title}</p>
        <p className="mt-0.5 text-[12px] leading-[18px] text-muted-foreground">{node.detail}</p>

        {/* Actions carry their own explicit authorization. */}
        {node.kind === "action" && (
          <button
            type="button"
            disabled={locked}
            onClick={() => onAuthorize(flow.id, node.id)}
            className={cn(
              "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[12px] font-medium transition-colors",
              node.authorized
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-border text-foreground hover:bg-accent",
              locked && "opacity-70"
            )}
            title={locked ? "Pause the flow to change authorizations" : node.authorized ? "Revoke authorization" : "Authorize this action"}
          >
            {node.authorized ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Authorized
              </>
            ) : (
              "Authorize"
            )}
          </button>
        )}
      </div>

      {/* Flow-level control on the trigger card: the convergence point. */}
      {node.kind === "trigger" && (
        <div className="px-3 pb-3">
          {flow.status === "active" ? (
            <button
              type="button"
              onClick={() => onPause(flow.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause flow
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!allAuthorized}
                onClick={() => onActivate(flow.id)}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium transition-colors",
                  allAuthorized
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                <Play className="h-3.5 w-3.5" />
                Activate flow
              </button>
              {!allAuthorized && (
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  Authorize every action to activate
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
