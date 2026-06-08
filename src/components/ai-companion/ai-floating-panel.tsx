"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { X, ChevronUp } from "lucide-react";
import { useChatPagination } from "@/hooks/use-chat-pagination";
import { ChatScrollMinimap } from "./chat-scroll-minimap";
import { cn } from "@/lib/utils";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { AIMessage } from "./ai-message";
import { AIInput } from "./ai-input";
import { ChatChoices } from "./chat-choices";
import { AdvertiserSetupForm } from "./advertiser-setup-form";
import { KeywordChipSelector } from "./keyword-chip-selector";
import { ChatSettingsMenu } from "./chat-settings-menu";
import { ChatLayoutPicker } from "./chat-layout-picker";
import { ChatOverflowMenu } from "./chat-overflow-menu";
import { ChatHeaderMenu } from "./chat-header-menu";
import { PlatformConnectionCard } from "./platform-connection-card";
import { ArtifactPreviewCard } from "./artifact-preview-card";

const STORAGE_KEY = "fuseiq-floating-panel";

interface FloatingGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_GEOMETRY: FloatingGeometry = {
  x: -1, // -1 = auto-position on first render
  y: -1,
  width: 380,
  height: 520,
};

const MIN_WIDTH = 320;
const MIN_HEIGHT = 360;

function isValidGeometry(g: unknown): g is FloatingGeometry {
  if (!g || typeof g !== "object") return false;
  const { x, y, width, height } = g as Record<string, unknown>;
  return [x, y, width, height].every((n) => typeof n === "number" && Number.isFinite(n));
}

function loadGeometry(): FloatingGeometry {
  if (typeof window === "undefined") return DEFAULT_GEOMETRY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidGeometry(parsed)) return parsed;
    }
  } catch {}
  return DEFAULT_GEOMETRY;
}

function saveGeometry(g: FloatingGeometry) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(g));
}

export function AIFloatingPanel() {
  const {
    messages, isLoading, sendMessage, submitChoice, skipChoice,
    submitAdvertiserSetup, submitKeywords, submitPlatformConnection, close,
  } = useAICompanion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { visibleMessages, hasEarlier, loadEarlier, earlierCount } = useChatPagination(messages);

  const handleLoadEarlier = useCallback(() => {
    const el = scrollRef.current;
    if (!el) { loadEarlier(); return; }
    const prevHeight = el.scrollHeight;
    const prevTop = el.scrollTop;
    loadEarlier();
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight + prevTop;
      }
    });
  }, [loadEarlier]);

  const [geo, setGeo] = useState<FloatingGeometry>(loadGeometry);

  // Auto-position on first render if default
  useEffect(() => {
    if (geo.x === -1 || geo.y === -1) {
      const x = window.innerWidth - geo.width - 24;
      const y = window.innerHeight - geo.height - 24;
      const initial = { ...geo, x: Math.max(24, x), y: Math.max(24, y) };
      setGeo(initial);
      saveGeometry(initial);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist geometry changes
  useEffect(() => {
    if (geo.x >= 0 && geo.y >= 0) saveGeometry(geo);
  }, [geo]);

  const activeToolCall = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].toolCall) return messages[i];
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Drag logic ---
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onDragMouseMove = useCallback((e: MouseEvent) => {
    // Capture the drag state into a local BEFORE setGeo. The functional updater
    // runs later during render — if mouseup nulled the ref by then, dereferencing
    // dragState.current! would throw and crash the whole tree. The local is safe.
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    setGeo((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(window.innerWidth - prev.width, ds.origX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 40, ds.origY + dy)),
    }));
  }, []);

  const onDragMouseUp = useCallback(() => {
    dragState.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onDragMouseMove);
    window.addEventListener("mouseup", onDragMouseUp);
    return () => {
      window.removeEventListener("mousemove", onDragMouseMove);
      window.removeEventListener("mouseup", onDragMouseUp);
    };
  }, [onDragMouseMove, onDragMouseUp]);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: geo.x, origY: geo.y };
    document.body.style.cursor = "move";
    document.body.style.userSelect = "none";
  }

  // --- Resize logic ---
  const resizeState = useRef<{
    edge: string;
    startX: number; startY: number;
    origX: number; origY: number;
    origW: number; origH: number;
  } | null>(null);

  const onResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState.current) return;
    const rs = resizeState.current;
    const dx = e.clientX - rs.startX;
    const dy = e.clientY - rs.startY;

    setGeo((prev) => {
      let { x, y, width, height } = prev;
      const maxW = typeof window !== "undefined" ? window.innerWidth : 4096;
      const maxH = typeof window !== "undefined" ? window.innerHeight : 4096;

      if (rs.edge.includes("e")) {
        // Don't let the panel extend past the right edge.
        width = Math.max(MIN_WIDTH, Math.min(rs.origW + dx, maxW - rs.origX));
      }
      if (rs.edge.includes("w")) {
        // Clamp so the left edge can't cross 0 (newW capped at origX + origW).
        const newW = Math.max(MIN_WIDTH, Math.min(rs.origW - dx, rs.origX + rs.origW));
        x = rs.origX + (rs.origW - newW);
        width = newW;
      }
      if (rs.edge.includes("s")) {
        height = Math.max(MIN_HEIGHT, Math.min(rs.origH + dy, maxH - rs.origY));
      }
      if (rs.edge.includes("n")) {
        const newH = Math.max(MIN_HEIGHT, Math.min(rs.origH - dy, rs.origY + rs.origH));
        y = rs.origY + (rs.origH - newH);
        height = newH;
      }

      return { x, y, width, height };
    });
  }, []);

  const onResizeMouseUp = useCallback(() => {
    resizeState.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onResizeMouseMove);
    window.addEventListener("mouseup", onResizeMouseUp);
    return () => {
      window.removeEventListener("mousemove", onResizeMouseMove);
      window.removeEventListener("mouseup", onResizeMouseUp);
    };
  }, [onResizeMouseMove, onResizeMouseUp]);

  function startResize(edge: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizeState.current = {
        edge,
        startX: e.clientX, startY: e.clientY,
        origX: geo.x, origY: geo.y,
        origW: geo.width, origH: geo.height,
      };
      document.body.style.userSelect = "none";
    };
  }

  function renderToolCall() {
    if (!activeToolCall?.toolCall) return null;
    const tc = activeToolCall.toolCall;

    if (tc.type === "advertiser-setup") {
      return (
        <AdvertiserSetupForm
          key={activeToolCall.id}
          question={tc.question}
          step={tc.step}
          totalSteps={tc.totalSteps}
          onSubmit={(data) => submitAdvertiserSetup(activeToolCall.id, data)}
          onSkip={() => skipChoice(activeToolCall.id, tc.field)}
        />
      );
    }

    if (tc.type === "keywords") {
      return (
        <KeywordChipSelector
          key={activeToolCall.id}
          question={tc.question}
          step={tc.step}
          totalSteps={tc.totalSteps}
          keywords={tc.keywords}
          onSubmit={(selectedIds, allKeywords) =>
            submitKeywords(activeToolCall.id, selectedIds, allKeywords)
          }
          onSkip={() => skipChoice(activeToolCall.id, tc.field)}
        />
      );
    }

    if (tc.type === "platform-connect") {
      return (
        <PlatformConnectionCard
          key={activeToolCall.id}
          platformIds={tc.platformIds}
          onDone={(connectedIds) =>
            submitPlatformConnection(activeToolCall.id, connectedIds, tc.intentTag)
          }
        />
      );
    }

    if (tc.type === "choices") {
      return (
        <ChatChoices
          key={activeToolCall.id}
          question={tc.question}
          subtitle={tc.subtitle}
          step={tc.step}
          totalSteps={tc.totalSteps}
          options={tc.options}
          multiSelect={tc.multiSelect}
          onSubmit={(selected) =>
            submitChoice(activeToolCall.id, tc.field, selected)
          }
          onFreeText={(text) => sendMessage(text)}
          onCustomValue={(val) => submitChoice(activeToolCall.id, tc.field, [val])}
          onSkip={() => skipChoice(activeToolCall.id, tc.field)}
        />
      );
    }

    return null;
  }

  // Resize handle edge definitions
  const edges = [
    { id: "n",  cls: "top-0 left-2 right-2 h-1.5 cursor-n-resize" },
    { id: "s",  cls: "bottom-0 left-2 right-2 h-1.5 cursor-s-resize" },
    { id: "e",  cls: "right-0 top-2 bottom-2 w-1.5 cursor-e-resize" },
    { id: "w",  cls: "left-0 top-2 bottom-2 w-1.5 cursor-w-resize" },
    { id: "ne", cls: "top-0 right-0 h-3 w-3 cursor-ne-resize" },
    { id: "nw", cls: "top-0 left-0 h-3 w-3 cursor-nw-resize" },
    { id: "se", cls: "bottom-0 right-0 h-3 w-3 cursor-se-resize" },
    { id: "sw", cls: "bottom-0 left-0 h-3 w-3 cursor-sw-resize" },
  ];

  if (geo.x < 0) return null; // Wait for auto-position

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
      style={{
        left: geo.x,
        top: geo.y,
        width: geo.width,
        height: geo.height,
      }}
    >
      {/* Resize handles */}
      {edges.map((edge) => (
        <div
          key={edge.id}
          className={cn("absolute z-10", edge.cls)}
          onMouseDown={startResize(edge.id)}
        />
      ))}

      {/* Header — draggable */}
      <header
        className="flex h-12 shrink-0 cursor-move items-center justify-between border-b px-3 select-none"
        onMouseDown={startDrag}
      >
        <ChatHeaderMenu compact />
        <div className="flex items-center gap-0.5" onMouseDown={(e) => e.stopPropagation()}>
          <ChatSettingsMenu />
          <ChatLayoutPicker />
          <ChatOverflowMenu />
          <button
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <>
        <div className="relative flex-1 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto py-3">
            {hasEarlier && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={handleLoadEarlier}
                  className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronUp className="h-3 w-3" />
                  Load {earlierCount} earlier
                </button>
              </div>
            )}
            {visibleMessages.map((msg) => (
              <AIMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>
          <ChatScrollMinimap messages={visibleMessages} scrollRef={scrollRef} />
        </div>

          <div className="px-3 py-2 space-y-2">
            {activeToolCall?.toolCall && renderToolCall()}
            <ArtifactPreviewCard />
            <div className="rounded-lg border px-3 py-2">
              {/* autoFocus on mount (= on open) so the floating chat is ready to type. */}
              <AIInput onSend={sendMessage} autoFocus />
            </div>
          </div>
      </>
    </div>
  );
}
