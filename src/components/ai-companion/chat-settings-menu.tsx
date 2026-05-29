"use client";

import { useState, useRef, useEffect } from "react";
import { Settings2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAICompanion } from "@/contexts/ai-companion-context";
import type { DetailLevel } from "@/types/campaign";

const DETAIL_LEVELS: { id: DetailLevel; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "thinking", label: "Thinking" },
  { id: "verbose", label: "Verbose" },
  { id: "summary", label: "Summary" },
];

export function ChatSettingsMenu() {
  const { detailLevel, setDetailLevel, openFullscreen } = useAICompanion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handlePersonalize() {
    setOpen(false);
    openFullscreen("Help me personalize my FuseIQ experience — update my brand profile, preferences, and connected platforms");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Chat settings"
      >
        <Settings2 className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border bg-background shadow-lg">
          {/* Detail level */}
          <div className="p-1.5">
            <span className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Response detail
            </span>
            {DETAIL_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => { setDetailLevel(level.id); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                  detailLevel === level.id
                    ? "bg-accent font-medium text-foreground"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {level.label}
                {detailLevel === level.id && (
                  <Check className="ml-auto h-3.5 w-3.5 text-[#2C9FDD]" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t" />

          {/* Personalize */}
          <div className="p-1.5">
            <button
              onClick={handlePersonalize}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
            >
              Personalize
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
