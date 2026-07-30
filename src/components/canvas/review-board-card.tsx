"use client";

/* ── Client review board header card ──
   Anchors an assembled review on the canvas. Lists what's on the board and
   carries the converging action: Share with client (real mechanism — the
   media plan becomes visible in the client persona's portal). */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Presentation, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewBoardCard as ReviewBoardCardType } from "@/types/canvas";

export const BOARD_W = 320;
export const BOARD_EST_H = 260;

export function ReviewBoardHeaderCard({
  board,
  scale,
  onMove,
  onShare,
  onDelete,
  onAsk,
}: {
  board: ReviewBoardCardType;
  scale: number;
  onMove: (id: string, x: number, y: number) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onAsk: (board: ReviewBoardCardType) => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const shared = board.status === "shared";

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: board.x, oy: board.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    onMove(board.id, drag.ox + (e.clientX - drag.startX) / scale, drag.oy + (e.clientY - drag.startY) / scale);
  }

  function onPointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div
      data-canvas-frame
      data-board-id={board.id}
      className={cn(
        "absolute select-none rounded-xl border border-border bg-foreground text-background shadow-[0px_2px_16px_rgba(71,88,114,0.18)]",
        dragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{ left: board.x, top: board.y, width: BOARD_W, zIndex: 40 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <Presentation className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">Client review</span>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAsk(board)}
            className="flex h-6 w-6 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100"
            title="Ask the AI about this review"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(board.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100"
            title="Remove review board (artifacts stay on the canvas)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      <div className="px-3.5 pb-1 pt-1.5">
        <p className="text-[14px] font-medium leading-5">{board.name}</p>
        <p className="mt-0.5 text-[11px] opacity-60">
          {new Date(board.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })} review
        </p>
      </div>

      <div className="px-3.5 pb-2.5 pt-1">
        {board.included.map((item) => (
          <div key={item} className="flex items-center gap-1.5 py-0.5 text-[12px] opacity-80">
            <Check className="h-3 w-3 shrink-0" />
            {item}
          </div>
        ))}
      </div>

      <div className="px-3.5 pb-3.5">
        {shared ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-background/15 py-1.5 text-[12px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Shared with Jordan Reyes (client)
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onShare(board.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-background py-1.5 text-[12px] font-medium text-foreground transition-opacity hover:opacity-90"
          >
            <Send className="h-3.5 w-3.5" />
            Share with client
          </button>
        )}
      </div>
    </div>
  );
}
