"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { ChatMessage } from "@/contexts/ai-companion-context";

const PAGE_SIZE = 20;

/**
 * Paginates a chat message list — shows the latest PAGE_SIZE messages,
 * with a "Load earlier" action to reveal more in batches.
 *
 * Resets when the conversation changes (detected via first message id).
 * Auto-expands only for incremental new messages (user chatting),
 * not for bulk session loads.
 */
export function useChatPagination(messages: ChatMessage[]) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLengthRef = useRef(0);
  // Track whether we've settled after a session switch
  const sessionSwitchRef = useRef(true);

  const firstId = messages[0]?.id ?? null;

  useEffect(() => {
    if (firstId !== prevFirstIdRef.current) {
      // Session changed — reset to page size, mark as switch
      setVisibleCount(PAGE_SIZE);
      prevFirstIdRef.current = firstId;
      prevLengthRef.current = messages.length;
      sessionSwitchRef.current = true;
    } else if (sessionSwitchRef.current) {
      // First render after session switch settled — anchor the length
      prevLengthRef.current = messages.length;
      sessionSwitchRef.current = false;
    } else {
      // Same session, incremental messages — auto-expand
      const delta = messages.length - prevLengthRef.current;
      if (delta > 0) {
        setVisibleCount((prev) => prev + delta);
      }
      prevLengthRef.current = messages.length;
    }
  }, [firstId, messages.length]);

  const hasEarlier = visibleCount < messages.length;

  const visibleMessages = useMemo(() => {
    if (!hasEarlier) return messages;
    return messages.slice(messages.length - visibleCount);
  }, [messages, visibleCount, hasEarlier]);

  const loadEarlier = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, messages.length));
  }, [messages.length]);

  const earlierCount = hasEarlier
    ? Math.min(PAGE_SIZE, messages.length - visibleCount)
    : 0;

  return { visibleMessages, hasEarlier, loadEarlier, earlierCount };
}
