"use client";

import { useState, useEffect } from "react";
import { universalTasks } from "@/data/personas";
import { CanvasChatInput } from "@/components/ai-companion/canvas-chat-input";
import { useAICompanion } from "@/contexts/ai-companion-context";
import {
  Megaphone,
  Database,
  Users,
  DollarSign,
  Building2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GettingStartedTask } from "@/types/persona";
import type { LucideIcon } from "lucide-react";

const taskIcons: Record<string, LucideIcon> = {
  "first-campaign": Megaphone,
  "connect-data": Database,
  "build-audience": Users,
  "set-budget": DollarSign,
};

function HeroCard({
  task,
  onAction,
}: {
  task: GettingStartedTask;
  onAction: () => void;
}) {
  const Icon = taskIcons[task.id] || Building2;

  return (
    <div className="flex flex-col items-center rounded-xl bg-background px-8 py-10 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-6 w-6 text-foreground/70" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {task.description}
      </p>
      <button
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        <Sparkles className="h-4 w-4" />
        {task.cta}
      </button>
    </div>
  );
}

function SecondaryCard({ task }: { task: GettingStartedTask }) {
  const Icon = taskIcons[task.id] || Building2;

  return (
    <div className="flex flex-col items-center rounded-xl bg-background px-4 py-6 text-center transition-shadow hover:shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
        {task.description}
      </p>
      <button className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
        {task.cta}
      </button>
    </div>
  );
}

const taskActions: Record<string, string> = {
  "first-campaign": "campaign",
  "connect-data": "Help me connect a data source",
  "build-audience": "Help me build an audience",
  "set-budget": "Help me set my budget",
};

function getUserName(): string {
  if (typeof window === "undefined") return "there";
  try {
    const stored = localStorage.getItem("fuseiq-user");
    if (stored) {
      const { name } = JSON.parse(stored);
      if (name) return name.split(" ")[0];
    }
  } catch {
    // ignore
  }
  return "there";
}

export function DashboardView() {
  const { state, openFullscreen, startCampaignFlow } = useAICompanion();
  const [userName, setUserName] = useState("there");

  useEffect(() => {
    setUserName(getUserName());
  }, []);

  const essentialTasks = universalTasks.filter((t) => t.priority === "essential");
  const optionalTasks = universalTasks.filter((t) => t.priority === "optional");

  function handleTaskAction(taskId: string) {
    const action = taskActions[taskId];
    if (action === "campaign") {
      startCampaignFlow();
    } else if (action) {
      openFullscreen(action);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-10">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Welcome, {userName}
      </h1>

      {state === "resting" && <CanvasChatInput />}

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">
          Start building
        </h2>
        <div className="space-y-3 rounded-2xl bg-muted/60 p-3">
          {essentialTasks.map((task) => (
            <HeroCard
              key={task.id}
              task={task}
              onAction={() => handleTaskAction(task.id)}
            />
          ))}

          {optionalTasks.length > 0 && (
            <div
              className={cn(
                "grid gap-3",
                optionalTasks.length >= 3
                  ? "grid-cols-3"
                  : `grid-cols-${optionalTasks.length}`
              )}
            >
              {optionalTasks.map((task) => (
                <SecondaryCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
