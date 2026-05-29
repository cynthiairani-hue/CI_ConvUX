"use client";

import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAICompanion } from "@/contexts/ai-companion-context";
import type { AICompanionState } from "@/contexts/ai-companion-context";

/**
 * Custom SVG icons for the layout picker.
 * Each icon is a small rectangle representing the viewport,
 * with the active region filled to indicate where the chat lives.
 */

function FullscreenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function SplitLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="1.5" y="2.5" width="5.5" height="11" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function SplitRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="9" y="2.5" width="5.5" height="11" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function FloatingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="8" y="7" width="5.5" height="5.5" rx="1" fill="currentColor" />
    </svg>
  );
}

type LayoutId = "fullscreen" | "split-left" | "split-right" | "floating";

interface LayoutOption {
  id: LayoutId;
  label: string;
  icon: React.ReactNode;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: "fullscreen", label: "Full screen", icon: <FullscreenIcon className="h-4 w-4" /> },
  { id: "split-left", label: "Sidebar left", icon: <SplitLeftIcon className="h-4 w-4" /> },
  { id: "split-right", label: "Sidebar right", icon: <SplitRightIcon className="h-4 w-4" /> },
  { id: "floating", label: "Floating", icon: <FloatingIcon className="h-4 w-4" /> },
];

function getCurrentLayoutId(state: AICompanionState, dockSide: string): LayoutId {
  if (state === "fullscreen") return "fullscreen";
  if (state === "floating") return "floating";
  if (state === "split") return dockSide === "right" ? "split-right" : "split-left";
  return "fullscreen"; // fallback
}

function getIconForLayout(id: LayoutId) {
  const opt = LAYOUT_OPTIONS.find((o) => o.id === id);
  return opt?.icon ?? <FullscreenIcon className="h-4 w-4" />;
}

export function ChatLayoutPicker() {
  const { state, setState, setEntryLayout, dockSide, setDockSide } = useAICompanion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentId = getCurrentLayoutId(state, dockSide);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelect(id: LayoutId) {
    // Picking a layout here is an EXPLICIT choice — record it as the default
    // the chat opens in from any input bar (setEntryLayout). Automatic splits
    // elsewhere never call setEntryLayout, so they can't change this default.
    if (id === "fullscreen") {
      setState("fullscreen");
      setEntryLayout("fullscreen");
    } else if (id === "split-left") {
      setDockSide("left");
      setState("split");
      setEntryLayout("split");
    } else if (id === "split-right") {
      setDockSide("right");
      setState("split");
      setEntryLayout("split");
    } else if (id === "floating") {
      setState("floating");
      setEntryLayout("floating");
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Change layout"
      >
        {getIconForLayout(currentId)}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border bg-background shadow-lg p-1.5">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                currentId === opt.id
                  ? "bg-accent font-medium text-foreground"
                  : "text-foreground hover:bg-accent"
              )}
            >
              <span className="text-muted-foreground">{opt.icon}</span>
              {opt.label}
              {currentId === opt.id && (
                <Check className="ml-auto h-3.5 w-3.5 text-[#2C9FDD]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
