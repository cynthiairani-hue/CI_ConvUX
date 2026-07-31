"use client";

/* ── Marketplace data-segment node ──
   A third-party segment placed on the canvas. The price (segment CPM) is on
   the node itself — cost is evidence, visible before anyone attaches or
   activates anything. Attached segments wire into the first-party audience
   they extend. */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Database, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketNode } from "@/types/canvas";
import type { MarketplaceSegment } from "@/data/marketplace";

export const MARKET_W = 250;
export const MARKET_H = 96;

export function MarketNodeCard({ node, segment, attachedName, isInspected, scale, onMove, onInspect, onRemove }: {
  node: MarketNode;
  segment: MarketplaceSegment;
  attachedName: string | null;
  isInspected: boolean;
  scale: number;
  onMove: (id: string, x: number, y: number) => void;
  onInspect: () => void;
  onRemove: (id: string) => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

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
    onMove(node.id, drag.ox + (e.clientX - drag.startX) / scale, drag.oy + (e.clientY - drag.startY) / scale);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    // A press without a real drag is a click — open the inspector.
    if (drag && Math.abs(e.clientX - drag.startX) < 4 && Math.abs(e.clientY - drag.startY) < 4) {
      onInspect();
    }
  }

  return (
    <div
      data-canvas-frame
      className={cn(
        "group absolute cursor-pointer rounded-xl border bg-white px-3.5 py-3 shadow-[0px_2px_8px_rgba(71,88,114,0.06)] transition-shadow hover:shadow-[0px_4px_14px_rgba(71,88,114,0.14)]",
        isInspected ? "border-foreground/50 ring-1 ring-foreground/20" : "border-border",
        dragging && "cursor-grabbing"
      )}
      style={{ left: node.x, top: node.y, width: MARKET_W, zIndex: 30 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
    >
      <div className="pointer-events-none absolute -top-[22px] left-0.5 flex w-full items-center gap-1.5 text-[11px] text-muted-foreground">
        <Database className="h-3 w-3" />
        Data segment
        <span className="ml-auto truncate pr-1 text-muted-foreground/60">{segment.provider}</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(node.id)}
        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
        title="Remove from canvas"
      >
        <X className="h-3 w-3" />
      </button>
      <p className="truncate pr-5 text-[13px] font-medium text-foreground">{segment.name}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">{segment.reach}</span>
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground" title="Segment CPM — added to media cost on matched impressions">
          ${segment.cpm.toFixed(2)} CPM
        </span>
      </div>
      <p className="mt-1 truncate text-[10.5px] text-muted-foreground/80">
        {attachedName ? `Extends ${attachedName}` : "Not attached — click to review & attach"}
      </p>
    </div>
  );
}
