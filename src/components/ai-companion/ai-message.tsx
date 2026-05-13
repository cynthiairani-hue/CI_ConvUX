"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/contexts/ai-companion-context";

export function AIMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser && "flex-row-reverse"
      )}
    >
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/5">
          <Sparkles className="h-3.5 w-3.5 text-foreground/70" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] text-sm leading-relaxed",
          isUser
            ? "rounded-2xl rounded-tr-sm bg-foreground px-4 py-2.5 text-background"
            : "text-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
