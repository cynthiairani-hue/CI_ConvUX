"use client";

import { useRef, useEffect, useMemo } from "react";
import { X, Maximize2, ArrowLeftRight } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { AIMessage } from "./ai-message";
import { AIInput } from "./ai-input";
import { ChatChoices } from "./chat-choices";

export function AIDockedPanel() {
  const { messages, isLoading, sendMessage, submitChoice, expand, close, toggleDockSide } =
    useAICompanion();
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeToolCall = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].toolCall) return messages[i];
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <aside className="flex h-screen w-80 flex-col border-l bg-background">
      <header className="flex h-14 items-center justify-between px-4">
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
        {isLoading && (
          <div className="px-4 py-3">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        {activeToolCall?.toolCall ? (
          <ChatChoices
            key={activeToolCall.id}
            question={activeToolCall.toolCall.question}
            subtitle={activeToolCall.toolCall.subtitle}
            step={activeToolCall.toolCall.step}
            totalSteps={activeToolCall.toolCall.totalSteps}
            options={activeToolCall.toolCall.options}
            multiSelect={activeToolCall.toolCall.multiSelect}
            onSubmit={(selected) =>
              submitChoice(
                activeToolCall.id,
                activeToolCall.toolCall!.field,
                selected
              )
            }
            onFreeText={(text) => sendMessage(text)}
          />
        ) : (
          <div className="rounded-lg border px-3 py-2">
            <AIInput onSend={sendMessage} />
          </div>
        )}
      </div>
    </aside>
  );
}
