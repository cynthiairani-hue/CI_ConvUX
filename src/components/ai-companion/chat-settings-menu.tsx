"use client";

import { useState, useRef, useEffect } from "react";
import {
  Settings2,
  PanelLeft,
  PanelRight,
  Maximize2,
  Columns2,
  Check,
  PictureInPicture2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { useLayout } from "@/contexts/layout-context";
import type { AICompanionState } from "@/contexts/ai-companion-context";
import type { DetailLevel } from "@/types/campaign";

interface LayoutOption {
  id: AICompanionState | "docked-left" | "docked-right" | "floating";
  label: string;
  icon: React.ReactNode;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: "docked-left", label: "Sidebar left", icon: <PanelLeft className="h-3.5 w-3.5" /> },
  { id: "docked-right", label: "Sidebar right", icon: <PanelRight className="h-3.5 w-3.5" /> },
  { id: "floating", label: "Floating window", icon: <PictureInPicture2 className="h-3.5 w-3.5" /> },
  { id: "fullscreen", label: "Full screen", icon: <Maximize2 className="h-3.5 w-3.5" /> },
  { id: "split", label: "Split view", icon: <Columns2 className="h-3.5 w-3.5" /> },
];

const DETAIL_LEVELS: { id: DetailLevel; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "thinking", label: "Thinking" },
  { id: "verbose", label: "Verbose" },
  { id: "summary", label: "Summary" },
];

export function ChatSettingsMenu() {
  const { state, setState, dockSide, setDockSide, detailLevel, setDetailLevel } = useAICompanion();
  const { activeStrategy, activeNarrative, activeAudience } = useCampaign();
  const { collapseLeftRail } = useLayout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasPreview = !!(activeStrategy || activeNarrative || activeAudience);

  const currentLayout = state === "docked"
    ? dockSide === "left" ? "docked-left" : "docked-right"
    : state;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleLayoutChange(id: string) {
    if (id === "docked-left") {
      setDockSide("left");
      setState("docked");
      collapseLeftRail();
    } else if (id === "docked-right") {
      setDockSide("right");
      setState("docked");
      collapseLeftRail();
    } else if (id === "floating") {
      setState("floating");
    } else if (id === "split") {
      setState("split");
    } else if (id === "fullscreen") {
      setState("fullscreen");
    }
    setOpen(false);
  }

  function handlePersonalize() {
    setOpen(false);
    window.location.href = "/settings";
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
        <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border bg-background shadow-lg">
          {/* Layout */}
          <div className="p-1.5">
            <span className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
              Layout
            </span>
            {LAYOUT_OPTIONS
              .filter((opt) => opt.id !== "split" || hasPreview)
              .map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleLayoutChange(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                    currentLayout === opt.id
                      ? "bg-accent font-medium text-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <span className="text-muted-foreground">{opt.icon}</span>
                  {opt.label}
                  {currentLayout === opt.id && (
                    <Check className="ml-auto h-3.5 w-3.5 text-[#2C9FDD]" />
                  )}
                </button>
              ))}
          </div>

          <div className="border-t" />

          {/* Detail level */}
          <div className="p-1.5">
            <span className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
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
