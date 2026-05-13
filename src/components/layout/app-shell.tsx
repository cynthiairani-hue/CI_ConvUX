"use client";

import { type ReactNode } from "react";
import { LeftRail } from "./left-rail";
import { MainCanvas } from "./main-canvas";
import { AIDockedPanel } from "@/components/ai-companion/ai-docked-panel";
import { AIFullscreen } from "@/components/ai-companion/ai-fullscreen";
import { useAICompanion } from "@/contexts/ai-companion-context";
export function AppShell({ children }: { children: ReactNode }) {
  const { state, dockSide } = useAICompanion();

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <LeftRail />
        {state === "docked" && dockSide === "left" && <AIDockedPanel />}
        <MainCanvas>{children}</MainCanvas>
        {state === "docked" && dockSide === "right" && <AIDockedPanel />}
      </div>
      {state === "fullscreen" && <AIFullscreen />}
    </>
  );
}
