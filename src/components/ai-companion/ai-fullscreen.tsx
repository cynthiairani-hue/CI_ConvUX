"use client";

import { useRef, useEffect, useMemo } from "react";
import { X, Minimize2 } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { AIMessage } from "./ai-message";
import { AIInput } from "./ai-input";
import { ChatChoices } from "./chat-choices";

export function AIFullscreen() {
  const { messages, sendMessage, submitChoice, minimize, close } =
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
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-6">
        <span className="text-sm font-semibold">AI Companion</span>
        <div className="flex items-center gap-1">
          <button
            onClick={minimize}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Dock to side"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl py-6">
          {messages.map((msg) => (
            <AIMessage key={msg.id} message={msg} />
          ))}
        </div>
      </div>

      <div>
        <div className="mx-auto max-w-2xl px-4 py-4">
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
            <div className="rounded-xl border px-4 py-3">
              <AIInput onSend={sendMessage} autoFocus />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
