"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PlanCard } from "@/components/patterns/plan-card";
import { StrategyCard } from "@/components/patterns/strategy-card";
import { PerformanceSnapshotCard } from "./performance-snapshot-card";
import { useCampaign } from "@/contexts/campaign-context";
import { usePersona } from "@/contexts/persona-context";
import type { ChatMessage } from "@/contexts/ai-companion-context";
import type { StrategyPlan } from "@/types/campaign";

function isStrategyPlan(artifact: unknown): artifact is StrategyPlan {
  return !!artifact && typeof artifact === "object" && "advertiserId" in artifact;
}

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: **bold**, *italic*, numbered lists, and line breaks.
 * No heavy dependencies — just regex.
 */
function renderMarkdown(text: string): ReactNode {
  // Split into lines for block-level formatting
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-1.5 list-decimal space-y-1 pl-5">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      listItems = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Numbered list item: "1. text" or "1) text"
    const listMatch = line.match(/^\d+[.)]\s+(.+)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();

    if (line.trim() === "") {
      // Empty line → spacing
      if (elements.length > 0) {
        elements.push(<div key={`br-${i}`} className="h-1.5" />);
      }
    } else {
      elements.push(
        <span key={`p-${i}`}>
          {elements.length > 0 && <>{" "}</>}
          {renderInline(line)}
        </span>
      );
    }
  }

  flushList();
  return <>{elements}</>;
}

/** Inline markdown: **bold** and *italic* */
function renderInline(text: string): ReactNode {
  // Split on **bold** and *italic* markers
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // **bold**
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function AIMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const { updateSection, sendForApproval, activePlan, activeStrategy } = useCampaign();
  const { activePersona } = usePersona();

  if (message.toolCall) return null;
  if (!message.content && !message.artifact && !message.performanceSnapshot) return null;

  const artifact = message.artifact;
  const isStrategy = artifact && isStrategyPlan(artifact);

  const legacyPlan = !isStrategy && artifact
    ? (activePlan && activePlan.id === artifact.id ? activePlan : artifact)
    : null;

  const strategyPlan = isStrategy
    ? (activeStrategy && activeStrategy.id === artifact.id ? activeStrategy : artifact)
    : null;

  const hasArtifact = !!legacyPlan || !!strategyPlan || !!message.performanceSnapshot;

  return (
    <div
      className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          isUser
            ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-[#E8F4FD] px-4 py-2.5 text-sm leading-relaxed text-[#394859]"
            : hasArtifact
            ? "w-full text-sm leading-relaxed text-foreground"
            : "max-w-[80%] text-sm leading-relaxed text-foreground"
        )}
      >
        {message.content && (isUser ? message.content : renderMarkdown(message.content))}
        {legacyPlan && (
          <div className="mt-3">
            <PlanCard
              plan={legacyPlan}
              onUpdate={updateSection}
              onSendForApproval={(approverId) =>
                sendForApproval(approverId, activePersona.id)
              }
            />
          </div>
        )}
        {strategyPlan && (
          <div className="mt-3">
            <StrategyCard plan={strategyPlan} />
          </div>
        )}
        {message.performanceSnapshot && (
          <PerformanceSnapshotCard
            title={message.performanceSnapshot.title}
            period={message.performanceSnapshot.period}
            metrics={message.performanceSnapshot.metrics}
          />
        )}
      </div>
    </div>
  );
}
