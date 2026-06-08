"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Mic, SlidersHorizontal, Check, Zap, ListChecks, Lightbulb, Search, Plus, Upload, Plug, Wand2, Bot, Database } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { cn } from "@/lib/utils";
import { GradientBorder } from "@/components/ui/gradient-border";
import { ChatInputDropdown } from "./chat-input-dropdown";
import type { ChatMode } from "@/types/campaign";

const MODE_OPTIONS: { id: ChatMode; label: string; description: string; icon: React.ReactNode }[] = [
  { id: "express", label: "Express", description: "Build it fast with smart defaults", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "plan", label: "Plan", description: "Walk through targeting, budget, and creative", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { id: "advise", label: "Advise", description: "Recommendations backed by evidence", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { id: "research", label: "Research", description: "Pull data and surface performance insights", icon: <Search className="h-3.5 w-3.5" /> },
];

const TOOL_OPTIONS = [
  { id: "sources", label: "Sources", description: "Connect data sources", icon: <Database className="h-3.5 w-3.5" /> },
  { id: "upload", label: "Upload", description: "Attach files and assets", icon: <Upload className="h-3.5 w-3.5" /> },
  { id: "plugins", label: "Plugins", description: "Third-party integrations", icon: <Plug className="h-3.5 w-3.5" /> },
  { id: "skills", label: "Skills", description: "Specialized AI capabilities", icon: <Wand2 className="h-3.5 w-3.5" /> },
  { id: "agents", label: "Agents", description: "Autonomous task runners", icon: <Bot className="h-3.5 w-3.5" /> },
];

function CanvasToolsPopover() {
  const router = useRouter();
  const { showToast } = useCampaign();
  const { openFullscreen } = useAICompanion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Every entry does something real or says so — no silent no-ops. Sources/Plugins
  // open Connectors (the built /settings page, MCP-style); Upload opens the chat
  // where files attach; Skills/Agents aren't built yet, so they say "coming soon".
  function handleTool(id: string, label: string) {
    setOpen(false);
    if (id === "sources" || id === "plugins") { router.push("/settings"); return; }
    if (id === "upload") { openFullscreen(); return; }
    showToast(`${label} — coming soon`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Tools"
      >
        <Plus className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 w-56 rounded-xl border bg-background shadow-lg">
          <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Tools
          </div>
          {TOOL_OPTIONS.map((tool) => {
            const soon = tool.id === "skills" || tool.id === "agents";
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleTool(tool.id, tool.label)}
                className={cn("flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent", soon && "opacity-60")}
              >
                <span className="text-muted-foreground">{tool.icon}</span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-foreground">{tool.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{tool.description}</span>
                </div>
                {soon && <span className="text-[10px] text-muted-foreground">Soon</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CanvasModePopover() {
  const { chatMode, setChatMode } = useAICompanion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const current = MODE_OPTIONS.find((m) => m.id === chatMode) || MODE_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="AI mode"
      >
        <SlidersHorizontal className="h-[18px] w-[18px]" />
        <span className="text-[13px] font-medium">{current.label}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 w-56 rounded-xl border bg-background shadow-lg">
          <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Mode
          </div>
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => { setChatMode(mode.id); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-accent",
                chatMode === mode.id && "bg-accent"
              )}
            >
              <span className="text-muted-foreground">{mode.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-foreground">{mode.label}</span>
                <span className="block text-[11px] text-muted-foreground">{mode.description}</span>
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

export function CanvasChatInput({ placeholder }: { placeholder?: string }) {
  const { openFullscreen, openPlanContext, state } = useAICompanion();
  const { loadStrategy, savedMediaPlans } = useCampaign();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, hasSpeechAPI, toggleVoice } = useVoiceInput(value, setValue);

  // Show on focus — empty shows the full dropdown; typing shows type-ahead autocomplete.
  const showDropdown = isFocused;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxH = 120;
    ta.style.height = `${Math.min(ta.scrollHeight, maxH)}px`;
    ta.style.overflowY = ta.scrollHeight > maxH ? "auto" : "hidden";
  }, [value]);

  // Hide when a chat panel is already visible (floating or split)
  if (state === "floating" || state === "split") return null;

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    openFullscreen(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSelectPrompt(text: string) {
    openFullscreen(text);
    setIsFocused(false);
  }

  function handleSelectStrategy(id: string) {
    loadStrategy(id);
    setIsFocused(false);
  }

  function handleSelectMediaPlan(id: string) {
    const plan = savedMediaPlans.find((p) => p.id === id);
    if (plan) openPlanContext(plan);
    setIsFocused(false);
  }

  return (
    <div className="relative w-full">
      {showDropdown && (
        <ChatInputDropdown
          onSelectPrompt={handleSelectPrompt}
          onSelectStrategy={handleSelectStrategy}
          onSelectMediaPlan={handleSelectMediaPlan}
          query={value}
        />
      )}
      <GradientBorder className="rounded-2xl bg-white shadow-sm">
        <div className="px-5 pt-4 pb-3">
          <form onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Ask about performance, campaigns, or optimization ideas..."}
              rows={1}
              className="w-full resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-muted-foreground/70"
              style={{ minHeight: "24px", maxHeight: "120px" }}
            />
            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-center">
                <CanvasToolsPopover />
                <CanvasModePopover />
              </div>
              <div className="flex items-center gap-0.5">
                {hasSpeechAPI && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isListening
                        ? "bg-red-50 text-red-500 hover:bg-red-100"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    <Mic className="h-[18px] w-[18px]" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!value.trim()}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    value.trim()
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <ArrowUp className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </GradientBorder>
    </div>
  );
}
