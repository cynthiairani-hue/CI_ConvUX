"use client";

import { type ReactNode, useState } from "react";
import { ClipboardList, Forward, ChevronDown, Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanCard } from "@/components/patterns/plan-card";
import { StrategyCard } from "@/components/patterns/strategy-card";
import { PerformanceSnapshotCard } from "./performance-snapshot-card";
import { useCampaign } from "@/contexts/campaign-context";
import { usePersona } from "@/contexts/persona-context";
import type { ChatMessage } from "@/contexts/ai-companion-context";
import type { StrategyPlan } from "@/types/campaign";

export function estimateTokens(msg: ChatMessage): number {
  if (msg.toolCall) return 0;
  if (msg.tokenCount) return msg.tokenCount;
  let tokens = 0;
  if (msg.content) tokens += Math.ceil(msg.content.length / 3.8);
  if (msg.artifact) tokens += 940;
  if (msg.performanceSnapshot) tokens += 720;
  if (msg.thinkingSteps?.length) tokens += msg.thinkingSteps.length * 48;
  if (msg.role === "assistant" && tokens > 0) tokens += 135;
  if (msg.role === "user") tokens += Math.ceil((msg.content?.length || 0) / 4.2);
  return tokens;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function MessageActions({ content, tokenCount }: { content: string; tokenCount?: number }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-0 transition-opacity group-hover/msg:opacity-100">
      <button
        type="button"
        onClick={handleCopy}
        className="relative flex h-7 w-7 items-center justify-center rounded-md text-[#8492A6] transition-colors hover:bg-[#F0F2F5] hover:text-[#394859]"
        title="Copy to clipboard"
      >
        <ClipboardList className="h-3.5 w-3.5" />
        {copied && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#394859] px-2 py-1 text-[10px] font-medium text-white shadow-sm">
            Copied
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="relative flex h-7 w-7 items-center justify-center rounded-md text-[#8492A6] transition-colors hover:bg-[#F0F2F5] hover:text-[#394859]"
        title="Share"
      >
        <Forward className="h-3.5 w-3.5" />
        {shared && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#394859] px-2 py-1 text-[10px] font-medium text-white shadow-sm">
            Link copied
          </span>
        )}
      </button>
      {tokenCount !== undefined && tokenCount > 0 && (
        <span className="ml-1.5 flex items-center gap-1 text-[11px] text-[#C4CDD8]">
          <Zap className="h-2.5 w-2.5" />
          {formatTokens(tokenCount)}
        </span>
      )}
    </div>
  );
}

function ThinkingBlock({ steps }: { steps: string[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className="mb-2 flex w-full flex-col rounded-lg border border-[#EDF1F5] bg-[#FAFBFC] px-3 py-2 text-left transition-colors hover:bg-[#F5F7FA]"
    >
      <div className="flex items-center gap-1.5">
        <Brain className="h-3 w-3 text-[#8492A6]" />
        <span className="text-[11px] font-medium text-[#8492A6]">
          Thought for {steps.length} step{steps.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown className={cn(
          "ml-auto h-3 w-3 text-[#C4CDD8] transition-transform",
          expanded && "rotate-180"
        )} />
      </div>
      {expanded && (
        <div className="mt-2 space-y-1 border-t border-[#EDF1F5] pt-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#8492A6]">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#C4CDD8]" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

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
  if (!message.content && !message.artifact && !message.performanceSnapshot && !message.thinkingSteps?.length) return null;

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
      className={cn("group/msg flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}
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
        {/* Image thumbnails for user messages */}
        {isUser && message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.images.map((img, i) => (
              <div
                key={i}
                className="relative h-20 w-20 overflow-hidden rounded-lg border border-black/[0.08]"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        {!isUser && message.thinkingSteps && message.thinkingSteps.length > 0 && (
          <ThinkingBlock steps={message.thinkingSteps} />
        )}
        {message.content && (isUser ? message.content : renderMarkdown(message.content))}
        {!isUser && message.content && <MessageActions content={message.content} tokenCount={estimateTokens(message)} />}
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
