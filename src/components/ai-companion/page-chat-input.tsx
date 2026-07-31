"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, Mic, SlidersHorizontal, Check, Zap, ListChecks, Lightbulb, Search, Plus, Upload, Plug, Wand2, Bot, Database, Sparkles } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { cn } from "@/lib/utils";
import { GradientBorder } from "@/components/ui/gradient-border";
import { getPagePrompts, filterPagePrompts, type PageContext, type PagePrompt } from "@/data/suggested-prompts";
import { usePersona } from "@/contexts/persona-context";
import { useBrand } from "@/data/brand-profiles";
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

function PageToolsPopover() {
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

  // Real action or honest "coming soon" — never a silent no-op. Sources/Plugins
  // open Connectors (/settings, MCP-style); Upload opens the chat where files
  // attach; Skills/Agents aren't built yet.
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

function PageModePopover() {
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

/** Derive the page context from the current pathname */
function getPageContext(pathname: string): PageContext | null {
  if (pathname.includes("/campaigns")) return "campaigns";
  if (pathname.includes("/audiences")) return "audiences";
  if (pathname.includes("/reports")) return "reports";
  if (pathname.includes("/approvals")) return "approvals";
  if (pathname.includes("/settings")) return "settings";
  return null;
}

function PagePromptDropdown({
  prompts,
  onSelect,
  isFiltered,
}: {
  prompts: PagePrompt[];
  onSelect: (label: string) => void;
  isFiltered: boolean;
}) {
  if (prompts.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-border bg-white shadow-[0px_4px_16px_rgba(71,88,114,0.12)]">
      {!isFiltered && (
        <div className="px-4 pt-3 pb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Suggested
          </div>
        </div>
      )}
      <div className={isFiltered ? "py-1.5" : "px-2 pb-2"}>
        {isFiltered ? (
          // Autocomplete list — vertical items
          prompts.slice(0, 5).map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(p.label);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-accent"
            >
              <Sparkles className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span>{p.label}</span>
            </button>
          ))
        ) : (
          // Focus state — pill chips
          <div className="flex flex-wrap gap-1.5 px-2 pb-1">
            {prompts.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(p.label);
                }}
                className="rounded-full border border-border px-3 py-1 text-[12px] text-foreground transition-colors hover:border-[#2C9FDD] hover:bg-[#EBF5FB] hover:text-[#1A7BB5]"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageChatInput({ placeholder, openIn }: { placeholder?: string; openIn?: "floating-left" }) {
  const { openFullscreen, state } = useAICompanion();

  /* Canvas asks: intents open a floating window docked left by default, so
     the board stays visible. Only the DEFAULT changes — a user's explicit
     layout choice (ChatLayoutPicker) always wins, and they can drag/resize. */
  function openWithLayout(text: string) {
    if (openIn === "floating-left") {
      try {
        if (!localStorage.getItem("fuseiq-floating-panel")) {
          localStorage.setItem("fuseiq-floating-panel", JSON.stringify({ x: 96, y: 88, width: 380, height: 520 }));
        }
      } catch { /* storage unavailable — panel falls back to its own default */ }
      openFullscreen(text, { defaultLayout: "floating" });
    } else {
      openFullscreen(text);
    }
  }
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, hasSpeechAPI, toggleVoice } = useVoiceInput(value, setValue);
  const pathname = usePathname();
  const pageContext = getPageContext(pathname);
  const { activePersona } = usePersona();
  const brand = useBrand();
  const promptOpts = { isAgency: activePersona.vertical === "agency", clientName: brand?.name };

  // Compute prompts: all on focus (empty), filtered on typing — persona/client aware
  const trimmed = value.trim();
  const showDropdown = isFocused && pageContext !== null;
  const filteredPrompts = pageContext
    ? trimmed
      ? filterPagePrompts(pageContext, trimmed, promptOpts)
      : getPagePrompts(pageContext, promptOpts)
    : [];
  const isFiltered = trimmed.length > 0;

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
    const t = value.trim();
    if (!t) return;
    openWithLayout(t);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSelectPrompt(text: string) {
    openWithLayout(text);
    setIsFocused(false);
    setValue("");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-8">
      <div className="relative">
        {showDropdown && filteredPrompts.length > 0 && (
          <PagePromptDropdown
            prompts={filteredPrompts}
            onSelect={handleSelectPrompt}
            isFiltered={isFiltered}
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
                  <PageToolsPopover />
                  <PageModePopover />
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
    </div>
  );
}
