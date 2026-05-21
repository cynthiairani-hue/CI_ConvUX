"use client";

import { useState, useMemo } from "react";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { getCurrentBrand } from "@/data/brand-profiles";
import { FFERN_SEED_ANOMALIES } from "@/data/seed-ffern";
import { SEED_ANOMALIES } from "@/data/seed-company";
import type { SeedAnomaly } from "@/data/seed-company";
import type { ChatSessionMeta } from "@/lib/storage";
import type { StrategyPlan } from "@/types/campaign";
import {
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Zap,
  RefreshCw,
  MessageSquare,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "focus" | "chats";

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

const GROUP_ICONS: Record<string, React.ReactNode> = {
  campaigns: <Zap className="h-3 w-3 text-[#2C9FDD]" />,
  performance: <TrendingUp className="h-3 w-3 text-emerald-500" />,
  general: <MessageSquare className="h-3 w-3 text-[#8492A6]" />,
  accounts: <MessageSquare className="h-3 w-3 text-[#8492A6]" />,
  budgets: <MessageSquare className="h-3 w-3 text-amber-500" />,
};

function ChatRow({
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
      className="group flex w-full items-center gap-3 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3 text-left transition-all hover:border-[#C4CDD8] hover:shadow-sm"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7F9FB]">
        {GROUP_ICONS[session.group] || GROUP_ICONS.general}
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate text-[13px] font-medium text-[#394859]">{session.name}</span>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#8492A6]">
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(session.lastMessageAt)}
          </span>
          <span>·</span>
          <span>{session.messageCount} message{session.messageCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#C4CDD8] transition-colors group-hover:text-[#8492A6]" />
    </button>
  );
}

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
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .slice(0, 10),
    [chatSessions]
  );

  function handleOpenSession(id: string) {
    loadChatSession(id);
  }

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
      <div className="mt-4 space-y-2">
        {activeTab === "focus" && (
          <>
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
          </>
        )}

        {activeTab === "chats" && (
          <>
            {activeSessions.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl bg-white px-8 py-8 text-center">
                <MessageSquare className="h-5 w-5 text-[#C4CDD8]" />
                <p className="mt-2 text-[13px] text-[#8492A6]">
                  No conversations yet. Ask anything to get started.
                </p>
              </div>
            ) : (
              activeSessions.map((s) => (
                <ChatRow key={s.id} session={s} onOpen={handleOpenSession} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
