"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { usePersona } from "@/contexts/persona-context";
import { starterPrompts } from "@/data/starter-prompts";
import { StarterPromptButton } from "./starter-prompt-button";
import { cn } from "@/lib/utils";

export function CanvasChatInput() {
  const { openFullscreen } = useAICompanion();
  const { activePersona } = usePersona();
  const [value, setValue] = useState("");

  const prompts = starterPrompts[activePersona.id];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    openFullscreen(trimmed);
    setValue("");
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <form
        onSubmit={handleSubmit}
        className="ai-glow-border flex items-center gap-3 rounded-xl bg-background px-4 py-3"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
            value.trim()
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-muted text-muted-foreground"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>

      {/* Starter prompts hidden — focus on setup CTAs first */}
    </div>
  );
}
