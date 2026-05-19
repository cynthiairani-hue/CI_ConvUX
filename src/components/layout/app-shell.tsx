"use client";

import { type ReactNode, useState, useCallback, useRef, useEffect } from "react";
import { Share2, Save } from "lucide-react";
import { LeftRail } from "./left-rail";
import { MainCanvas } from "./main-canvas";
import { AIDockedPanel } from "@/components/ai-companion/ai-docked-panel";
import { AIFullscreen } from "@/components/ai-companion/ai-fullscreen";
import { AISplitPanel } from "@/components/ai-companion/ai-split-panel";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import { StrategyCard } from "@/components/patterns/strategy-card";
import { Toast } from "@/components/ui/toast-notification";

const MIN_CHAT_WIDTH = 320;
const MAX_CHAT_WIDTH = 640;
const DEFAULT_CHAT_WIDTH = 420;

function SplitCanvas({ strategy }: { strategy: NonNullable<ReturnType<typeof useCampaign>["activeStrategy"]> }) {
  const { saveStrategy, showToast } = useCampaign();

  function handleSaveDraft() {
    saveStrategy({ ...strategy, status: "draft", lastModifiedAt: new Date().toISOString() });
    showToast("Strategy saved as draft");
  }

  function handleShare() {
    showToast("Share link copied to clipboard");
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Canvas header with CTAs */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold text-[#394859]">{strategy.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-[#E0E8F2] px-3 py-1.5 text-[12px] font-medium text-[#394859] transition-colors hover:bg-[#F7F9FB]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 rounded-lg bg-[#2C9FDD] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#1A7BB5]"
          >
            <Save className="h-3.5 w-3.5" />
            Save draft
          </button>
        </div>
      </header>

      {/* Canvas content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <StrategyCard plan={strategy} />
        </div>
      </div>
    </main>
  );
}

/** Draggable divider between chat and canvas */
function ResizeDivider({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDrag(delta);
    },
    [onDrag]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center"
      onMouseDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        lastX.current = e.clientX;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
    >
      {/* Hover / active indicator */}
      <div className="absolute inset-y-0 -left-0.5 w-1.5 transition-colors group-hover:bg-[#2C9FDD]/30 group-active:bg-[#2C9FDD]/50" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dockSide } = useAICompanion();
  const { activeStrategy, savedStrategies } = useCampaign();
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);

  const strategy = activeStrategy || savedStrategies[savedStrategies.length - 1];

  const handleDrag = useCallback((deltaX: number) => {
    setChatWidth((prev) => Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, prev + deltaX)));
  }, []);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <LeftRail />
        {state === "split" && (
          <>
            <AISplitPanel width={chatWidth} />
            <ResizeDivider onDrag={handleDrag} />
          </>
        )}
        {state === "docked" && dockSide === "left" && <AIDockedPanel />}
        {state === "split" ? (
          strategy ? (
            <SplitCanvas strategy={strategy} />
          ) : (
            <main className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">No strategy to display</p>
            </main>
          )
        ) : (
          <MainCanvas>{children}</MainCanvas>
        )}
        {state === "docked" && dockSide === "right" && <AIDockedPanel />}
      </div>
      {state === "fullscreen" && <AIFullscreen />}
      <Toast />
    </>
  );
}
