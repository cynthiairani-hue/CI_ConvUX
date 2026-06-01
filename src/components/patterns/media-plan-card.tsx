"use client";

import { useEffect, useState } from "react";
import {
  Check, Megaphone, Target, Zap, TrendingUp, TrendingDown, Sparkles, AlertTriangle, Power,
} from "lucide-react";
import type {
  FunnelStage, MediaCampaign, MediaPlan,
} from "@/types/campaign";
import { editCampaignBudget, toggleCampaign } from "@/data/media-plan-flow";
import { cn } from "@/lib/utils";

interface MediaPlanCardProps {
  plan: MediaPlan;
  /** Single source of truth: every edit returns a recalculated plan to the host. */
  onChange: (plan: MediaPlan) => void;
}

const STAGE_META: Record<FunnelStage, { label: string; tagline: string; icon: typeof Megaphone }> = {
  awareness: { label: "Awareness", tagline: "Reach new audiences & build brand recognition", icon: Megaphone },
  consideration: { label: "Consideration", tagline: "Engage in-market prospects & drive interest", icon: Target },
  conversion: { label: "Conversion", tagline: "Convert warm audiences into customers", icon: Zap },
};

const STAGE_ORDER: FunnelStage[] = ["awareness", "consideration", "conversion"];

const CHANNEL_TINT: Record<string, string> = {
  ctv: "bg-[#2C9FDD]",
  dooh: "bg-[#7C5CFC]",
  lookalike: "bg-emerald-500",
  social: "bg-amber-500",
  retargeting: "bg-rose-500",
};

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtImpr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString();
}

/** Inline budget input — local draft, commits on blur / Enter, re-syncs to plan. */
function BudgetInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const n = Number(draft.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n !== value) onCommit(n);
    else setDraft(String(value));
  }

  return (
    <div className="flex items-center rounded-md border border-border bg-white focus-within:border-ring">
      <span className="pl-2 text-[12px] text-muted-foreground">$</span>
      <input
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(String(value));
        }}
        className="w-[72px] bg-transparent py-1 pl-0.5 pr-2 text-right text-[13px] font-medium text-foreground outline-none"
        aria-label="Channel budget"
      />
    </div>
  );
}

/** Specialty / standard metrics for one row. */
function RowMetrics({ c }: { c: MediaCampaign }) {
  const f = c.forecast;
  const chips: { label: string; value: string }[] = [{ label: "Impr.", value: fmtImpr(f.impressions) }];
  if (c.funnelStage === "awareness") {
    if (f.vtr != null) chips.push({ label: "VTR", value: `${f.vtr}%` });
    if (f.brandLift != null) chips.push({ label: "Brand lift", value: `+${f.brandLift}%` });
    if (f.cpm != null) chips.push({ label: "CPM", value: `$${f.cpm}` });
    if (f.markets != null) chips.push({ label: "Markets", value: `${f.markets}` });
    if (f.audiencePool != null) chips.push({ label: "Pool", value: fmtImpr(f.audiencePool) });
  } else {
    chips.push({ label: "Conv.", value: fmtNum(f.conversions) });
    if (f.roas != null) chips.push({ label: "ROAS", value: `${f.roas}×` });
    if (f.cpa != null) chips.push({ label: "CPA", value: `$${f.cpa}` });
  }
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
      {chips.map((m) => (
        <span key={m.label} className="text-[12px] text-muted-foreground">
          {m.label} <span className="font-medium text-foreground">{m.value}</span>
        </span>
      ))}
    </div>
  );
}

function KpiTile({ label, value, delta }: { label: string; value: string; delta?: { up: boolean; text: string } }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[18px] font-semibold tracking-tight text-foreground">{value}</span>
        {delta && (
          <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", delta.up ? "text-emerald-600" : "text-rose-500")}>
            {delta.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta.text}
          </span>
        )}
      </div>
    </div>
  );
}

export function MediaPlanCard({ plan, onChange }: MediaPlanCardProps) {
  const [flash, setFlash] = useState(false);

  function pushFlash() {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1400);
  }
  function handleBudget(id: string, n: number) {
    onChange(editCampaignBudget(plan, id, n));
    pushFlash();
  }
  function handleToggle(id: string) {
    onChange(toggleCampaign(plan, id));
    pushFlash();
  }

  const { summary } = plan;
  const enabled = plan.campaigns.filter((c) => c.enabled);
  const convDelta = summary.estConversions - summary.targets.conversions;
  const roasDelta = summary.estRoas - summary.targets.roas;

  return (
    <div className="space-y-4">
      {/* Plan header */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{plan.name}</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {fmtMoney(summary.totalBudget)} across {enabled.length} {enabled.length === 1 ? "channel" : "channels"} · {plan.flight} · {plan.durationDays} days
            </p>
          </div>
          {flash && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
              <Check className="h-3 w-3" /> Plan updated
            </span>
          )}
        </div>

        {/* Budget bar viz */}
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
          {enabled.map((c) => (
            <div
              key={c.id}
              className={cn("h-full", CHANNEL_TINT[c.channel] ?? "bg-foreground")}
              style={{ width: `${summary.totalBudget > 0 ? (c.budget / summary.totalBudget) * 100 : 0}%` }}
              title={`${c.label} · ${fmtMoney(c.budget)}`}
            />
          ))}
        </div>

        {/* Data-personalization callout (progressive readiness) */}
        <div className={cn(
          "mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]",
          plan.pixelReady ? "bg-[#EBF5FB] text-[#1c6fa3]" : "bg-amber-50 text-amber-700"
        )}>
          {plan.pixelReady ? <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>
            {plan.pixelReady
              ? <>Personalized from this advertiser&apos;s account data and <span className="font-medium">{plan.benchmarkBasis}</span>.</>
              : <>No pixel detected — projections use <span className="font-medium">{plan.benchmarkBasis}</span> instead.</>}
          </span>
        </div>
      </div>

      {/* Summary KPIs vs target */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Total budget" value={fmtMoney(summary.totalBudget)} />
        <KpiTile
          label="Est. conversions"
          value={fmtNum(summary.estConversions)}
          delta={{ up: convDelta >= 0, text: `vs ${fmtNum(summary.targets.conversions)}` }}
        />
        <KpiTile
          label="Est. ROAS"
          value={`${summary.estRoas}×`}
          delta={{ up: roasDelta >= 0, text: `vs ${summary.targets.roas}×` }}
        />
        <KpiTile label="Est. impressions" value={fmtImpr(summary.estImpressions)} />
      </div>

      {/* Funnel-grouped campaign rows */}
      {STAGE_ORDER.map((stage) => {
        const rows = plan.campaigns.filter((c) => c.funnelStage === stage);
        if (rows.length === 0) return null;
        const meta = STAGE_META[stage];
        const Icon = meta.icon;
        return (
          <div key={stage} className="rounded-2xl border border-border bg-white">
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-[13px] font-semibold text-foreground">{meta.label}</div>
                <div className="text-[11px] text-muted-foreground">{meta.tagline}</div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((c) => (
                <div key={c.id} className={cn("flex items-start gap-3 px-4 py-3", !c.enabled && "opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{c.label}</span>
                      {c.status === "closed_beta" && (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                          Closed beta
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {c.description}
                      {c.status === "closed_beta" && " · we'll help activate this manually"}
                    </p>
                    <RowMetrics c={c} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <BudgetInput value={c.budget} onCommit={(n) => handleBudget(c.id, n)} />
                    <button
                      type="button"
                      onClick={() => handleToggle(c.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                        c.enabled ? "text-muted-foreground hover:bg-accent" : "text-foreground hover:bg-accent"
                      )}
                      aria-label={c.enabled ? "Turn channel off" : "Turn channel on"}
                    >
                      <Power className="h-3 w-3" /> {c.enabled ? "On" : "Off"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Benchmark footer */}
      <p className="px-1 text-[11px] text-muted-foreground">
        Benchmarks: {plan.benchmarkBasis} · Adjust budgets inline above, or ask the AI to shift them.
      </p>
    </div>
  );
}
