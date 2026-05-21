"use client";

import { useState } from "react";
import { Wand2, Clock, MessageSquare, MoreHorizontal, Pencil, Archive, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { getPersonalizedPrompts } from "@/data/suggested-prompts";
import { getCurrentBrand } from "@/data/brand-profiles";
import { SESSION_GROUP_LABELS, type ChatSessionGroup } from "@/lib/storage";

interface ChatInputDropdownProps {
  onSelectPrompt: (text: string) => void;
  onSelectStrategy: (id: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const GROUP_ICONS: Record<ChatSessionGroup, string> = {
  campaigns: "🎯",
  performance: "📊",
  accounts: "🔗",
  budgets: "💰",
  general: "💬",
};

function SessionActions({
  sessionId,
  sessionName,
  onRename,
  onArchive,
  onDelete,
}: {
  sessionId: string;
  sessionName: string;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(sessionName);

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1" onMouseDown={(e) => e.preventDefault()}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRename(sessionId, newName);
              setIsRenaming(false);
            }
            if (e.key === "Escape") setIsRenaming(false);
          }}
          autoFocus
          className="w-24 rounded border border-[#E0E8F2] px-1.5 py-0.5 text-[12px] text-[#394859] outline-none focus:border-[#2C9FDD]"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename(sessionId, newName);
            setIsRenaming(false);
          }}
          className="flex h-5 w-5 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsRenaming(false);
          }}
          className="flex h-5 w-5 items-center justify-center rounded text-[#8492A6] hover:bg-[#F7F9FB]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 text-[#8492A6] hover:bg-[#F0F3F7]"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {showMenu && (
        <div
          className="absolute right-0 top-6 z-50 w-36 overflow-hidden rounded-lg border border-[#E0E8F2] bg-white shadow-[0px_4px_12px_rgba(71,88,114,0.15)]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              setIsRenaming(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#394859] hover:bg-[#F7F9FB]"
          >
            <Pencil className="h-3 w-3" /> Rename
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onArchive(sessionId);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#394859] hover:bg-[#F7F9FB]"
          >
            <Archive className="h-3 w-3" /> Archive
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onDelete(sessionId);
            }}
            className="flex w-full items-center gap-2 border-t border-[#E0E8F2] px-3 py-2 text-[12px] text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatInputDropdown({ onSelectPrompt, onSelectStrategy }: ChatInputDropdownProps) {
  const { chatSessions, loadChatSession, renameChatSession, archiveChatSession, deleteChatSession } = useAICompanion();
  const { savedStrategies, savedAdvertisers } = useCampaign();

  const brand = getCurrentBrand();
  const prompts = getPersonalizedPrompts(brand, savedStrategies?.length || 0);

  // Active sessions, sorted by last message time
  const activeSessions = chatSessions
    .filter((s) => s.status === "active" && s.messageCount > 0)
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .slice(0, 8);

  // Group sessions by affinity
  const groupedSessions = activeSessions.reduce((acc, session) => {
    const group = session.group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {} as Record<ChatSessionGroup, typeof activeSessions>);

  // Recent strategies (separate section)
  const recentStrategies = [...(savedStrategies || [])]
    .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
    .slice(0, 3);

  function getAdvertiserName(advertiserId: string): string {
    const adv = (savedAdvertisers || []).find((a) => a.id === advertiserId);
    return adv?.companyName || "Unknown";
  }

  const STATUS_DOTS: Record<string, string> = {
    draft: "bg-[#9CA3AF]",
    "pending-approval": "bg-amber-400",
    approved: "bg-emerald-400",
    active: "bg-blue-400",
    paused: "bg-orange-400",
    archived: "bg-[#9CA3AF]",
  };

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-[420px] overflow-y-auto overflow-hidden rounded-xl border border-[#E0E8F2] bg-white shadow-[0px_4px_16px_rgba(71,88,114,0.12)]">
      {/* Suggested prompts */}
      <div className="px-4 pt-3 pb-2">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
          <Wand2 className="h-3 w-3" />
          Suggested for you
        </div>
        <div className="flex flex-wrap gap-1.5">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectPrompt(prompt.label);
              }}
              className="rounded-full border border-[#E0E8F2] px-3 py-1 text-[12px] text-[#394859] transition-colors hover:border-[#2C9FDD] hover:bg-[#EBF5FB] hover:text-[#1A7BB5]"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent chats grouped by affinity */}
      {activeSessions.length > 0 && (
        <div className="border-t border-[#E0E8F2] px-4 pt-2 pb-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
            <MessageSquare className="h-3 w-3" />
            Recent chats
          </div>
          {Object.entries(groupedSessions).map(([group, sessions]) => (
            <div key={group} className="mb-1">
              {Object.keys(groupedSessions).length > 1 && (
                <div className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#BFCCD9]">
                  <span>{GROUP_ICONS[group as ChatSessionGroup]}</span>
                  {SESSION_GROUP_LABELS[group as ChatSessionGroup]}
                </div>
              )}
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    loadChatSession(session.id);
                  }}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#F7F9FB]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13px] font-medium text-[#394859]">{session.name}</div>
                    <div className="text-[11px] text-[#8492A6]">
                      {session.messageCount} message{session.messageCount !== 1 ? "s" : ""} · {timeAgo(session.lastMessageAt)}
                    </div>
                  </div>
                  <SessionActions
                    sessionId={session.id}
                    sessionName={session.name}
                    onRename={renameChatSession}
                    onArchive={archiveChatSession}
                    onDelete={deleteChatSession}
                  />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Recent strategies */}
      {recentStrategies.length > 0 && (
        <div className="border-t border-[#E0E8F2] px-4 pt-2 pb-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
            <Clock className="h-3 w-3" />
            Recent strategies
          </div>
          <div className="space-y-0.5">
            {recentStrategies.map((strategy) => (
              <button
                key={strategy.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectStrategy(strategy.id);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#F7F9FB]"
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOTS[strategy.status] || STATUS_DOTS.draft)} />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[13px] font-medium text-[#394859]">{strategy.name}</div>
                  <div className="text-[11px] text-[#8492A6]">
                    {getAdvertiserName(strategy.advertiserId)} · {timeAgo(strategy.lastModifiedAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
