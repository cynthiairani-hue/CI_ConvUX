"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAICompanion } from "@/contexts/ai-companion-context";

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Last updated just now";
  if (mins < 60) return `Last updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last updated ${hrs}h ago`;
  return `Last updated ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function ChatOverflowMenu() {
  const {
    currentSessionId, chatSessions, messages,
    renameChatSession, deleteChatSession,
  } = useAICompanion();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMeta = useMemo(() => {
    return chatSessions.find((s) => s.id === currentSessionId) ?? null;
  }, [chatSessions, currentSessionId]);

  const lastUpdated = useMemo(() => {
    if (currentMeta?.lastMessageAt) return formatUpdated(currentMeta.lastMessageAt);
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) return "Last updated just now";
    return null;
  }, [currentMeta, messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (renaming && inputRef.current) inputRef.current.focus();
  }, [renaming]);

  function handleRename() {
    const name = currentMeta?.name || "New conversation";
    setRenameValue(name);
    setRenaming(true);
  }

  function handleRenameSubmit() {
    const trimmed = renameValue.trim();
    if (trimmed && currentSessionId) {
      renameChatSession(currentSessionId, trimmed);
    }
    setRenaming(false);
    setOpen(false);
  }

  function handleDelete() {
    if (currentSessionId) {
      deleteChatSession(currentSessionId);
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="More options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border bg-background shadow-lg">
          <div className="p-1">
            {renaming ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(); }}
                className="px-2 py-1.5"
              >
                <input
                  ref={inputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setRenaming(false); setOpen(false); }
                  }}
                  onBlur={handleRenameSubmit}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-[13px] outline-none focus:border-ring"
                />
              </form>
            ) : (
              <>
                <button
                  onClick={handleRename}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  Rename
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Delete
                </button>
              </>
            )}
          </div>
          {lastUpdated && !renaming && (
            <>
              <div className="border-t" />
              <div className="px-3 py-2">
                <span className="text-[11px] text-muted-foreground">{lastUpdated}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
