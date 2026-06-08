"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import { X, Maximize2, ChevronUp } from "lucide-react";
import { useChatPagination } from "@/hooks/use-chat-pagination";
import { ChatScrollMinimap } from "./chat-scroll-minimap";
import { cn } from "@/lib/utils";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { AIMessage } from "./ai-message";
import { AIInput } from "./ai-input";
import { ChatChoices } from "./chat-choices";
import { AdvertiserSetupForm } from "./advertiser-setup-form";
import { KeywordChipSelector } from "./keyword-chip-selector";
import { ChatSettingsMenu } from "./chat-settings-menu";
import { ChatHeaderMenu } from "./chat-header-menu";
import { PlatformConnectionCard } from "./platform-connection-card";
import { ArtifactPreviewCard } from "./artifact-preview-card";

export function AIDockedPanel({ side = "right", width }: { side?: "left" | "right"; width?: number }) {
  const {
    messages, isLoading, sendMessage, submitChoice, skipChoice,
    submitAdvertiserSetup, submitKeywords, submitPlatformConnection, expand, close,
  } = useAICompanion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { visibleMessages, hasEarlier, loadEarlier, earlierCount } = useChatPagination(messages);

  const handleLoadEarlier = useCallback(() => {
    const el = scrollRef.current;
    if (!el) { loadEarlier(); return; }
    const prevHeight = el.scrollHeight;
    const prevTop = el.scrollTop;
    loadEarlier();
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight + prevTop;
      }
    });
  }, [loadEarlier]);

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
          onCustomValue={(val) => submitChoice(activeToolCall.id, tc.field, [val])}
          onSkip={() => skipChoice(activeToolCall.id, tc.field)}
        />
      );
    }

    return null;
  }

  return (
    <aside
      className={cn("flex h-screen flex-col bg-background", side === "left" ? "border-r" : "border-l")}
      style={{ width: width ? `${width}px` : "320px", minWidth: 280, maxWidth: 640, flexShrink: 0 }}
    >
      <header className="flex h-14 items-center justify-between px-4">
        <ChatHeaderMenu compact />
        <div className="flex items-center gap-0.5">
          <ChatSettingsMenu />
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

      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto py-4">
          {hasEarlier && (
            <div className="flex justify-center pb-3">
              <button
                type="button"
                onClick={handleLoadEarlier}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronUp className="h-3 w-3" />
                Load {earlierCount} earlier
              </button>
            </div>
          )}
          {visibleMessages.map((msg) => (
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
        <ChatScrollMinimap messages={visibleMessages} scrollRef={scrollRef} />
      </div>

      <div className="px-4 py-3 space-y-3">
        {activeToolCall?.toolCall && renderToolCall()}
        <ArtifactPreviewCard />
        <div className="rounded-lg border px-3 py-2">
          <AIInput onSend={sendMessage} />
        </div>
      </div>
    </aside>
  );
}
