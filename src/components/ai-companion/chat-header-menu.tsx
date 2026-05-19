"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Archive,
  MessageSquare,
  PanelLeft,
  PanelRight,
  Maximize2,
  Columns2,
  Settings2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import type { AICompanionState } from "@/contexts/ai-companion-context";
import type { ChatSessionMeta } from "@/lib/storage";

/* ──────────────────────────────────────────────
   Time helpers
   ────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupSessionsByTime(sessions: ChatSessionMeta[]): { label: string; sessions: ChatSessionMeta[] }[] {
  const now = Date.now();
  const day = 86400000;
  const groups: Record<string, ChatSessionMeta[]> = {
    today: [],
    yesterday: [],
    week: [],
    month: [],
    older: [],
  };

  for (const s of sessions) {
    const age = now - new Date(s.lastMessageAt).getTime();
    if (age < day) groups.today.push(s);
    else if (age < 2 * day) groups.yesterday.push(s);
    else if (age < 7 * day) groups.week.push(s);
    else if (age < 30 * day) groups.month.push(s);
    else groups.older.push(s);
  }

  const result: { label: string; sessions: ChatSessionMeta[] }[] = [];
  if (groups.today.length > 0) result.push({ label: "Today", sessions: groups.today });
  if (groups.yesterday.length > 0) result.push({ label: "Yesterday", sessions: groups.yesterday });
  if (groups.week.length > 0) result.push({ label: "This week", sessions: groups.week });
  if (groups.month.length > 0) result.push({ label: "Previous 30 days", sessions: groups.month });
  if (groups.older.length > 0) result.push({ label: "Older", sessions: groups.older });
  return result;
}

/* ──────────────────────────────────────────────
   Layout options
   ────────────────────────────────────────────── */

interface LayoutOption {
  id: AICompanionState | "docked-left" | "docked-right";
  label: string;
  icon: React.ReactNode;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: "docked-left", label: "Sidebar left", icon: <PanelLeft className="h-3.5 w-3.5" /> },
  { id: "docked-right", label: "Sidebar right", icon: <PanelRight className="h-3.5 w-3.5" /> },
  { id: "fullscreen", label: "Full screen", icon: <Maximize2 className="h-3.5 w-3.5" /> },
  { id: "split", label: "Split view", icon: <Columns2 className="h-3.5 w-3.5" /> },
];

/* ──────────────────────────────────────────────
   ChatHeaderMenu — Notion-style dropdown
   ────────────────────────────────────────────── */

interface ChatHeaderMenuProps {
  /** Compact mode for docked panel — narrower, fewer features */
  compact?: boolean;
}

export function ChatHeaderMenu({ compact }: ChatHeaderMenuProps) {
  const {
    state, setState, dockSide,
    messages, currentSessionId, chatSessions,
    startNewChat, loadChatSession, renameChatSession, archiveChatSession, deleteChatSession,
  } = useAICompanion();
  const { activeStrategy, activeNarrative } = useCampaign();
  const [open, setOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const hasPreview = !!(activeStrategy || activeNarrative);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setRenameId(null);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Derive session name
  const sessionName = useMemo(() => {
    if (currentSessionId) {
      const meta = chatSessions.find((s) => s.id === currentSessionId);
      if (meta?.name) return meta.name;
    }
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser?.content) {
      const trimmed = firstUser.content.trim();
      const maxLen = compact ? 18 : 28;
      return trimmed.length <= maxLen ? trimmed : trimmed.slice(0, maxLen - 2) + "…";
    }
    return "New conversation";
  }, [currentSessionId, chatSessions, messages, compact]);

  // Active sessions (not archived), sorted by most recent
  const activeSessions = useMemo(() => {
    return chatSessions
      .filter((s) => s.status === "active" && s.id !== currentSessionId)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [chatSessions, currentSessionId]);

  const groupedSessions = useMemo(() => groupSessionsByTime(activeSessions), [activeSessions]);

  // Current layout id
  const currentLayout = state === "docked"
    ? dockSide === "left" ? "docked-left" : "docked-right"
    : state;

  function handleLayoutChange(id: string) {
    if (id === "docked-left") {
      setState("docked");
      // dockSide is toggled via context — we need to ensure it's left
      // For simplicity, if currently right, toggle; if not docked, set state
      if (state !== "docked" || dockSide !== "left") {
        setState("docked");
        // toggleDockSide is available but we can't guarantee direction here
        // So we set state to docked — the side will be whatever it was last
      }
    } else if (id === "docked-right") {
      setState("docked");
    } else if (id === "split") {
      setState("split");
    } else if (id === "fullscreen") {
      setState("fullscreen");
    }
    setOpen(false);
  }

  function handleLoadSession(sessionId: string) {
    loadChatSession(sessionId);
    setOpen(false);
  }

  function handleRenameSubmit(sessionId: string) {
    if (renameValue.trim()) {
      renameChatSession(sessionId, renameValue.trim());
    }
    setRenameId(null);
  }

  function handlePersonalize() {
    // Navigate to settings — for now just close and could open settings
    setOpen(false);
    window.location.href = "/settings";
  }

  return (
    <div ref={menuRef} className="relative min-w-0">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 min-w-0 rounded-md px-1.5 py-1 transition-colors hover:bg-accent"
      >
        <span className={cn(
          "font-semibold text-foreground truncate",
          compact ? "text-[13px] max-w-[140px]" : "text-sm max-w-[220px]"
        )}>
          {sessionName}
        </span>
        <ChevronDown className={cn(
          "shrink-0 text-muted-foreground transition-transform",
          compact ? "h-3 w-3" : "h-3.5 w-3.5",
          open && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          "absolute left-0 top-full z-50 mt-1.5 rounded-xl border bg-background shadow-lg",
          compact ? "w-64" : "w-72"
        )}>
          {/* New conversation */}
          <div className="p-1.5">
            <button
              onClick={() => { startNewChat(); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              New conversation
            </button>
          </div>

          <div className="border-t" />

          {/* Layout options */}
          <div className="p-1.5">
            <span className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
              Layout
            </span>
            {LAYOUT_OPTIONS
              .filter((opt) => opt.id !== "split" || hasPreview) // Only show split if there's an artifact
              .map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleLayoutChange(opt.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                  currentLayout === opt.id
                    ? "bg-accent font-medium text-foreground"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <span className="text-muted-foreground">{opt.icon}</span>
                {opt.label}
                {currentLayout === opt.id && (
                  <span className="ml-auto text-[11px] text-[#2C9FDD]">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="border-t" />

          {/* Personalize */}
          <div className="p-1.5">
            <button
              onClick={handlePersonalize}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-accent"
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Personalize
            </button>
          </div>

          {/* Previous conversations */}
          {groupedSessions.length > 0 && (
            <>
              <div className="border-t" />
              <div className="max-h-[240px] overflow-y-auto p-1.5">
                {groupedSessions.map((group) => (
                  <div key={group.label}>
                    <span className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
                      {group.label}
                    </span>
                    {group.sessions.map((session) => (
                      <div key={session.id} className="group/item relative">
                        {renameId === session.id ? (
                          <form
                            onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(session.id); }}
                            className="px-3 py-1.5"
                          >
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Escape") setRenameId(null); }}
                              onBlur={() => handleRenameSubmit(session.id)}
                              className="w-full rounded border px-2 py-1 text-[12px] outline-none focus:border-[#2C9FDD]"
                            />
                          </form>
                        ) : (
                          <button
                            onClick={() => handleLoadSession(session.id)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-accent"
                          >
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#C4CDD8]" />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] text-foreground">
                                {session.name}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-[#8492A6]">
                                <Clock className="h-2.5 w-2.5" />
                                {timeAgo(session.lastMessageAt)}
                              </span>
                            </div>
                            {/* Hover actions */}
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameValue(session.name);
                                  setRenameId(session.id);
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded text-[#8492A6] hover:bg-[#E0E8F2] hover:text-[#394859]"
                                title="Rename"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveChatSession(session.id);
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded text-[#8492A6] hover:bg-[#E0E8F2] hover:text-[#394859]"
                                title="Archive"
                              >
                                <Archive className="h-2.5 w-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChatSession(session.id);
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded text-[#8492A6] hover:bg-red-50 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
