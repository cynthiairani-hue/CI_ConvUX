"use client";

import { Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { suggestedPrompts } from "@/data/suggested-prompts";
import { useCampaign } from "@/contexts/campaign-context";

interface ChatInputDropdownProps {
  onSelectPrompt: (text: string) => void;
  onSelectStrategy: (id: string) => void;
}

const STATUS_DOTS: Record<string, string> = {
  draft: "bg-[#9CA3AF]",
  "pending-approval": "bg-amber-400",
  approved: "bg-emerald-400",
  active: "bg-blue-400",
  paused: "bg-orange-400",
  archived: "bg-[#9CA3AF]",
};

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

export function ChatInputDropdown({ onSelectPrompt, onSelectStrategy }: ChatInputDropdownProps) {
  const { savedStrategies, savedAdvertisers } = useCampaign();

  const recentStrategies = [...(savedStrategies || [])]
    .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
    .slice(0, 5);

  function getAdvertiserName(advertiserId: string): string {
    const adv = (savedAdvertisers || []).find((a) => a.id === advertiserId);
    return adv?.companyName || "Unknown";
  }

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-[#E0E8F2] bg-white shadow-[0px_4px_16px_rgba(71,88,114,0.12)]">
      {/* Suggested prompts */}
      <div className="px-4 pt-3 pb-2">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
          <Sparkles className="h-3 w-3" />
          Suggested prompts
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestedPrompts.map((prompt) => (
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

      {/* Recent strategies */}
      <div className="border-t border-[#EDF1F5] px-4 pt-2 pb-2">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8492A6]">
          <Clock className="h-3 w-3" />
          Recent strategies
        </div>
        {recentStrategies.length === 0 ? (
          <div className="py-2 text-[12px] text-[#BFCCD9]">No strategies yet</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
