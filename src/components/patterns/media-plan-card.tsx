"use client";

import { useEffect, useState } from "react";
import {
  Check, Megaphone, Target, Zap, TrendingUp, TrendingDown, Sparkles, AlertTriangle, BarChart3, Plus, X, Copy,
} from "lucide-react";
import type {
  FunnelStage, MediaCampaign, MediaChannelKey, MediaPlan,
} from "@/types/campaign";
import { editCampaignBudget, toggleCampaign, setTotalBudget, addCampaignLine, removeCampaign, editCampaignFields, addBlankLine, CHANNEL_OPTIONS } from "@/data/media-plan-flow";
import { cn } from "@/lib/utils";

interface MediaPlanCardProps {
  plan: MediaPlan;
  /** Single source of truth: every edit returns a recalculated plan to the host. */
  onChange: (plan: MediaPlan) => void;
}

/** Data-viz palette for the client-evidence channel mix (meaningful, not decorative). */
const EV_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];

const STAGE_META: Record<FunnelStage, { label: string; tagline: string; icon: typeof Megaphone }> = {
  awareness: { label: "Awareness", tagline: "Reach new audiences & build brand recognition", icon: Megaphone },
  consideration: { label: "Consideration", tagline: "Engage in-market prospects & drive interest", icon: Target },
  conversion: { label: "Conversion", tagline: "Convert warm audiences into customers", icon: Zap },
};

const STAGE_ORDER: FunnelStage[] = ["awareness", "consideration", "conversion"];

// The budget bar is split by FUNNEL STAGE (not channel) so it reads as the
// upper/mid/lower-funnel allocation — the thing a planner actually wants at a glance.
const STAGE_TINT: Record<FunnelStage, { bar: string; dot: string }> = {
  awareness: { bar: "bg-[#2C9FDD]", dot: "bg-[#2C9FDD]" },
  consideration: { bar: "bg-[#7C5CFC]", dot: "bg-[#7C5CFC]" },
  conversion: { bar: "bg-emerald-500", dot: "bg-emerald-500" },
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
function BudgetInput({ value, onCommit, aiHighlight }: { value: number; onCommit: (n: number) => void; aiHighlight?: boolean }) {
  const [draft, setDraft] = useState(value.toLocaleString());
  const [focused, setFocused] = useState(false);
  useEffect(() => setDraft(value.toLocaleString()), [value]);
  // A fresh AI change re-arms the purple highlight (even on the same field).
  useEffect(() => { if (aiHighlight) setFocused(false); }, [aiHighlight, value]);

  function commit() {
    const n = Number(draft.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n !== value) onCommit(n);
    else setDraft(value.toLocaleString());
  }

  const highlighted = aiHighlight && !focused;
  return (
    <div className={cn(
      "flex items-center rounded-lg border bg-white transition-colors",
      highlighted ? "border-[#7C5CFC] bg-[#F3F0FF]" : "border-border focus-within:border-[#2C9FDD]"
    )}>
      <span className="pl-2 text-[12px] text-muted-foreground">$</span>
      <input
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(value.toLocaleString());
        }}
        className="w-[72px] bg-transparent py-1 pl-0.5 pr-2 text-right text-[13px] font-medium text-foreground outline-none"
        aria-label="Channel budget"
      />
    </div>
  );
}

/** Inline text field for a line's location / creative — commits on blur / Enter. */
/** Click-to-edit line name (campaign type) — Enter commits, Escape cancels. */
function LineLabel({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() && draft !== value) onCommit(draft.trim()); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="rounded border border-[#2C9FDD] bg-white px-1 py-0.5 text-[13px] font-medium text-foreground outline-none"
        style={{ width: `${Math.max(draft.length, 8)}ch` }}
        aria-label="Line name"
      />
    );
  }
  return (
    <button type="button" onClick={() => setEditing(true)} className="rounded px-0.5 text-[13px] font-medium text-foreground hover:bg-accent" title="Click to rename">
      {value}
    </button>
  );
}

/** Channel picker — adds a fresh line/flight to a stage. Label configurable. */
function AddLinePicker({ onAdd, label = "Add line", block = false }: { onAdd: (channel: MediaChannelKey) => void; label?: string; block?: boolean }) {
  return (
    <div className={cn(
      "relative inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[12px] font-medium text-[#1A7BB5] transition-colors hover:bg-[#EBF5FB]",
      block && "flex w-full border border-dashed border-[#9ED0EC]"
    )}>
      <Plus className="h-3.5 w-3.5" />
      {label}
      <select
        value=""
        onChange={(e) => { if (e.target.value) onAdd(e.target.value as MediaChannelKey); e.currentTarget.value = ""; }}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={`${label} — choose channel`}
      >
        <option value="" disabled>Choose a channel…</option>
        {CHANNEL_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/** On/off toggle switch — matches the app's standard switch (settings, strategy card). */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-emerald-500" : "bg-[#D1D5DB]"
      )}
    >
      <span
        className={cn("inline-block rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-[3px]")}
        style={{ width: 15, height: 15 }}
      />
    </button>
  );
}

function KpiTile({
  label, value, delta, edit, aiHighlight,
}: {
  label: string;
  value: string;
  delta?: { up: boolean; text: string };
  /** When provided, the value becomes an editable budget field. */
  edit?: { amount: number; onCommit: (n: number) => void };
  aiHighlight?: boolean;
}) {
  const [draft, setDraft] = useState((edit?.amount ?? 0).toLocaleString());
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (edit) setDraft(edit.amount.toLocaleString());
  }, [edit?.amount]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (aiHighlight) setFocused(false); }, [aiHighlight, edit?.amount]);

  function commit() {
    if (!edit) return;
    const n = Number(draft.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n !== edit.amount) edit.onCommit(n);
    else setDraft(edit.amount.toLocaleString());
  }

  const highlighted = aiHighlight && !focused;
  return (
    <div className={cn(
      "rounded-xl border bg-white px-4 py-3 transition-colors",
      highlighted ? "border-[#7C5CFC] bg-[#F3F0FF]" : "border-border"
    )}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        {edit ? (
          <div className="flex items-baseline">
            <span className="text-[18px] font-semibold tracking-tight text-foreground">$</span>
            <input
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setDraft(edit.amount.toLocaleString());
              }}
              className="w-[100px] bg-transparent text-[18px] font-semibold tracking-tight text-foreground outline-none"
              aria-label="Total budget"
            />
          </div>
        ) : (
          <span className="text-[18px] font-semibold tracking-tight text-foreground">{value}</span>
        )}
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

/** Borderless inline grid cell — looks like text until hovered/focused. */
function CellInput({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onCommit(draft.trim()); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setDraft(value); (e.target as HTMLInputElement).blur(); }
      }}
      className="w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/45 hover:border-border focus:border-[#2C9FDD] focus:bg-white"
      aria-label={placeholder}
    />
  );
}

export function MediaPlanCard({ plan, onChange }: MediaPlanCardProps) {
  const [flash, setFlash] = useState(false);

  function pushFlash() {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1400);
  }
  // Manual edits clear the AI-change highlight (it's the human's edit now).
  function handleBudget(id: string, n: number) {
    onChange({ ...editCampaignBudget(plan, id, n), aiTouched: undefined });
    pushFlash();
  }
  function handleToggle(id: string) {
    onChange({ ...toggleCampaign(plan, id), aiTouched: undefined });
    pushFlash();
  }
  function handleTotal(n: number) {
    onChange({ ...setTotalBudget(plan, n), aiTouched: undefined });
    pushFlash();
  }
  function handleConnectPixel() {
    onChange({ ...plan, pixelReady: true, aiTouched: undefined });
  }
  function handleAddLine(sourceId: string) {
    const { plan: next } = addCampaignLine(plan, sourceId);
    onChange(next);
    pushFlash();
  }
  function handleRemoveLine(id: string) {
    onChange(removeCampaign(plan, id));
    pushFlash();
  }
  function handleField(id: string, fields: { label?: string; audience?: string; location?: string; creative?: string; keywords?: string; flightDates?: string }) {
    onChange(editCampaignFields(plan, id, fields));
  }
  function handleAddBlankLine(stage: FunnelStage, channel: MediaChannelKey) {
    const { plan: next } = addBlankLine(plan, stage, channel);
    onChange(next);
    pushFlash();
  }
  const aiTouched = plan.aiTouched ?? [];

  const { summary } = plan;
  const enabled = plan.campaigns.filter((c) => c.enabled);
  const convDelta = summary.estConversions - summary.targets.conversions;
  const roasDelta = summary.estRoas - summary.targets.roas;

  // Per-stage rollups (enabled only) for the stage headers + the allocation bar.
  function stageStat(stage: FunnelStage) {
    const cs = plan.campaigns.filter((c) => c.funnelStage === stage && c.enabled);
    const budget = cs.reduce((s, c) => s + c.budget, 0);
    const impressions = cs.reduce((s, c) => s + c.forecast.impressions, 0);
    const conversions = cs.reduce((s, c) => s + c.forecast.conversions, 0);
    const revenue = cs.reduce((s, c) => s + (c.forecast.roas != null ? c.forecast.roas * c.budget : 0), 0);
    const roas = budget > 0 ? Math.round((revenue / budget) * 10) / 10 : 0;
    const pct = summary.totalBudget > 0 ? Math.round((budget / summary.totalBudget) * 100) : 0;
    return { budget, impressions, conversions, roas, pct };
  }
  const linePct = (budget: number) =>
    summary.totalBudget > 0 ? Math.round((budget / summary.totalBudget) * 100) : 0;

  // Group every line item into flights (a channel group), in first-seen order.
  // This is the editor's grouping; recalc/summary are unaffected.
  const flightGroups: { channel: MediaChannelKey; lines: MediaCampaign[] }[] = [];
  {
    const idx: Record<string, number> = {};
    for (const c of plan.campaigns) {
      if (idx[c.channel] === undefined) { idx[c.channel] = flightGroups.length; flightGroups.push({ channel: c.channel, lines: [] }); }
      flightGroups[idx[c.channel]].lines.push(c);
    }
  }

  return (
    <div className="space-y-4">
      {/* Plan header */}
      <div className="rounded-xl border border-border bg-white p-5">
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

        {/* Budget allocation across the funnel */}
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
          {STAGE_ORDER.map((stage) => {
            const s = stageStat(stage);
            if (s.budget <= 0) return null;
            return (
              <div
                key={stage}
                className={cn("h-full", STAGE_TINT[stage].bar)}
                style={{ width: `${s.pct}%` }}
                title={`${STAGE_META[stage].label} · ${fmtMoney(s.budget)} · ${s.pct}%`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {STAGE_ORDER.map((stage) => {
            const s = stageStat(stage);
            if (s.budget <= 0) return null;
            return (
              <span key={stage} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", STAGE_TINT[stage].dot)} />
                {STAGE_META[stage].label} <span className="font-medium text-foreground">{s.pct}%</span>
              </span>
            );
          })}
        </div>

        {/* Data-personalization callout (progressive readiness) */}
        <div className={cn(
          "mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]",
          plan.pixelReady ? "bg-[#EBF5FB] text-[#1c6fa3]" : "bg-amber-50 text-amber-700"
        )}>
          {plan.pixelReady ? <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span className="flex-1">
            {plan.pixelReady
              ? <>Personalized from this advertiser&apos;s account data and <span className="font-medium">{plan.benchmarkBasis}</span>.</>
              : <>No pixel detected — projections use <span className="font-medium">{plan.benchmarkBasis}</span>. Connect it to personalize the forecast with real CPA history.</>}
          </span>
          {!plan.pixelReady && (
            <button
              type="button"
              onClick={handleConnectPixel}
              className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-foreground/90"
            >
              Connect pixel
            </button>
          )}
        </div>
      </div>

      {/* Client evidence — where they spend today (evidence before persuasion). */}
      {plan.evidence && (
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              {plan.evidence.label}
            </div>
            <span className="text-[11px] text-muted-foreground">{plan.evidence.basis}</span>
          </div>
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {plan.evidence.channels.map((c, i) => (
              <div
                key={c.channel}
                className={EV_COLORS[i % EV_COLORS.length]}
                style={{ width: `${Math.round(c.spendShare * 100)}%` }}
                title={`${c.channel} · ${Math.round(c.spendShare * 100)}% · ${c.roas.toFixed(1)}× ROAS`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {plan.evidence.channels.map((c, i) => (
              <span key={c.channel} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", EV_COLORS[i % EV_COLORS.length])} />
                {c.channel} <span className="font-medium text-foreground">{Math.round(c.spendShare * 100)}%</span>
                <span>· {c.roas.toFixed(1)}× ROAS</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Blended ROAS <span className="font-medium text-foreground">{plan.evidence.blendedRoas.toFixed(1)}×</span> over the last 90 days — this plan is anchored to it, not generic benchmarks.
          </p>
        </div>
      )}

      {/* Summary KPIs vs target */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Total budget" value={fmtMoney(summary.totalBudget)} edit={{ amount: summary.totalBudget, onCommit: handleTotal }} aiHighlight={aiTouched.includes("total")} />
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

      {/* Line-item grid — the editor real planners use (Mediaocean/Basis/Bionic):
          rows are line items (placements), grouped into FLIGHTS, with the
          standard columns. Scrolls horizontally for columns, vertically for
          lines. Every cell is inline-editable. */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[1060px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Line</th>
              <th className="px-2 py-2 font-medium">Channel</th>
              <th className="px-2 py-2 font-medium">Audience</th>
              <th className="px-2 py-2 font-medium">Geo / Market</th>
              <th className="px-2 py-2 font-medium">Creative</th>
              <th className="px-2 py-2 font-medium">Keywords</th>
              <th className="px-2 py-2 font-medium">Flight dates</th>
              <th className="px-2 py-2 text-right font-medium">Budget</th>
              <th className="px-2 py-2 font-medium">Est. results</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          {flightGroups.map((group, fi) => {
            const lines = group.lines;
            const flightBudget = lines.filter((l) => l.enabled).reduce((a, l) => a + l.budget, 0);
            const flightName = lines[0].label.replace(/\s*\(.+\)\s*$/, "");
            const stage = lines[0].funnelStage;
            return (
              <tbody key={group.channel} className="border-b border-border last:border-0">
                {/* Flight group header */}
                <tr className="bg-muted/40">
                  <td colSpan={7} className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1A7BB5]">Flight {fi + 1}</span>
                      <span className="text-[13px] font-medium text-foreground">{flightName}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{STAGE_META[stage].label}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right text-[12px] font-semibold text-foreground">{fmtMoney(flightBudget)}</td>
                  <td className="px-2 py-2 text-[11px] text-muted-foreground">{linePct(flightBudget)}% of plan</td>
                  <td className="px-2 py-2 text-right">
                    <button type="button" onClick={() => handleAddLine(lines[0].id)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-[11px] font-medium text-[#1A7BB5] transition-colors hover:bg-[#EBF5FB]" title="Add a line to this flight">
                      <Plus className="h-3 w-3" /> Line
                    </button>
                  </td>
                </tr>
                {/* Line-item rows */}
                {lines.map((c, li) => {
                  const est = c.funnelStage === "awareness"
                    ? `${fmtImpr(c.forecast.impressions)} impr${c.forecast.cpm ? ` · $${c.forecast.cpm} CPM` : ""}`
                    : `${fmtNum(c.forecast.conversions)} conv${c.forecast.roas != null ? ` · ${c.forecast.roas}×` : ""}`;
                  return (
                    <tr key={c.id} className={cn("border-t border-border align-middle", !c.enabled && "opacity-50", aiTouched.includes(c.id) && "bg-[#F3F0FF]")}>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-muted-foreground">{li + 1}</span>
                          <LineLabel value={c.label} onCommit={(v) => handleField(c.id, { label: v })} />
                          {c.status === "closed_beta" && (
                            <span className="rounded-full bg-amber-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600">Beta</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5"><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{c.channel}</span></td>
                      <td className="px-1 py-1"><CellInput value={c.audience ?? ""} placeholder="—" onCommit={(v) => handleField(c.id, { audience: v })} /></td>
                      <td className="px-1 py-1"><CellInput value={c.location ?? ""} placeholder="—" onCommit={(v) => handleField(c.id, { location: v })} /></td>
                      <td className="px-1 py-1"><CellInput value={c.creative ?? ""} placeholder="—" onCommit={(v) => handleField(c.id, { creative: v })} /></td>
                      <td className="px-1 py-1"><CellInput value={c.keywords ?? ""} placeholder="—" onCommit={(v) => handleField(c.id, { keywords: v })} /></td>
                      <td className="px-1 py-1"><CellInput value={c.flightDates ?? ""} placeholder={plan.flight} onCommit={(v) => handleField(c.id, { flightDates: v })} /></td>
                      <td className="px-2 py-1.5 text-right"><BudgetInput value={c.budget} onCommit={(n) => handleBudget(c.id, n)} aiHighlight={aiTouched.includes(c.id)} /></td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-[11px] text-muted-foreground">{est}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <Toggle checked={c.enabled} onChange={() => handleToggle(c.id)} label="Toggle line" />
                          <button type="button" onClick={() => handleAddLine(c.id)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#EBF5FB] hover:text-[#1A7BB5]" title="Duplicate line"><Copy className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => handleRemoveLine(c.id)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600" title="Remove line"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
          {/* Add a new flight (channel group) */}
          <tbody>
            <tr className="border-t border-border">
              <td colSpan={10} className="px-3 py-2.5">
                <AddLinePicker
                  label="Add flight"
                  onAdd={(channel) => handleAddBlankLine(CHANNEL_OPTIONS.find((o) => o.key === channel)?.defaultStage ?? "awareness", channel)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Benchmark footer */}
      <p className="px-1 text-[11px] text-muted-foreground">
        Benchmarks: {plan.benchmarkBasis} · Adjust budgets inline above, or ask the AI to shift them.
      </p>
    </div>
  );
}
