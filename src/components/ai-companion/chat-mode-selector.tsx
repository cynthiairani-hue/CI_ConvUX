"use client";

import { useState, useRef, useEffect } from "react";
import { Check, SquareMenu } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import type { ChatMode } from "@/types/campaign";

const MODES: { id: ChatMode; label: string; subtitle: string }[] = [
  { id: "assisted", label: "Assisted", subtitle: "Step-by-step cards" },
  { id: "conversational", label: "Conversational", subtitle: "Describe in your own words" },
];

export function ChatModeSelector() {
  const { chatMode, setChatMode } = useAICompanion();
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

  const activeMode = MODES.find((m) => m.id === chatMode) || MODES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title={`Mode: ${activeMode.label}`}
      >
        <SquareMenu className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-[#E0E8F2] bg-white shadow-[0px_4px_12px_rgba(71,88,114,0.12)]">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setChatMode(mode.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#F7F9FB]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#394859]">{mode.label}</div>
                <div className="text-[11px] text-[#8492A6]">{mode.subtitle}</div>
              </div>
              {chatMode === mode.id && (
                <Check className="h-3.5 w-3.5 shrink-0 text-[#2C9FDD]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
