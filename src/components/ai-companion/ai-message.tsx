"use client";

import { type ReactNode, useState } from "react";
import { ClipboardList, Forward, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
// Legacy PlanCard removed — all campaigns now use StrategyCard
import { StrategyCard } from "@/components/patterns/strategy-card";
import { PerformanceSnapshotCard } from "./performance-snapshot-card";
import { useCampaign } from "@/contexts/campaign-context";
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
        className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Copy to clipboard"
      >
        <ClipboardList className="h-3.5 w-3.5" />
        {copied && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-white shadow-sm">
            Copied
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Share"
      >
        <Forward className="h-3.5 w-3.5" />
        {shared && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-white shadow-sm">
            Link copied
          </span>
        )}
      </button>
      {tokenCount !== undefined && tokenCount > 0 && (
        <span className="ml-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/40">
          <Zap className="h-2.5 w-2.5" />
          {formatTokens(tokenCount)}
        </span>
      )}
    </div>
  );
}

function ThinkingBlock({ steps, isComplete }: { steps: string[]; isComplete: boolean }) {
  // Total expected steps — the last step shown may still be "in progress"
  // When message has content, all steps are complete
  return (
    <div className="mb-3 space-y-2.5">
      {steps.map((step, i) => {
        const isDone = isComplete || i < steps.length - 1;
        const isActive = !isComplete && i === steps.length - 1;

        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2.5 transition-opacity duration-500",
              !isDone && !isActive && "opacity-30",
            )}
          >
            {/* Status indicator — matches brand discovery pattern */}
            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                isDone && "bg-muted",
                isActive && "bg-muted",
              )}
            >
              {isDone ? (
                <Check className="h-3 w-3 text-foreground" />
              ) : isActive ? (
                <div className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-muted-foreground/30 border-t-foreground" />
              ) : null}
            </div>

            {/* Step label */}
            <span
              className={cn(
                "pt-0.5 text-[13px] leading-tight transition-colors duration-300",
                isDone && "text-foreground",
                isActive && "text-foreground",
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function isStrategyPlan(artifact: unknown): artifact is StrategyPlan {
  return !!artifact && typeof artifact === "object" && "advertiserId" in artifact;
}

/**
 * Notion-quality markdown renderer for chat messages.
 * Handles: headings, **bold**, *italic*, `code`, bullet lists,
 * numbered lists, tables, horizontal rules, and line breaks.
 * No heavy dependencies — just regex.
 */

type ListType = "ul" | "ol";
interface ListAccumulator { type: ListType; items: string[] }

function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let list: ListAccumulator | null = null;
  let tableRows: string[][] | null = null;

  function flushList() {
    if (!list) return;
    const Tag = list.type;
    const cls = list.type === "ol"
      ? "my-2 list-decimal space-y-1 pl-5 text-[13px]"
      : "my-2 list-disc space-y-1 pl-5 text-[13px]";
    elements.push(
      <Tag key={`list-${elements.length}`} className={cls}>
        {list.items.map((item, i) => (
          <li key={i} className="leading-relaxed">{renderInline(item)}</li>
        ))}
      </Tag>
    );
    list = null;
  }

  function flushTable() {
    if (!tableRows || tableRows.length === 0) return;
    const header = tableRows[0];
    // Skip separator row (|---|---|)
    const bodyStart = tableRows.length > 1 && tableRows[1].every(c => /^[-:]+$/.test(c.trim())) ? 2 : 1;
    const body = tableRows.slice(bodyStart);
    elements.push(
      <div key={`tbl-${elements.length}`} className="my-2.5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {header.map((cell, ci) => (
                <th key={ci} className="px-3 py-1.5 text-left font-medium text-foreground">
                  {renderInline(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          {body.length > 0 && (
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-foreground/80">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    );
    tableRows = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- Table row: | col | col | ---
    const tableMatch = line.match(/^\|(.+)\|$/);
    if (tableMatch) {
      flushList();
      const cells = tableMatch[1].split("|");
      if (!tableRows) tableRows = [];
      tableRows.push(cells);
      continue;
    }
    flushTable();

    // --- Horizontal rule: --- or *** or ___ ---
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="my-3 border-border" />);
      continue;
    }

    // --- Heading: ## or ### ---
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      if (level <= 2) {
        elements.push(
          <div key={`h-${i}`} className="mt-3 mb-1.5 text-[14px] font-semibold leading-snug text-foreground">
            {renderInline(content)}
          </div>
        );
      } else {
        elements.push(
          <div key={`h-${i}`} className="mt-2 mb-1 text-[13px] font-semibold leading-snug text-foreground">
            {renderInline(content)}
          </div>
        );
      }
      continue;
    }

    // --- Bullet list item: - text or * text ---
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      if (list && list.type !== "ul") flushList();
      if (!list) list = { type: "ul", items: [] };
      list.items.push(bulletMatch[1]);
      continue;
    }

    // --- Numbered list item: 1. text or 1) text ---
    const numMatch = line.match(/^\d+[.)]\s+(.+)/);
    if (numMatch) {
      if (list && list.type !== "ol") flushList();
      if (!list) list = { type: "ol", items: [] };
      list.items.push(numMatch[1]);
      continue;
    }

    // If we're in a list and hit a blank line, peek ahead to see if the list continues
    if (line.trim() === "" && list) {
      const nextNonBlank = lines.slice(i + 1).find((l) => l.trim() !== "");
      if (nextNonBlank) {
        const continuesBullet = list.type === "ul" && /^[-*]\s+/.test(nextNonBlank);
        const continuesNum = list.type === "ol" && /^\d+[.)]\s+/.test(nextNonBlank);
        if (continuesBullet || continuesNum) continue;
      }
    }

    flushList();

    // --- Blank line → spacing ---
    if (line.trim() === "") {
      if (elements.length > 0) {
        elements.push(<div key={`br-${i}`} className="h-1.5" />);
      }
      continue;
    }

    // --- Regular paragraph line ---
    elements.push(
      <div key={`p-${i}`} className="leading-relaxed">
        {renderInline(line)}
      </div>
    );
  }

  flushList();
  flushTable();
  return <>{elements}</>;
}

/** Inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  // Match: `code`, **bold**, *italic* (in that priority order)
  const regex = /(`([^`]+?)`|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // `code`
      parts.push(
        <code key={match.index} className="rounded bg-muted px-1 py-0.5 text-[12px] font-mono text-foreground">
          {match[2]}
        </code>
      );
    } else if (match[3]) {
      // **bold**
      parts.push(<strong key={match.index} className="font-semibold">{match[3]}</strong>);
    } else if (match[4]) {
      // *italic*
      parts.push(<em key={match.index}>{match[4]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function AIMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const { activeStrategy } = useCampaign();

  if (message.toolCall) return null;
  if (!message.content && !message.artifact && !message.performanceSnapshot && !message.thinkingSteps?.length) return null;

  const artifact = message.artifact;
  const isStrategy = artifact && isStrategyPlan(artifact);

  const strategyPlan = isStrategy
    ? (activeStrategy && activeStrategy.id === artifact.id ? activeStrategy : artifact)
    : null;

  const hasArtifact = !!strategyPlan || !!message.performanceSnapshot;

  return (
    <div
      data-msg-id={message.id}
      className={cn("group/msg flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          isUser
            ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-[#E8F4FD] px-4 py-2.5 text-sm leading-relaxed text-foreground"
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
          <ThinkingBlock steps={message.thinkingSteps} isComplete={!!message.content} />
        )}
        {message.content && (isUser ? message.content : renderMarkdown(message.content))}
        {!isUser && message.content && <MessageActions content={message.content} tokenCount={estimateTokens(message)} />}
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
