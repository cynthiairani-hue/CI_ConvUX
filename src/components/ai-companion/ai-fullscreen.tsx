"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { X, Minimize2, Plus, PanelRight, ChevronDown, Pencil, Trash2, Archive } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { AIMessage } from "./ai-message";
import { AIInput } from "./ai-input";
import { ChatChoices } from "./chat-choices";
import { AdvertiserSetupForm } from "./advertiser-setup-form";
import { KeywordChipSelector } from "./keyword-chip-selector";
import { ChatModeSelector } from "./chat-mode-selector";
import { PlatformConnectionCard } from "./platform-connection-card";
import { ArtifactPreviewCard } from "./artifact-preview-card";
import { cn } from "@/lib/utils";

function SessionMenu({
  sessionId,
  sessionName,
  onRename,
  onArchive,
  onDelete,
  onNewChat,
}: {
  sessionId: string | null;
  sessionName: string;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(sessionName);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-accent"
      >
        <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
          {sessionName}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border bg-background py-1 shadow-lg">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (sessionId && editValue.trim()) {
                  onRename(sessionId, editValue.trim());
                }
                setEditing(false);
                setOpen(false);
              }}
              className="px-3 py-2"
            >
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditing(false);
                    setEditValue(sessionName);
                  }
                }}
                className="w-full rounded border px-2 py-1 text-sm outline-none focus:border-[#2C9FDD]"
              />
              <div className="mt-1.5 flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => { setEditing(false); setEditValue(sessionName); }}
                  className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-foreground px-2 py-0.5 text-[11px] text-background"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                onClick={() => { onNewChat(); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                New conversation
              </button>
              <div className="my-1 border-t" />
              <button
                onClick={() => { setEditValue(sessionName); setEditing(true); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                onClick={() => {
                  if (sessionId) onArchive(sessionId);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
              <button
                onClick={() => {
                  if (sessionId) onDelete(sessionId);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-500 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AIFullscreen() {
  const {
    messages, isLoading, sendMessage, submitChoice, skipChoice,
    submitAdvertiserSetup, submitKeywords, submitPlatformConnection, minimize, close, startNewChat, setState,
    currentSessionId, chatSessions, renameChatSession, archiveChatSession, deleteChatSession,
  } = useAICompanion();
  const { activeStrategy, activeNarrative } = useCampaign();
  const hasPreview = !!(activeStrategy || activeNarrative);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derive session name from saved sessions or first user message
  const sessionName = useMemo(() => {
    if (currentSessionId) {
      const meta = chatSessions.find((s) => s.id === currentSessionId);
      if (meta?.name) return meta.name;
    }
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser?.content) {
      const trimmed = firstUser.content.trim();
      return trimmed.length <= 30 ? trimmed : trimmed.slice(0, 28) + "…";
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
  }, [messages, isLoading]);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-6">
        <SessionMenu
          sessionId={currentSessionId}
          sessionName={sessionName}
          onRename={renameChatSession}
          onArchive={(id) => { archiveChatSession(id); startNewChat(); }}
          onDelete={(id) => { deleteChatSession(id); startNewChat(); }}
          onNewChat={startNewChat}
        />
        <div className="flex items-center gap-0.5">
          <ChatModeSelector />
          {hasPreview && (
            <button
              onClick={() => setState("split")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Show canvas preview"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          )}
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
          {isLoading && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-3">
          {activeToolCall?.toolCall && renderToolCall()}
          <ArtifactPreviewCard />
          <div className="rounded-xl border px-4 py-3">
            <AIInput onSend={sendMessage} autoFocus />
          </div>
        </div>
      </div>
    </div>
  );
}
