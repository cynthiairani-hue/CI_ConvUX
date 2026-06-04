"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function fmt(d: Date): string { return `${MON[d.getMonth()]} ${d.getDate()}`; }
function key(d: Date): number { return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); }
function sameDay(a: Date, b: Date): boolean { return key(a) === key(b); }

interface DateRangePickerProps {
  /** Display string e.g. "Jun 1 – Aug 31". Empty when unset. */
  value: string;
  onChange: (display: string) => void;
  /** Placeholder when empty (e.g. the plan flight). */
  placeholder?: string;
  /** Preset ranges shown as quick chips. */
  presets?: { label: string; range: () => [Date, Date] }[];
  bordered?: boolean;
}

/**
 * Lightweight date-RANGE calendar (start → end in one popover) with presets.
 * Dependency-free month grid; anchored popover + click-outside.
 */
export function DateRangePicker({ value, onChange, placeholder = "Set flight dates", presets, bordered = false }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(d: Date) {
    if (!start || (start && end)) { setStart(d); setEnd(null); setHover(null); return; }
    // start set, end not
    if (key(d) < key(start)) { setStart(d); return; }
    setEnd(d);
    onChange(`${fmt(start)} – ${fmt(d)}`);
    setOpen(false);
  }

  function applyPreset(range: [Date, Date]) {
    setStart(range[0]); setEnd(range[1]);
    onChange(`${fmt(range[0])} – ${fmt(range[1])}`);
    setOpen(false);
  }

  // Build the month grid
  const first = new Date(view.y, view.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.y, view.m, d));

  const rangeEnd = end || hover;
  function inRange(d: Date): boolean {
    if (!start || !rangeEnd) return false;
    const lo = Math.min(key(start), key(rangeEnd));
    const hi = Math.max(key(start), key(rangeEnd));
    return key(d) >= lo && key(d) <= hi;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[12px] transition-colors hover:border-border focus:border-[#2C9FDD] focus:outline-none",
          bordered ? "border-border bg-white" : "border-transparent",
          open && "border-[#2C9FDD]"
        )}
      >
        <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className={cn("flex-1 truncate", value ? "text-foreground" : "text-muted-foreground/55")}>
          {value || placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-[268px] overflow-hidden rounded-xl border border-border bg-white p-2.5 shadow-[0px_8px_24px_rgba(71,88,114,0.16)]">
          {presets && presets.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 border-b border-border pb-2.5">
              {presets.map((p) => (
                <button key={p.label} type="button" onClick={() => applyPreset(p.range())} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent">
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="mb-1.5 flex items-center justify-between px-1">
            <button type="button" onClick={() => setView((v) => { const m = v.m - 1; return m < 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m }; })} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[12px] font-semibold text-foreground">{MONTHS[view.m]} {view.y}</span>
            <button type="button" onClick={() => setView((v) => { const m = v.m + 1; return m > 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m }; })} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {DOW.map((d, i) => <div key={i} className="py-1 text-center text-[10px] font-medium text-muted-foreground/60">{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const isStart = start && sameDay(d, start);
              const isEnd = end && sameDay(d, end);
              const inR = inRange(d);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(d)}
                  onMouseEnter={() => { if (start && !end) setHover(d); }}
                  className={cn(
                    "mx-auto flex h-7 w-8 items-center justify-center text-[12px] transition-colors",
                    inR && !isStart && !isEnd && "bg-[#EBF5FB] text-foreground",
                    (isStart || isEnd) ? "rounded-md bg-[#2C9FDD] font-medium text-white" : "rounded-md text-foreground hover:bg-muted"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-[10px] text-muted-foreground">
            {start && !end ? "Pick the end date" : "Pick the start date"}
          </p>
        </div>
      )}
    </div>
  );
}
