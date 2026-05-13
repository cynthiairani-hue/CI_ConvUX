"use client";

import { usePersona } from "@/contexts/persona-context";
import { dashboards } from "@/data/personas";
import { MetricCard } from "./metric-card";
import { CanvasChatInput } from "@/components/ai-companion/canvas-chat-input";
import { useAICompanion } from "@/contexts/ai-companion-context";

export function DashboardView() {
  const { activePersona } = usePersona();
  const { state } = useAICompanion();
  const dashboard = dashboards[activePersona.id];

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {dashboard.heading}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dashboard.subheading}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {state === "resting" && (
        <div className="pt-6">
          <CanvasChatInput />
        </div>
      )}
    </div>
  );
}
