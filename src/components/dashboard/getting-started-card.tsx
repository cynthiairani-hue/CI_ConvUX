"use client";

import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GettingStartedTask } from "@/types/persona";

export function GettingStartedCard({
  task,
  compact,
}: {
  task: GettingStartedTask;
  compact?: boolean;
}) {
  const isComplete = task.status === "complete";
  const isInProgress = task.status === "in-progress";

  if (compact) {
    return (
      <div
        className={cn(
          "group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
          isComplete
            ? "border-emerald-200 bg-emerald-50/50"
            : "hover:border-foreground/20 hover:bg-accent/30"
        )}
      >
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
            isComplete
              ? "border-emerald-500 bg-emerald-500"
              : "border-border"
          )}
        >
          {isComplete && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "text-sm font-medium",
              isComplete && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </h3>
          <p className="text-xs text-muted-foreground">{task.description}</p>
        </div>
        {!isComplete && (
          <button className="shrink-0 text-sm font-medium text-foreground transition-colors hover:text-foreground/70">
            {task.cta}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-4 px-6 py-5 transition-colors",
        isComplete
          ? "bg-emerald-50/50"
          : "hover:bg-accent/30"
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
          isComplete
            ? "border-emerald-500 bg-emerald-500"
            : isInProgress
              ? "border-foreground/30"
              : "border-border"
        )}
      >
        {isComplete && <Check className="h-3.5 w-3.5 text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "text-sm font-medium",
            isComplete && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {task.description}
        </p>
        {!isComplete && (
          <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/70">
            {task.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
