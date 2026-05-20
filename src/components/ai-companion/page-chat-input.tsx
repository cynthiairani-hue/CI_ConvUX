"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { cn } from "@/lib/utils";
import { GradientBorder } from "@/components/ui/gradient-border";

export function PageChatInput() {
  const { openFullscreen } = useAICompanion();
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    openFullscreen(trimmed);
    setValue("");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8">
      <GradientBorder className="rounded-xl bg-white">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 px-4 py-3"
        >
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
      </GradientBorder>
    </div>
  );
}
