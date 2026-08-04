"use client";

/* ── Sticky note — the canvas's lightweight comment ──
   Draggable, edited in place, signed by the persona who wrote it. */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StickyNote } from "@/types/canvas";

export const NOTE_W = 200;
export const NOTE_EST_H = 150;

export function StickyNoteCard({ note, scale, onMove, onEdit, onRemove }: {
  note: StickyNote;
  scale: number;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the content — a sticky never hides its own lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [note.text]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, textarea")) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: note.x, oy: note.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* released */ }
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    onMove(note.id, drag.ox + (e.clientX - drag.startX) / scale, drag.oy + (e.clientY - drag.startY) / scale);
  }

  return (
    <div
      data-canvas-frame
      className={cn(
        "group absolute rounded-lg border border-amber-200 bg-amber-100 p-2.5 shadow-[0px_2px_8px_rgba(120,90,20,0.12)]",
        dragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{ left: note.x, top: note.y, width: NOTE_W, zIndex: 45 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => { dragRef.current = null; setDragging(false); }}
      onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
    >
      <button
        type="button"
        onClick={() => onRemove(note.id)}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-amber-700/60 opacity-0 transition-opacity hover:text-amber-900 group-hover:opacity-100"
        title="Delete note"
      >
        <X className="h-3 w-3" />
      </button>
      <textarea
        ref={taRef}
        value={note.text}
        onChange={(e) => onEdit(note.id, e.target.value)}
        placeholder="Type a note…"
        rows={2}
        className="w-full resize-none overflow-hidden bg-transparent text-[13px] leading-5 text-amber-950 outline-none placeholder:text-amber-700/50"
      />
      <p className="mt-1 text-[10px] font-medium text-amber-700/70">{note.author}</p>
    </div>
  );
}
