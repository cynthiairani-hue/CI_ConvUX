"use client";

import { useRef, useEffect, useMemo } from "react";
import { X, Maximize2, ChevronDown } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { AIMessage } from "./ai-message";
import { AIInput } from "./ai-input";
import { ChatChoices } from "./chat-choices";
import { AdvertiserSetupForm } from "./advertiser-setup-form";
import { KeywordChipSelector } from "./keyword-chip-selector";
import { ChatModeSelector } from "./chat-mode-selector";
import { PlatformConnectionCard } from "./platform-connection-card";

export function AISplitPanel({ width }: { width?: number }) {
  const {
    messages, isLoading, sendMessage, submitChoice, skipChoice,
    submitAdvertiserSetup, submitKeywords, submitPlatformConnection, expand, close,
    currentSessionId, chatSessions,
  } = useAICompanion();
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionName = useMemo(() => {
    if (currentSessionId) {
      const meta = chatSessions.find((s) => s.id === currentSessionId);
      if (meta?.name) return meta.name;
    }
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser?.content) {
      const trimmed = firstUser.content.trim();
      return trimmed.length <= 24 ? trimmed : trimmed.slice(0, 22) + "…";
    }
    return "New conversation";
  }, [currentSessionId, chatSessions, messages]);

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

  function renderToolCall() {
    if (!activeToolCall?.toolCall) return null;
    const tc = activeToolCall.toolCall;

    if (tc.type === "advertiser-setup") {
      return (
        <AdvertiserSetupForm
          key={activeToolCall.id}
          question={tc.question}
          step={tc.step}
          totalSteps={tc.totalSteps}
          onSubmit={(data) => submitAdvertiserSetup(activeToolCall.id, data)}
          onSkip={() => skipChoice(activeToolCall.id, tc.field)}
        />
      );
    }

    if (tc.type === "keywords") {
      return (
        <KeywordChipSelector
          key={activeToolCall.id}
          question={tc.question}
          step={tc.step}
          totalSteps={tc.totalSteps}
          keywords={tc.keywords}
          onSubmit={(selectedIds, allKeywords) =>
            submitKeywords(activeToolCall.id, selectedIds, allKeywords)
          }
          onSkip={() => skipChoice(activeToolCall.id, tc.field)}
        />
      );
    }

    if (tc.type === "platform-connect") {
      return (
        <PlatformConnectionCard
          key={activeToolCall.id}
          platformIds={tc.platformIds}
          onDone={(connectedIds) =>
            submitPlatformConnection(activeToolCall.id, connectedIds, tc.intentTag)
          }
        />
      );
    }

    if (tc.type === "choices") {
      return (
        <ChatChoices
          key={activeToolCall.id}
          question={tc.question}
          subtitle={tc.subtitle}
          step={tc.step}
          totalSteps={tc.totalSteps}
          options={tc.options}
          multiSelect={tc.multiSelect}
          onSubmit={(selected) =>
            submitChoice(activeToolCall.id, tc.field, selected)
          }
          onFreeText={(text) => sendMessage(text)}
          onSkip={() => skipChoice(activeToolCall.id, tc.field)}
        />
      );
    }

    return null;
  }

  return (
    <aside
      className="flex h-screen flex-col border-r bg-background"
      style={{ width: width ? `${width}px` : undefined, minWidth: 320, maxWidth: 640, flexShrink: 0 }}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <button
          onClick={expand}
          className="flex items-center gap-1 min-w-0 rounded-md px-1 py-0.5 transition-colors hover:bg-accent"
          title="Expand to manage conversation"
        >
          <span className="text-sm font-semibold text-foreground truncate">
            {sessionName}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-0.5">
          <ChatModeSelector />
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

      <div className="px-4 py-3 space-y-3">
        {activeToolCall?.toolCall && renderToolCall()}
        <div className="rounded-lg border px-3 py-2">
          <AIInput onSend={sendMessage} />
        </div>
      </div>
    </aside>
  );
}
