"use client";

import { useRef, useEffect } from "react";
import { X, Maximize2, ArrowLeftRight } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { AIMessage } from "./ai-message";
import { AIInput } from "./ai-input";

export function AIDockedPanel() {
  const { messages, sendMessage, expand, close, toggleDockSide } =
    useAICompanion();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <aside className="flex h-screen w-80 flex-col border-l bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <span className="text-sm font-semibold">AI Companion</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleDockSide}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Move to other side"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={expand}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Expand"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {messages.map((msg) => (
          <AIMessage key={msg.id} message={msg} />
        ))}
      </div>

      <div className="border-t px-4 py-3">
        <div className="rounded-lg border px-3 py-2">
          <AIInput onSend={sendMessage} />
        </div>
      </div>
    </aside>
  );
}
