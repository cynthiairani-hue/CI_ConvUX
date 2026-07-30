"use client";

/* ── Ad creative tiles on the infinite canvas ──
   A tile is the creative plus its evidence plus a decision control. Live
   tiles show real performance (a decaying one is flagged as fatiguing —
   a Notice). Proposed tiles show predicted lift with confidence and wait
   for an explicit Approve/Reject — Authorize at tile scale. */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Minus, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdTile, AdTileFormat } from "@/types/creative";

export const TILE_W = 260;

const FORMAT_META: Record<AdTileFormat, { label: string; imgH: number }> = {
  feed: { label: "Feed 4:3", imgH: 195 },
  story: { label: "Story 4:5", imgH: 325 },
  display: { label: "Display 1:1", imgH: 260 },
};

/* Estimated tile heights (image + text block + footer) for fit-to-content. */
export function tileEstHeight(tile: AdTile): number {
  const footer = tile.status === "live" ? 0 : 44;
  return FORMAT_META[tile.format].imgH + 118 + footer;
}

export function AdTileCard({
  tile,
  scale,
  onMove,
  onDecide,
  onDelete,
  onAsk,
}: {
  tile: AdTile;
  scale: number;
  onMove: (id: string, x: number, y: number) => void;
  onDecide: (id: string, status: AdTile["status"]) => void;
  onDelete: (id: string) => void;
  onAsk: (tile: AdTile) => void;
}) {
  const meta = FORMAT_META[tile.format];
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: tile.x, oy: tile.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    onMove(tile.id, drag.ox + (e.clientX - drag.startX) / scale, drag.oy + (e.clientY - drag.startY) / scale);
  }

  function onPointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  const fatiguing = tile.status === "live" && tile.metrics?.trend === "decaying";

  return (
    <div
      data-canvas-frame
      data-tile-id={tile.id}
      className={cn(
        "absolute select-none overflow-hidden rounded-xl border bg-white shadow-[0px_2px_12px_rgba(71,88,114,0.08)]",
        tile.status === "rejected" ? "border-border opacity-60" : "border-border",
        dragging ? "cursor-grabbing shadow-[0px_8px_24px_rgba(71,88,114,0.16)]" : "cursor-grab"
      )}
      style={{ left: tile.x, top: tile.y, width: TILE_W }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="relative" style={{ height: meta.imgH }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tile.imageUrl}
          alt={tile.headline}
          draggable={false}
          className="h-full w-full bg-muted object-cover"
        />
        <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground backdrop-blur">
          {meta.label}
        </span>
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAsk(tile)}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
            title="Ask the AI about this creative"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(tile.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-muted-foreground backdrop-blur transition-colors hover:text-red-600"
            title="Delete creative"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {fatiguing && (
          <span className="absolute bottom-2 left-2 rounded-md bg-amber-100/95 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 backdrop-blur">
            Fatiguing — refresh recommended
          </span>
        )}
        {tile.status === "live" && !fatiguing && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        )}
      </div>

      <div className="px-3 pt-2 pb-2.5">
        <p className="truncate text-[13px] font-medium text-foreground">{tile.headline}</p>
        <p className="text-[11px] text-muted-foreground">{tile.angle}</p>

        {/* Evidence — never a bare image, never an unexplained number */}
        {tile.metrics ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-foreground">
            {tile.metrics.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
            {tile.metrics.trend === "flat" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
            {tile.metrics.trend === "decaying" && <TrendingDown className="h-3.5 w-3.5 text-amber-600" />}
            <span className="font-medium">{tile.metrics.ctr}% CTR</span>
            <span className="text-muted-foreground">· ${tile.metrics.cpa} CPA · {tile.metrics.impressions}</span>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px]">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{tile.predictedLift}</span>
            {tile.confidence && (
              <span className="text-muted-foreground">· {tile.confidence} confidence</span>
            )}
          </div>
        )}

        <p className="mt-1 truncate text-[10.5px] text-muted-foreground/80" title={tile.provenance}>
          {tile.provenance}
        </p>
      </div>

      {/* The decision — Authorize at tile scale */}
      {tile.status === "proposed" && (
        <div className="flex gap-1.5 px-3 pb-3">
          <button
            type="button"
            onClick={() => onDecide(tile.id, "approved")}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-foreground py-1.5 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => onDecide(tile.id, "rejected")}
            className="flex flex-1 items-center justify-center rounded-lg border border-border py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            Reject
          </button>
        </div>
      )}
      {tile.status === "approved" && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => onDecide(tile.id, "proposed")}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-[12px] font-medium text-emerald-700"
            title="Approved — flows into the next campaign build. Click to undo."
          >
            <Check className="h-3.5 w-3.5" />
            Approved — ready for the next build
          </button>
        </div>
      )}
      {tile.status === "rejected" && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => onDecide(tile.id, "proposed")}
            className="flex w-full items-center justify-center rounded-lg border border-border bg-muted py-1.5 text-[12px] font-medium text-muted-foreground"
            title="Rejected — signal for the next generation. Click to undo."
          >
            Rejected
          </button>
        </div>
      )}
    </div>
  );
}
