"use client";

import { useState, useRef, useEffect } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import type { DetailLevel } from "@/types/campaign";

const LEVELS: { id: DetailLevel; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "thinking", label: "Thinking" },
  { id: "verbose", label: "Verbose" },
  { id: "summary", label: "Summary" },
];

export function ChatModeSelector() {
  const { detailLevel, setDetailLevel } = useAICompanion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title={`Detail: ${LEVELS.find((l) => l.id === detailLevel)?.label}`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-[#E0E8F2] bg-white shadow-[0px_4px_12px_rgba(71,88,114,0.12)]">
          <div className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
            Response detail
          </div>
          {LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => {
                setDetailLevel(level.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-[#F7F9FB]"
            >
              <span className="text-[13px] text-[#394859]">{level.label}</span>
              {detailLevel === level.id && (
                <Check className="h-3.5 w-3.5 shrink-0 text-[#2C9FDD]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
