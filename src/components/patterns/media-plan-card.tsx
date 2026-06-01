"use client";

import { Check, AlertTriangle, DollarSign, PieChart, Users, CalendarRange, Target, TrendingUp } from "lucide-react";
import type { MediaPlan, ReadinessState, StrategySection } from "@/types/campaign";

interface MediaPlanCardProps {
  plan: MediaPlan;
  onConnectPixel?: () => void;
}

function ReadinessBadge({ state }: { state: ReadinessState }) {
  if (state === "ready")
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
        <Check className="h-3 w-3" /> Ready
      </span>
    );
  if (state === "limited")
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
        <AlertTriangle className="h-3 w-3" /> Limited
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500">
      <AlertTriangle className="h-3 w-3" /> Blocked
    </span>
  );
}

function Section({
  icon,
  section,
  children,
}: {
  icon: React.ReactNode;
  section: StrategySection;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-[13px] font-medium text-foreground">{section.label}</span>
        <ReadinessBadge state={section.readiness} />
      </div>
      <div className="border-t border-border px-4 pb-4 pt-3">
        {children}
        <p className="mt-2 text-[12px] text-muted-foreground">{section.provenance.reasoning}</p>
      </div>
    </div>
  );
}

export function MediaPlanCard({ plan, onConnectPixel }: MediaPlanCardProps) {
  return (
    <div className="space-y-4">
      {/* Budget strip */}
      <Section icon={<DollarSign className="h-4 w-4" />} section={plan.budgetSection}>
        <p className="text-[15px] font-semibold text-foreground">
          ${plan.monthlyBudget.toLocaleString()}/mo
          <span className="ml-2 text-[12px] font-normal text-muted-foreground">· {plan.flight}</span>
        </p>
      </Section>

      {/* Channel mix — the hero */}
      <Section icon={<PieChart className="h-4 w-4" />} section={plan.channelMix}>
        <div className="space-y-2.5">
          {plan.channelMix.data.map((c) => (
            <div key={c.channel}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground">{c.channel}</span>
                <span className="text-muted-foreground">
                  {c.pct}% · <span className="font-medium text-foreground">${c.monthly.toLocaleString()}/mo</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[#2C9FDD]" style={{ width: `${c.pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{c.rationale}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Audience strategy */}
      <Section icon={<Users className="h-4 w-4" />} section={plan.audienceStrategy}>
        <p className="text-[13px] text-foreground">{plan.audienceStrategy.value}</p>
      </Section>

      {/* Phasing */}
      <Section icon={<CalendarRange className="h-4 w-4" />} section={plan.phasing}>
        <p className="text-[13px] text-foreground">{plan.phasing.value}</p>
      </Section>

      {/* KPI targets */}
      <Section icon={<Target className="h-4 w-4" />} section={plan.kpiTargets}>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Metric</th>
                <th className="px-3 py-2 text-right font-medium">M1</th>
                <th className="px-3 py-2 text-right font-medium">M2</th>
                <th className="px-3 py-2 text-right font-medium">M3</th>
                <th className="px-3 py-2 text-left font-medium">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {plan.kpiTargets.data.map((k) => (
                <tr key={k.metric} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-medium text-foreground">{k.metric}</td>
                  <td className="px-3 py-2 text-right text-foreground">{k.m1}</td>
                  <td className="px-3 py-2 text-right text-foreground">{k.m2}</td>
                  <td className="px-3 py-2 text-right text-foreground">{k.m3}</td>
                  <td className="px-3 py-2 text-muted-foreground">{k.tracking}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {plan.kpiTargets.readiness === "limited" && (
          <button
            type="button"
            onClick={onConnectPixel}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-foreground/90"
          >
            Connect your site pixel
          </button>
        )}
      </Section>

      {/* Forecast */}
      <Section icon={<TrendingUp className="h-4 w-4" />} section={plan.forecast}>
        <p className="text-[13px] text-foreground">{plan.forecast.value}</p>
      </Section>
    </div>
  );
}
