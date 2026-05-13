"use client";

import { usePersona } from "@/contexts/persona-context";
import { gettingStartedTasks } from "@/data/personas";
import { CanvasChatInput } from "@/components/ai-companion/canvas-chat-input";
import { useAICompanion } from "@/contexts/ai-companion-context";
import {
  Store,
  Megaphone,
  Users,
  DollarSign,
  Database,
  Building2,
  UserPlus,
  Target,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GettingStartedTask } from "@/types/persona";
import type { LucideIcon } from "lucide-react";

const taskIcons: Record<string, LucideIcon> = {
  "connect-store": Store,
  "first-campaign": Megaphone,
  "define-audience": Users,
  "set-budget": DollarSign,
  "connect-crm": Database,
  "target-accounts": Target,
  "add-client": UserPlus,
  "connect-data": FolderOpen,
};

function PrimaryTaskCard({ task }: { task: GettingStartedTask }) {
  const Icon = taskIcons[task.id] || Building2;

  return (
    <div className="flex flex-col rounded-xl border bg-card p-6 transition-colors hover:border-foreground/20">
      <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-muted/50">
        <Icon className="h-10 w-10 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">
        {task.description}
      </p>
      <div className="mt-4">
        <button className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
          {task.cta}
        </button>
      </div>
    </div>
  );
}

function SecondaryTaskCard({ task }: { task: GettingStartedTask }) {
  const Icon = taskIcons[task.id] || Building2;

  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20">
      <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <button className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
        {task.cta}
      </button>
    </div>
  );
}

export function DashboardView() {
  const { activePersona } = usePersona();
  const { state } = useAICompanion();
  const tasks = gettingStartedTasks[activePersona.id];
  const essentialTasks = tasks.filter((t) => t.priority === "essential");
  const optionalTasks = tasks.filter((t) => t.priority === "optional");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Good to see you. Let&apos;s get started.
        </h1>
      </div>

      {state === "resting" && <CanvasChatInput />}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className={cn(
          "grid gap-px bg-border",
          essentialTasks.length === 2 ? "grid-cols-2" : "grid-cols-1"
        )}>
          {essentialTasks.map((task) => (
            <div key={task.id} className="bg-card">
              <PrimaryTaskCard task={task} />
            </div>
          ))}
        </div>

        {optionalTasks.length > 0 && (
          <div className={cn(
            "grid gap-px border-t bg-border",
            optionalTasks.length >= 3 ? "grid-cols-3" : `grid-cols-${optionalTasks.length}`
          )}>
            {optionalTasks.map((task) => (
              <div key={task.id} className="bg-card">
                <SecondaryTaskCard task={task} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
