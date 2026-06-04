"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Search, Check, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickerOption {
  id: string;
  label: string;
  /** Secondary line (size, source, freshness…) shown muted under the label. */
  meta?: string;
  /** Small dot color for readiness/status, e.g. "bg-emerald-500". */
  dot?: string;
  /** Optional group header the option falls under. */
  group?: string;
}

export interface PickerFooterAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

interface SearchPickerProps {
  options: PickerOption[];
  /** Selected option id(s). string for single, string[] for multi. */
  value: string | string[];
  multi?: boolean;
  onChange: (next: string | string[]) => void;
  placeholder?: string;        // trigger text when empty
  searchPlaceholder?: string;
  /** Enter on a non-matching query creates a new value (keywords). */
  allowCreate?: boolean;
  footerActions?: PickerFooterAction[];
  /** Render the trigger yourself; defaults to a cell-style button. */
  trigger?: (open: boolean) => ReactNode;
  align?: "left" | "right";
  /** Bordered (form/detail panel) vs borderless (inline table cell). */
  bordered?: boolean;
}

/**
 * One search-picker primitive (cmd+k feel) reused for audience, geo, keywords,
 * placement. Search at top, keyboard nav, optional create, footer escape hatch.
 * Dependency-free: anchored popover + click-outside, matching the app's other
 * popovers (CardOverflowMenu / ToolsPopover).
 */
export function SearchPicker({
  options,
  value,
  multi = false,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  allowCreate = false,
  footerActions,
  trigger,
  align = "left",
  bordered = false,
}: SearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = Array.isArray(value) ? value : value ? [value] : [];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open) { setQuery(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = options.filter((o) => !q || o.label.toLowerCase().includes(q) || o.meta?.toLowerCase().includes(q));
  const exactExists = options.some((o) => o.label.toLowerCase() === q);
  const showCreate = allowCreate && q.length > 0 && !exactExists;

  function commit(id: string) {
    if (multi) {
      const set = new Set(selected);
      if (set.has(id)) set.delete(id); else set.add(id);
      onChange(Array.from(set));
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
    } else {
      onChange(id);
      setOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const max = filtered.length + (showCreate ? 1 : 0);
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, max - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active < filtered.length) commit(filtered[active].id);
      else if (showCreate) commit(query.trim());
    } else if (e.key === "Escape") { setOpen(false); }
  }

  // Default trigger: a cell-style button showing selected labels.
  const selectedLabels = selected
    .map((id) => options.find((o) => o.id === id)?.label ?? id)
    .filter(Boolean);

  return (
    <div className="relative" ref={ref}>
      {trigger ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="block w-full text-left">
          {trigger(open)}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[12px] transition-colors hover:border-border focus:border-[#2C9FDD] focus:outline-none",
            bordered ? "border-border bg-white" : "border-transparent",
            open && "border-[#2C9FDD]"
          )}
        >
          {selectedLabels.length > 0 ? (
            multi ? (
              <span className="flex flex-1 flex-wrap gap-1">
                {selectedLabels.slice(0, 3).map((l, i) => (
                  <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">{l}</span>
                ))}
                {selectedLabels.length > 3 && <span className="px-1 py-0.5 text-[11px] text-muted-foreground">+{selectedLabels.length - 3}</span>}
              </span>
            ) : (
              <span className="flex-1 truncate text-foreground">{selectedLabels[0]}</span>
            )
          ) : (
            <span className="flex-1 truncate text-muted-foreground/55">{placeholder}</span>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/50" />
        </button>
      )}

      {open && (
        <div className={cn("absolute z-50 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-white shadow-[0px_8px_24px_rgba(71,88,114,0.16)]", align === "right" ? "right-0" : "left-0")}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/55"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreate && (
              <div className="px-3 py-3 text-center text-[12px] text-muted-foreground">No matches</div>
            )}
            {filtered.map((o, i) => {
              const isSel = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(o.id)}
                  className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors", i === active && "bg-accent")}
                >
                  {o.dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", o.dot)} />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">{o.label}</span>
                    {o.meta && <span className="block truncate text-[11px] text-muted-foreground">{o.meta}</span>}
                  </span>
                  {isSel && <Check className="h-3.5 w-3.5 shrink-0 text-[#1A7BB5]" />}
                </button>
              );
            })}
            {showCreate && (
              <button
                type="button"
                onMouseEnter={() => setActive(filtered.length)}
                onClick={() => commit(query.trim())}
                className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors", active === filtered.length && "bg-accent")}
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-[#1A7BB5]" />
                <span className="text-[13px] text-foreground">Add “{query.trim()}”</span>
              </button>
            )}
          </div>
          {footerActions && footerActions.length > 0 && (
            <div className="border-t border-border py-1">
              {footerActions.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { a.onClick(); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-medium text-[#1A7BB5] transition-colors hover:bg-[#EBF5FB]"
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
