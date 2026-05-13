"use client";

import { useState } from "react";
import { usePersona } from "@/contexts/persona-context";
import { gettingStartedTasks } from "@/data/personas";
import { CanvasChatInput } from "@/components/ai-companion/canvas-chat-input";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GettingStartedTask } from "@/types/persona";

function TaskRow({
  task,
  isExpanded,
  onToggle,
}: {
  task: GettingStartedTask;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isComplete = task.status === "complete";

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-accent/30",
          isExpanded && "bg-accent/20"
        )}
      >
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
            isComplete
              ? "border-emerald-500 bg-emerald-500"
              : isExpanded
                ? "border-foreground/40"
                : "border-border"
          )}
        >
          {isComplete && <Check className="h-3.5 w-3.5 text-white" />}
        </div>
        <span
          className={cn(
            "flex-1 text-sm font-medium",
            isComplete && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-6 pb-5 pl-15">
          <div className="ml-9">
            <p className="text-sm text-muted-foreground">{task.description}</p>
            {!isComplete && (
              <button className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
                {task.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardView() {
  const { activePersona } = usePersona();
  const { state } = useAICompanion();
  const tasks = gettingStartedTasks[activePersona.id];
  const essentialTasks = tasks.filter((t) => t.priority === "essential");
  const optionalTasks = tasks.filter((t) => t.priority === "optional");
  const completedCount = tasks.filter((t) => t.status === "complete").length;

  const firstIncomplete = tasks.find((t) => t.status !== "complete");
  const [expandedId, setExpandedId] = useState<string | null>(
    firstIncomplete?.id ?? null
  );

  function toggleTask(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Welcome to FuseIQ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this personalized guide to get your{" "}
          {activePersona.verticalLabel.toLowerCase()} campaigns up and running.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Setup guide
          </h2>
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
              {completedCount} of {tasks.length} done
            </span>
          </div>
        </div>

        <div className="border-t">
          {essentialTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isExpanded={expandedId === task.id}
              onToggle={() => toggleTask(task.id)}
            />
          ))}
        </div>

        {optionalTasks.length > 0 && (
          <>
            <div className="border-t px-6 py-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nice to have
              </span>
            </div>
            <div>
              {optionalTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isExpanded={expandedId === task.id}
                  onToggle={() => toggleTask(task.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {state === "resting" && (
        <div className="pt-2">
          <CanvasChatInput />
        </div>
      )}
    </div>
  );
}
