"use client";

import { usePersona } from "@/contexts/persona-context";
import { gettingStartedTasks } from "@/data/personas";
import { GettingStartedCard } from "./getting-started-card";
import { CanvasChatInput } from "@/components/ai-companion/canvas-chat-input";
import { useAICompanion } from "@/contexts/ai-companion-context";

export function DashboardView() {
  const { activePersona } = usePersona();
  const { state } = useAICompanion();
  const tasks = gettingStartedTasks[activePersona.id];
  const completedCount = tasks.filter((t) => t.status === "complete").length;

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Welcome to FuseIQ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let&apos;s get your {activePersona.verticalLabel.toLowerCase()}{" "}
          campaigns up and running. Complete these steps to get started.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-foreground transition-all"
              style={{
                width: `${(completedCount / tasks.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount} of {tasks.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <GettingStartedCard key={task.id} task={task} />
        ))}
      </div>

      {state === "resting" && (
        <div className="pt-2">
          <CanvasChatInput />
        </div>
      )}
    </div>
  );
}
