"use client";

import { useState, useEffect, useCallback, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/contexts/ai-companion-context";

interface ChatScrollMinimapProps {
  messages: ChatMessage[];
  scrollRef: RefObject<HTMLDivElement | null>;
}

/**
 * Notion-style table of contents on the right edge of the chat.
 * Vertically centered. Thin indicator dots when collapsed.
 * On hover → expands to a compact text outline with click-to-scroll.
 * Matches Notion's outline panel: no header, blue active text,
 * filled background for current section.
 */
export function ChatScrollMinimap({ messages, scrollRef }: ChatScrollMinimapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User messages as outline entries
  const anchors = messages
    .filter((msg) => msg.role === "user" && msg.content && !msg.toolCall);

  // Track which anchor is currently visible in the viewport
  const updateActiveAnchor = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const containerRect = el.getBoundingClientRect();
    const midY = containerRect.top + containerRect.height / 2;

    let closest: { id: string; dist: number } | null = null;

    for (const anchor of anchors) {
      const msgEl = el.querySelector(`[data-msg-id="${anchor.id}"]`);
      if (!msgEl) continue;
      const rect = msgEl.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - midY);
      if (!closest || dist < closest.dist) {
        closest = { id: anchor.id, dist };
      }
    }

    if (closest) setActiveAnchorId(closest.id);
  }, [scrollRef, anchors]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateActiveAnchor();
    el.addEventListener("scroll", updateActiveAnchor, { passive: true });
    return () => el.removeEventListener("scroll", updateActiveAnchor);
  }, [scrollRef, updateActiveAnchor]);

  useEffect(() => {
    const t = setTimeout(updateActiveAnchor, 150);
    return () => clearTimeout(t);
  }, [messages.length, updateActiveAnchor]);

  function handleClick(msgId: string) {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector(`[data-msg-id="${msgId}"]`) as HTMLElement | null;
    if (!target) return;

    const containerRect = el.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const relativeTop = targetRect.top - containerRect.top + el.scrollTop;
    const scrollTo = relativeTop - el.clientHeight / 2 + target.offsetHeight / 2;
    el.scrollTo({ top: Math.max(0, scrollTo), behavior: "smooth" });
  }

  function handleMouseEnter() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    setIsExpanded(true);
  }

  function handleMouseLeave() {
    collapseTimer.current = setTimeout(() => setIsExpanded(false), 300);
  }

  // Check if content is scrollable
  const [isScrollable, setIsScrollable] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setIsScrollable(el.scrollHeight > el.clientHeight + 40);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef, messages.length]);

  if (anchors.length < 2 || !isScrollable) return null;

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: isExpanded ? 240 : 28 }}
    >
      {/* Collapsed: Notion-style indicator dashes — vertically centered */}
      <div
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-end gap-2 transition-opacity duration-200",
          isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        {anchors.map((anchor) => {
          // Bar width encodes topic depth — longer messages get wider bars
          const len = anchor.content?.length ?? 0;
          const width = Math.min(15, Math.max(5, Math.round(5 + len * 0.18)));
          const isActive = activeAnchorId === anchor.id;
          return (
            <div
              key={anchor.id}
              className={cn(
                "h-[2px] rounded-full transition-colors duration-150",
                isActive ? "bg-foreground/55" : "bg-foreground/25"
              )}
              style={{ width }}
            />
          );
        })}
      </div>

      {/* Expanded: Notion-style outline — subtle bg for readability */}
      <div
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 w-[220px] rounded-lg border border-border/70 bg-background/95 backdrop-blur-sm shadow-md py-2 px-3 transition-all duration-200 ease-out",
          isExpanded
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-1 pointer-events-none"
        )}
      >
        <nav className="flex flex-col">
          {anchors.map((anchor) => {
            const preview = anchor.content?.slice(0, 46) || "";
            const isActive = activeAnchorId === anchor.id;

            return (
              <button
                key={anchor.id}
                type="button"
                onClick={() => handleClick(anchor.id)}
                className={cn(
                  "w-full text-left text-[13px] leading-snug py-1.5 transition-colors duration-100",
                  isActive
                    ? "text-blue-500"
                    : "text-muted-foreground/80 hover:text-foreground"
                )}
              >
                {preview}{preview.length >= 46 ? "…" : ""}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
