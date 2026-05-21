"use client";

import { useState, useMemo } from "react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { getCurrentBrand } from "@/data/brand-profiles";
import { FFERN_SEED_ANOMALIES } from "@/data/seed-ffern";
import { SEED_ANOMALIES } from "@/data/seed-company";
import type { SeedAnomaly } from "@/data/seed-company";
import type { ChatSessionMeta, ChatSessionGroup } from "@/lib/storage";
import type { StrategyPlan } from "@/types/campaign";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  DollarSign,
  Megaphone,
  MessageSquare,
  Search,
  TrendingUp,
  Zap,
  RefreshCw,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "focus" | "chats";

/* ──────────────────────────────────────────────
   Focus tab types + builder
   ────────────────────────────────────────────── */

interface FocusItem {
  id: string;
  type: "anomaly" | "optimization" | "creative" | "pacing";
  title: string;
  description: string;
  confidence: string;
  impact?: string;
  icon: React.ReactNode;
  iconBg: string;
  prompt: string;
}

function buildFocusItems(
  anomalies: SeedAnomaly[],
  strategies: StrategyPlan[],
  brandName: string
): FocusItem[] {
  const items: FocusItem[] = [];

  anomalies.forEach((a) => {
    items.push({
      id: a.id,
      type: "anomaly",
      title: `${a.channel} CPA trending up`,
      description: a.recommendedAction,
      confidence: a.confidence,
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />,
      iconBg: "bg-amber-50",
      prompt: `Explain the ${a.channel} anomaly and what I should do about it`,
    });
  });

  items.push({
    id: "opt-realloc",
    type: "optimization",
    title: "Shift spend to Google Shopping",
    description: `Shopping ROAS is 6.9x vs Meta's 3.8x. A 15% reallocation should improve blended return.`,
    confidence: "high",
    impact: "+$2.1K revenue/mo",
    icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />,
    iconBg: "bg-emerald-50",
    prompt: `Walk me through reallocating 15% of Meta spend to Google Shopping for ${brandName}`,
  });

  items.push({
    id: "opt-creative",
    type: "creative",
    title: "Refresh top Meta ad creative",
    description: "Best-performing ad set running 18 days — frequency at 3.2, CTR dropped 12%.",
    confidence: "high",
    icon: <RefreshCw className="h-3.5 w-3.5 text-[#2C9FDD]" />,
    iconBg: "bg-[#EBF5FB]",
    prompt: `Help me refresh the top Meta ad creative for ${brandName}`,
  });

  if (strategies.length > 0) {
    const draft = strategies.find((s) => s.status === "draft");
    if (draft) {
      items.push({
        id: "opt-draft",
        type: "pacing",
        title: `Finish "${draft.name}"`,
        description: "This campaign draft is missing creative and forecast. Complete it to launch.",
        confidence: "high",
        icon: <Zap className="h-3.5 w-3.5 text-[#7C5CFC]" />,
        iconBg: "bg-[#F3F0FF]",
        prompt: `Help me finish the ${draft.name} campaign`,
      });
    }
  }

  return items;
}

/* ──────────────────────────────────────────────
   Focus card
   ────────────────────────────────────────────── */

function FocusCard({
  item,
  onAct,
}: {
  item: FocusItem;
  onAct: (prompt: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3.5 transition-all hover:border-[#C4CDD8] hover:shadow-sm">
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", item.iconBg)}>
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#394859]">{item.title}</span>
          {item.impact && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              {item.impact}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-[#8492A6] line-clamp-2">{item.description}</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onAct(item.prompt)}
            className="flex items-center gap-1 text-[12px] font-medium text-[#2C9FDD] transition-colors hover:text-[#1A7BB5]"
          >
            Act on this
            <ArrowRight className="h-3 w-3" />
          </button>
          <span className="text-[11px] text-[#C4CDD8]">
            {item.confidence} confidence
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Chat group definitions
   ────────────────────────────────────────────── */

const GROUP_META: Record<ChatSessionGroup, { label: string; icon: React.ReactNode; color: string }> = {
  campaigns: {
    label: "Campaigns",
    icon: <Megaphone className="h-5 w-5 text-[#2C9FDD]" />,
    color: "bg-[#EBF5FB]",
  },
  performance: {
    label: "Performance",
    icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
    color: "bg-emerald-50",
  },
  accounts: {
    label: "Accounts",
    icon: <Users className="h-5 w-5 text-[#7C5CFC]" />,
    color: "bg-[#F3F0FF]",
  },
  budgets: {
    label: "Budgets",
    icon: <DollarSign className="h-5 w-5 text-amber-500" />,
    color: "bg-amber-50",
  },
  general: {
    label: "General",
    icon: <MessageSquare className="h-5 w-5 text-[#8492A6]" />,
    color: "bg-[#F0F2F5]",
  },
};

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

type SortMode = "recent" | "created" | "alphabetical";

function sortSessions(sessions: ChatSessionMeta[], mode: SortMode): ChatSessionMeta[] {
  const copy = [...sessions];
  switch (mode) {
    case "recent":
      return copy.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    case "created":
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "alphabetical":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/* ──────────────────────────────────────────────
   Project group card (square, a la Claude Projects)
   ────────────────────────────────────────────── */

function ChatGroupCard({
  group,
  sessions,
  onClick,
}: {
  group: ChatSessionGroup;
  sessions: ChatSessionMeta[];
  onClick: () => void;
}) {
  const meta = GROUP_META[group];
  const latest = sessions.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-xl border border-[#E0E8F2] bg-white p-4 text-left transition-all hover:border-[#C4CDD8] hover:shadow-sm"
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", meta.color)}>
        {meta.icon}
      </div>
      <span className="mt-3 text-[13px] font-medium text-[#394859]">{meta.label}</span>
      <span className="mt-0.5 text-[11px] text-[#8492A6]">
        {sessions.length} chat{sessions.length !== 1 ? "s" : ""}
        {latest && <> · {timeAgo(latest.lastMessageAt)}</>}
      </span>
    </button>
  );
}

/* ──────────────────────────────────────────────
   Simple chat list item (like Claude Recents)
   ────────────────────────────────────────────── */

function ChatListItem({
  session,
  onOpen,
}: {
  session: ChatSessionMeta;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(session.id)}
      className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#F7F9FB]"
    >
      <span className="min-w-0 flex-1 truncate text-[13px] text-[#394859] group-hover:text-[#1A2333]">
        {session.name}
      </span>
      <span className="shrink-0 text-[11px] text-[#C4CDD8]">
        {timeAgo(session.lastMessageAt)}
      </span>
    </button>
  );
}

/* ──────────────────────────────────────────────
   Sort dropdown
   ────────────────────────────────────────────── */

function SortDropdown({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (v: SortMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const labels: Record<SortMode, string> = {
    recent: "Recent",
    created: "Created",
    alphabetical: "Alphabetical",
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#8492A6] transition-colors hover:bg-[#F0F2F5] hover:text-[#394859]"
      >
        {labels[value]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-[#E0E8F2] bg-white py-1 shadow-lg">
            {(Object.keys(labels) as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  onChange(mode);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-[#F7F9FB]",
                  value === mode ? "text-[#394859] font-medium" : "text-[#8492A6]"
                )}
              >
                {labels[mode]}
                {value === mode && (
                  <svg className="h-3 w-3 text-[#394859]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Chats tab content — groups → drill-in list
   ────────────────────────────────────────────── */

function ChatsTabContent({
  sessions,
  onOpenSession,
}: {
  sessions: ChatSessionMeta[];
  onOpenSession: (id: string) => void;
}) {
  const [activeGroup, setActiveGroup] = useState<ChatSessionGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const grouped = useMemo(() => {
    const map: Partial<Record<ChatSessionGroup, ChatSessionMeta[]>> = {};
    sessions.forEach((s) => {
      if (!map[s.group]) map[s.group] = [];
      map[s.group]!.push(s);
    });
    return map;
  }, [sessions]);

  const nonEmptyGroups = useMemo(
    () => (Object.keys(grouped) as ChatSessionGroup[]).filter((g) => (grouped[g]?.length || 0) > 0),
    [grouped]
  );

  // When drilled into a group, filter + sort
  const groupSessions = useMemo(() => {
    if (!activeGroup) return [];
    let list = grouped[activeGroup] || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return sortSessions(list, sortMode);
  }, [activeGroup, grouped, searchQuery, sortMode]);

  // Global search across all groups
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || activeGroup) return null;
    const q = searchQuery.toLowerCase();
    const matches = sessions.filter((s) => s.name.toLowerCase().includes(q));
    return sortSessions(matches, sortMode);
  }, [searchQuery, activeGroup, sessions, sortMode]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl bg-white px-8 py-8 text-center">
        <MessageSquare className="h-5 w-5 text-[#C4CDD8]" />
        <p className="mt-2 text-[13px] text-[#8492A6]">
          No conversations yet. Ask anything to get started.
        </p>
      </div>
    );
  }

  // Drilled-in view: simple list
  if (activeGroup) {
    const meta = GROUP_META[activeGroup];
    return (
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveGroup(null);
              setSearchQuery("");
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-[#8492A6] transition-colors hover:bg-[#F0F2F5] hover:text-[#394859]"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
          <span className="text-[13px] font-medium text-[#394859]">{meta.label}</span>
          <span className="text-[11px] text-[#C4CDD8]">{groupSessions.length}</span>
          <div className="ml-auto">
            <SortDropdown value={sortMode} onChange={setSortMode} />
          </div>
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#C4CDD8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-lg border border-[#E0E8F2] bg-white py-2 pl-8 pr-3 text-[12px] outline-none placeholder:text-[#C4CDD8] focus:border-[#C4CDD8]"
          />
        </div>

        <div className="mt-2">
          {groupSessions.length === 0 ? (
            <p className="px-2 py-4 text-center text-[12px] text-[#C4CDD8]">No chats found.</p>
          ) : (
            groupSessions.map((s) => (
              <ChatListItem key={s.id} session={s} onOpen={onOpenSession} />
            ))
          )}
        </div>
      </div>
    );
  }

  // Top-level: search + project group cards
  return (
    <div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#C4CDD8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search all chats..."
          className="w-full rounded-lg border border-[#E0E8F2] bg-white py-2 pl-8 pr-3 text-[12px] outline-none placeholder:text-[#C4CDD8] focus:border-[#C4CDD8]"
        />
      </div>

      {searchResults ? (
        <div className="mt-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-[#8492A6]">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </span>
            <SortDropdown value={sortMode} onChange={setSortMode} />
          </div>
          <div className="mt-1">
            {searchResults.length === 0 ? (
              <p className="px-2 py-4 text-center text-[12px] text-[#C4CDD8]">No chats found.</p>
            ) : (
              searchResults.map((s) => (
                <ChatListItem key={s.id} session={s} onOpen={onOpenSession} />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {nonEmptyGroups.map((group) => (
            <ChatGroupCard
              key={group}
              group={group}
              sessions={grouped[group]!}
              onClick={() => setActiveGroup(group)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main export
   ────────────────────────────────────────────── */

export function FocusChatsTabs({
  strategies,
}: {
  strategies: StrategyPlan[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("focus");
  const { openFullscreen, chatSessions, loadChatSession } = useAICompanion();

  const brand = getCurrentBrand();
  const brandName = brand?.name || "your brand";
  const anomalies = brand ? FFERN_SEED_ANOMALIES : SEED_ANOMALIES;

  const focusItems = useMemo(
    () => buildFocusItems(anomalies, strategies, brandName),
    [anomalies, strategies, brandName]
  );

  const activeSessions = useMemo(
    () =>
      chatSessions
        .filter((s) => s.status === "active" && s.messageCount > 0)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [chatSessions]
  );

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "focus", label: "Focus", count: focusItems.length },
    { id: "chats", label: "Chats", count: activeSessions.length || undefined },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#E0E8F2]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-4 py-2.5 text-[13px] font-medium transition-colors",
              activeTab === tab.id
                ? "text-[#394859]"
                : "text-[#8492A6] hover:text-[#394859]"
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-[#F0F2F5] px-1.5 py-0.5 text-[10px] font-medium text-[#8492A6]">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#394859]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === "focus" && (
          <div className="space-y-2">
            {focusItems.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl bg-white px-8 py-8 text-center">
                <Zap className="h-5 w-5 text-[#C4CDD8]" />
                <p className="mt-2 text-[13px] text-[#8492A6]">
                  No recommendations right now. Check back after your campaigns run.
                </p>
              </div>
            ) : (
              focusItems.map((item) => (
                <FocusCard key={item.id} item={item} onAct={openFullscreen} />
              ))
            )}
          </div>
        )}

        {activeTab === "chats" && (
          <ChatsTabContent
            sessions={activeSessions}
            onOpenSession={loadChatSession}
          />
        )}
      </div>
    </div>
  );
}
