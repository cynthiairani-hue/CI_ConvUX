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
  const essentialTasks = tasks.filter((t) => t.priority === "essential");
  const optionalTasks = tasks.filter((t) => t.priority === "optional");
  const completedCount = tasks.filter((t) => t.status === "complete").length;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Welcome to FuseIQ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let&apos;s get your {activePersona.verticalLabel.toLowerCase()}{" "}
          campaigns up and running.
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Get started
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Complete these steps to launch your first campaign.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-foreground transition-all"
                style={{
                  width: `${(completedCount / tasks.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {completedCount}/{tasks.length}
            </span>
          </div>
        </div>
        <div className="divide-y">
          {essentialTasks.map((task) => (
            <GettingStartedCard key={task.id} task={task} />
          ))}
        </div>
      </div>

      {optionalTasks.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Nice to have
          </h2>
          <div className="space-y-2">
            {optionalTasks.map((task) => (
              <GettingStartedCard key={task.id} task={task} compact />
            ))}
          </div>
        </div>
      )}

      {state === "resting" && (
        <div className="pt-2">
          <CanvasChatInput />
        </div>
      )}
    </div>
  );
}
