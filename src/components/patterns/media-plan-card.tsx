"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Check, Megaphone, Target, Zap, TrendingUp, TrendingDown, Sparkles, AlertTriangle, BarChart3, Plus, Copy, ChevronDown, ChevronRight, Trash2, Pause, Play, Pencil,
} from "lucide-react";
import { Store, Plug } from "lucide-react";
import { CardOverflowMenu, type OverflowAction } from "@/components/patterns/card-overflow-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchPicker, type PickerOption } from "@/components/ui/search-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { AUDIENCE_LIBRARY, MARKETS, KEYWORD_SUGGESTIONS } from "@/data/planner-options";
import type {
  FunnelStage, MediaCampaign, MediaChannelKey, MediaPlan,
} from "@/types/campaign";
import { editCampaignBudget, toggleCampaign, setTotalBudget, addCampaignLine, removeCampaign, editCampaignFields, addBlankLine, CHANNEL_OPTIONS, getPlanInflight, type PlanInflight } from "@/data/media-plan-flow";
import { cn } from "@/lib/utils";

interface MediaPlanCardProps {
  plan: MediaPlan;
  /** Single source of truth: every edit returns a recalculated plan to the host. */
  onChange: (plan: MediaPlan) => void;
}

/** Data-viz palette for the client-evidence channel mix (meaningful, not decorative). */
// Neutral slate shades — this is historical reference data, deliberately NOT the
// funnel stage colors (blue/purple/green) so the two bars don't get confused.
const EV_COLORS = ["bg-slate-600", "bg-slate-400", "bg-slate-300", "bg-slate-500", "bg-slate-200"];

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
    <button type="button" onClick={() => setEditing(true)} className="min-w-0 truncate rounded px-0.5 text-left text-[13px] font-medium text-foreground hover:bg-accent" title={value}>
      {value}
    </button>
  );
}

/** Channel picker — adds a fresh line to a stage. Uses the standard SearchPicker
 *  dropdown (search + keyboard nav), same as audience/geo/keyword pickers. */
function AddLinePicker({ onAdd, label = "Add line" }: { onAdd: (channel: MediaChannelKey) => void; label?: string }) {
  return (
    <SearchPicker
      options={CHANNEL_OPTIONS.map((o) => ({ id: o.key, label: o.label }))}
      value=""
      onChange={(v) => onAdd(v as MediaChannelKey)}
      searchPlaceholder="Search channels…"
      trigger={() => (
        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-[#1A7BB5] transition-colors hover:bg-[#EBF5FB]">
          <Plus className="h-3.5 w-3.5" /> {label}
        </span>
      )}
    />
  );
}


function KpiTile({
  label, value, delta, edit, editTarget, aiHighlight,
}: {
  label: string;
  value: string;
  delta?: { up: boolean; text: string };
  /** When provided, the value becomes an editable budget field. */
  edit?: { amount: number; onCommit: (n: number) => void };
  /** When provided, the "vs <goal>" target is editable (planner sets the bar). */
  editTarget?: { amount: number; up: boolean; prefix?: string; suffix?: string; onCommit: (n: number) => void };
  aiHighlight?: boolean;
}) {
  const [draft, setDraft] = useState((edit?.amount ?? 0).toLocaleString());
  const [tDraft, setTDraft] = useState(String(editTarget?.amount ?? ""));
  useEffect(() => { if (editTarget) setTDraft(editTarget.amount.toLocaleString()); }, [editTarget?.amount]); // eslint-disable-line react-hooks/exhaustive-deps
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
          <label className="group/edit -ml-1.5 flex cursor-text items-baseline rounded-md border border-transparent px-1.5 py-0.5 transition-colors hover:border-border hover:bg-muted/40 focus-within:border-[#2C9FDD] focus-within:bg-white" title="Click to edit total budget">
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
              className="w-[92px] cursor-text bg-transparent text-[18px] font-semibold tracking-tight text-foreground outline-none"
              aria-label="Total budget"
            />
            <Pencil className="h-3 w-3 self-center text-transparent transition-colors group-hover/edit:text-muted-foreground/60" />
          </label>
        ) : (
          <span className="text-[18px] font-semibold tracking-tight text-foreground">{value}</span>
        )}
        {delta && !editTarget && (
          <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", delta.up ? "text-emerald-600" : "text-rose-500")}>
            {delta.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta.text}
          </span>
        )}
        {editTarget && (
          <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", editTarget.up ? "text-emerald-600" : "text-rose-500")}>
            {editTarget.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="text-muted-foreground">goal</span>
            {editTarget.prefix}
            <input
              inputMode="numeric"
              value={tDraft}
              onChange={(e) => setTDraft(e.target.value)}
              onBlur={() => { const n = Number(tDraft.replace(/[^0-9.]/g, "")); if (Number.isFinite(n) && n !== editTarget.amount) editTarget.onCommit(n); else setTDraft(editTarget.amount.toLocaleString()); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setTDraft(editTarget.amount.toLocaleString()); }}
              className="w-[52px] rounded border border-transparent bg-transparent px-0.5 text-[11px] font-medium text-foreground outline-none transition-colors hover:border-border focus:border-[#2C9FDD]"
              aria-label={`${label} goal`}
            />
            {editTarget.suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/** Labeled field for the expanded line detail panel. Commits on blur / Enter. */
function DetailField({ label, value, placeholder, onCommit }: { label: string; value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onCommit(draft.trim()); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setDraft(value); (e.target as HTMLInputElement).blur(); }
        }}
        className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-[12px] text-foreground outline-none transition-colors focus:border-[#2C9FDD] placeholder:text-muted-foreground/45"
        aria-label={label}
      />
    </label>
  );
}

/**
 * Line inclusion status — click to toggle. "In plan" = counted in budget +
 * forecast; "Paused" = kept in the plan but excluded from the math. (Not
 * "Active" — the plan isn't live at draft stage.)
 */
function StatusPill({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={active ? "In plan — click to pause (exclude from budget & forecast)" : "Paused — click to include in the plan"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
        active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-muted text-muted-foreground hover:bg-accent"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-muted-foreground/40")} />
      {active ? "In plan" : "Paused"}
    </button>
  );
}

/** In-flight view for an ACTIVE plan: delivered vs planned (with an expected-
 *  by-now marker), pacing status, and one approvable optimization suggestion. */
function InflightPanel({ plan }: { plan: MediaPlan }) {
  const inflight: PlanInflight = getPlanInflight(plan);
  const fmtVal = (n: number, kind: string) => (kind === "money" ? fmtMoney(n) : kind === "impr" ? fmtImpr(n) : fmtNum(n));
  const statusTone = inflight.status === "On track" ? "bg-emerald-50 text-emerald-600" : inflight.status === "Slightly behind" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600";

  // Pacing only — the optimization suggestion lives in the chat assistant now,
  // so the canvas stays a clean read of delivery vs plan.
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-foreground" />
          <span className="text-[14px] font-semibold tracking-tight text-foreground">In flight</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">Day {inflight.elapsedDays} of {inflight.totalDays} · {inflight.elapsedPct}% elapsed</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusTone)}>{inflight.status}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        {inflight.metrics.map((m) => {
          const fillPct = Math.min(100, m.pct);
          const expPct = m.planned > 0 ? Math.min(100, Math.round((m.expectedByNow / m.planned) * 100)) : 0;
          const ahead = m.delivered >= m.expectedByNow;
          return (
            <div key={m.label}>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{m.label}</span>
                <span className={cn("text-[10px] font-medium", ahead ? "text-emerald-600" : "text-rose-500")}>{ahead ? "ahead of pace" : "behind pace"}</span>
              </div>
              <div className="mt-1 text-[15px] font-semibold tracking-tight text-foreground">
                {fmtVal(m.delivered, m.kind)} <span className="text-[12px] font-normal text-muted-foreground">/ {fmtVal(m.planned, m.kind)} planned</span>
              </div>
              <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 left-0 rounded-full bg-[#9FD0EC]" style={{ width: `${fillPct}%` }} />
                <div className="absolute inset-y-[-2px] w-0.5 bg-foreground/70" style={{ left: `${expPct}%` }} title={`Expected by now: ${expPct}%`} />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">{m.pct}% delivered · {expPct}% expected by today</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MediaPlanCard({ plan, onChange }: MediaPlanCardProps) {
  const [flash, setFlash] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<FunnelStage>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  // Contextual edit (select mode): click a highlighted block → attach to chat.
  const { selectMode, setSelectMode, setPendingContext } = useAICompanion();
  function selectFromCanvas(label: string, detail: string) {
    setPendingContext({ label, detail });
    setSelectMode(false);
  }
  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function lineActions(c: MediaCampaign): OverflowAction[] {
    return [
      { id: "duplicate", label: "Duplicate line", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => handleAddLine(c.id) },
      { id: c.enabled ? "pause" : "resume", label: c.enabled ? "Pause line" : "Resume line", icon: c.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />, onClick: () => handleToggle(c.id) },
      { id: "delete", label: "Delete line", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: () => setDeletingLineId(c.id) },
    ];
  }
  function toggleGroup(stage: FunnelStage) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage); else next.add(stage);
      return next;
    });
  }

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
  function handleTarget(field: "conversions" | "roas", value: number) {
    onChange({ ...plan, summary: { ...plan.summary, targets: { ...plan.summary.targets, [field]: Math.max(0, value) } } });
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

  // Picker option sets (stored values are human-readable labels, so id == label).
  const { savedAudiences, showToast } = useCampaign();
  const audienceOptions: PickerOption[] = [
    ...AUDIENCE_LIBRARY.map((a) => ({ id: a.label, label: a.label, meta: a.meta, dot: a.dot })),
    ...savedAudiences.map((a) => ({ id: a.name, label: a.name, meta: `${a.type} · ${a.estimatedSize}`, dot: "bg-[#2C9FDD]" })),
  ];
  const audienceFooter = [
    { label: "Browse data marketplace →", icon: <Store className="h-3.5 w-3.5" />, onClick: () => showToast("Data marketplace — coming soon") },
    { label: "Connect a source (CRM, LiveRamp) →", icon: <Plug className="h-3.5 w-3.5" />, onClick: () => showToast("Connect a source — coming soon") },
  ];
  const geoOptions: PickerOption[] = MARKETS.map((m) => ({ id: m.label, label: m.label, meta: m.meta }));
  const keywordOptions: PickerOption[] = KEYWORD_SUGGESTIONS.map((k) => ({ id: k, label: k }));
  const splitCsv = (s?: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
  const flightPresets = [
    { label: "Match plan flight", range: () => { const a = new Date(); const b = new Date(); b.setDate(b.getDate() + plan.durationDays); return [a, b] as [Date, Date]; } },
    { label: "First 2 weeks", range: () => { const a = new Date(); const b = new Date(); b.setDate(b.getDate() + 14); return [a, b] as [Date, Date]; } },
    { label: "First month", range: () => { const a = new Date(); const b = new Date(); b.setMonth(b.getMonth() + 1); return [a, b] as [Date, Date]; } },
  ];

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


  return (
    <div className="space-y-4">
      {/* Plan header */}
      <div
        onClick={selectMode ? () => selectFromCanvas(`${plan.name} (whole plan)`, `${plan.name} — ${fmtMoney(summary.totalBudget)} across ${enabled.length} channels, ${plan.flight}, est. ${fmtNum(summary.estConversions)} conv · ${summary.estRoas}× ROAS`) : undefined}
        className={cn("rounded-xl border border-border bg-white p-5", selectMode && "cursor-pointer hover:outline-dashed hover:outline-2 hover:outline-[#7C5CFC] [&_*]:pointer-events-none")}
      >
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

        {/* Budget allocation across the funnel — compact bar + inline legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <div className="flex h-1.5 w-[140px] shrink-0 overflow-hidden rounded-full bg-muted">
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

        {/* Data-personalization (progressive readiness). When ready, a quiet
            footnote; when not, a full amber callout with a connect action. */}
        {plan.pixelReady ? (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 shrink-0 text-[#1A7BB5]" />
            Personalized from this advertiser&apos;s account data and <span className="font-medium text-foreground">{plan.benchmarkBasis}</span>.
          </p>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">No pixel detected — projections use <span className="font-medium">{plan.benchmarkBasis}</span>. Connect it to personalize the forecast with real CPA history.</span>
            <button type="button" onClick={handleConnectPixel} className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-foreground/90">
              Connect pixel
            </button>
          </div>
        )}
      </div>

      {/* Client evidence — where they spend today (evidence before persuasion).
          Compact: small bar + inline legend, neutral colors (reference data). */}
      {plan.evidence && (
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              {plan.evidence.label}
            </div>
            <span className="text-[11px] text-muted-foreground">{plan.evidence.basis}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex h-1.5 w-[140px] shrink-0 overflow-hidden rounded-full bg-muted">
              {plan.evidence.channels.map((c, i) => (
                <div
                  key={c.channel}
                  className={EV_COLORS[i % EV_COLORS.length]}
                  style={{ width: `${Math.round(c.spendShare * 100)}%` }}
                  title={`${c.channel} · ${Math.round(c.spendShare * 100)}% · ${c.roas.toFixed(1)}× ROAS`}
                />
              ))}
            </div>
            {plan.evidence.channels.map((c, i) => (
              <span key={c.channel} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", EV_COLORS[i % EV_COLORS.length])} />
                {c.channel} <span className="font-medium text-foreground">{Math.round(c.spendShare * 100)}%</span> · {c.roas.toFixed(1)}× ROAS
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[12px] text-muted-foreground">
            Blended ROAS <span className="font-medium text-foreground">{plan.evidence.blendedRoas.toFixed(1)}×</span> over the last 90 days — this plan is anchored to it, not generic benchmarks.
          </p>
        </div>
      )}

      {/* Summary KPIs — total budget + goals, always present & editable */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Total budget" value={fmtMoney(summary.totalBudget)} edit={{ amount: summary.totalBudget, onCommit: handleTotal }} aiHighlight={aiTouched.includes("total")} />
        <KpiTile
          label="Est. conversions"
          value={fmtNum(summary.estConversions)}
          editTarget={{ amount: summary.targets.conversions, up: convDelta >= 0, prefix: " ", onCommit: (n) => handleTarget("conversions", n) }}
        />
        <KpiTile
          label="Est. ROAS"
          value={`${summary.estRoas}×`}
          editTarget={{ amount: summary.targets.roas, up: roasDelta >= 0, prefix: " ", suffix: "×", onCommit: (n) => handleTarget("roas", n) }}
        />
        <KpiTile label="Est. impressions" value={fmtImpr(summary.estImpressions)} />
      </div>

      {/* In-flight view — only once the plan is live */}
      {plan.reviewState === "active" && <InflightPanel plan={plan} />}

      {/* Line-item editor — grouped by funnel stage (Airtable-style). The row
          stays quiet: core columns + an overflow menu. Secondary attributes
          (geo, creative, keywords, flight dates) live in an expandable detail. */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2.5 pl-4 pr-2 font-medium">Line</th>
              <th className="px-2 py-2.5 font-medium">Channel</th>
              <th className="px-2 py-2.5 font-medium">Audience</th>
              <th className="px-2 py-2.5 text-right font-medium">Budget</th>
              <th className="px-2 py-2.5 font-medium">Est. results</th>
              <th className="py-2.5 pl-2 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          {STAGE_ORDER.map((stage) => {
            const lines = plan.campaigns.filter((c) => c.funnelStage === stage);
            const st = stageStat(stage);
            const isCollapsed = collapsed.has(stage);
            const meta = STAGE_META[stage];
            return (
              <tbody key={stage} className="border-b border-border last:border-0">
                {/* Funnel group header (Airtable-style, collapsible) */}
                <tr
                  onClick={selectMode ? () => selectFromCanvas(`${meta.label} funnel`, `the ${meta.label} funnel — ${fmtMoney(st.budget)} (${st.pct}% of plan), ${lines.length} ${lines.length === 1 ? "line" : "lines"}, ${stage === "awareness" ? `${fmtImpr(st.impressions)} reach` : `${fmtNum(st.conversions)} conv · ${st.roas}× ROAS`}`) : undefined}
                  className={cn("bg-muted/40", selectMode && "cursor-pointer hover:outline-dashed hover:outline-2 hover:-outline-offset-2 hover:outline-[#7C5CFC] [&_*]:pointer-events-none")}
                >
                  <td colSpan={6} className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={() => toggleGroup(stage)} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title={isCollapsed ? "Expand" : "Collapse"}>
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <span className="text-[13px] font-semibold text-foreground">{meta.label}</span>
                      <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{lines.length} {lines.length === 1 ? "line" : "lines"}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{fmtMoney(st.budget)}</span> · {st.pct}% · {stage === "awareness" ? `${fmtImpr(st.impressions)} reach` : `${fmtNum(st.conversions)} conv · ${st.roas}× ROAS`}
                      </span>
                    </div>
                  </td>
                </tr>
                {/* Line rows */}
                {!isCollapsed && lines.map((c, li) => {
                  const est = c.funnelStage === "awareness"
                    ? `${fmtImpr(c.forecast.impressions)} impr${c.forecast.cpm ? ` · $${c.forecast.cpm} CPM` : ""}`
                    : `${fmtNum(c.forecast.conversions)} conv${c.forecast.roas != null ? ` · ${c.forecast.roas}×` : ""}`;
                  const isOpen = expanded.has(c.id);
                  return (
                    <Fragment key={c.id}>
                      <tr
                        onClick={selectMode ? () => selectFromCanvas(`Line ${li + 1} · ${c.label.replace(/\s*\(.+\)\s*$/, "")}`, `${meta.label} · Line ${li + 1}: ${c.label}${c.location ? ` (${c.location})` : ""} — ${c.enabled ? fmtMoney(c.budget) : "off"}, ${est}`) : undefined}
                        className={cn("border-t border-border align-middle", !c.enabled && "opacity-60", aiTouched.includes(c.id) && "bg-[#F3F0FF]", selectMode && "cursor-pointer hover:outline-dashed hover:outline-2 hover:-outline-offset-2 hover:outline-[#7C5CFC] [&_*]:pointer-events-none")}
                      >
                        <td className="py-2.5 pl-4 pr-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <button type="button" onClick={() => toggleExpanded(c.id)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground" title={isOpen ? "Hide details" : "Show details"}>
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                            <span className="w-4 shrink-0 text-[11px] font-medium text-muted-foreground">{li + 1}</span>
                            <LineLabel value={c.label} onCommit={(v) => handleField(c.id, { label: v })} />
                            {c.status === "closed_beta" && (
                              <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600">Beta</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2.5"><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{c.channel}</span></td>
                        <td className="px-2 py-1.5">
                          <SearchPicker
                            flush
                            options={audienceOptions}
                            value={c.audience ?? ""}
                            onChange={(v) => handleField(c.id, { audience: v as string })}
                            placeholder="Add audience…"
                            searchPlaceholder="Search audiences…"
                            footerActions={audienceFooter}
                          />
                        </td>
                        <td className="px-2 py-2.5"><div className="flex justify-end"><BudgetInput value={c.budget} onCommit={(n) => handleBudget(c.id, n)} aiHighlight={aiTouched.includes(c.id)} /></div></td>
                        <td className="truncate px-2 py-2.5 text-[11px] text-muted-foreground">{est}</td>
                        <td className="py-2.5 pl-2 pr-4">
                          <div className="flex items-center gap-1.5">
                            <StatusPill active={c.enabled} onToggle={() => handleToggle(c.id)} />
                            <CardOverflowMenu actions={lineActions(c)} />
                          </div>
                        </td>
                      </tr>
                      {/* Expanded line detail — secondary attributes */}
                      {isOpen && (
                        <tr className={cn("border-t border-border bg-muted/20", !c.enabled && "opacity-60")}>
                          <td colSpan={6} className="px-4 py-3.5">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pl-7 sm:grid-cols-4">
                              <div>
                                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Geo / Market</span>
                                <SearchPicker
                                  multi bordered
                                  options={geoOptions}
                                  value={splitCsv(c.location)}
                                  onChange={(v) => handleField(c.id, { location: (v as string[]).join(", ") })}
                                  placeholder="All markets"
                                  searchPlaceholder="Search markets…"
                                />
                              </div>
                              <div>
                                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Keywords</span>
                                <SearchPicker
                                  multi bordered allowCreate
                                  options={keywordOptions}
                                  value={splitCsv(c.keywords)}
                                  onChange={(v) => handleField(c.id, { keywords: (v as string[]).join(", ") })}
                                  placeholder="Add keywords…"
                                  searchPlaceholder="Search or add a keyword…"
                                />
                              </div>
                              <div>
                                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Flight dates</span>
                                <DateRangePicker
                                  bordered
                                  value={c.flightDates ?? ""}
                                  placeholder={plan.flight}
                                  presets={flightPresets}
                                  onChange={(v) => handleField(c.id, { flightDates: v })}
                                />
                              </div>
                              <DetailField label="Creative concept" value={c.creative ?? ""} placeholder="Describe the concept — asset binds at activation" onCommit={(v) => handleField(c.id, { creative: v })} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {/* Add line — last row of the group (Airtable pattern) */}
                {!isCollapsed && (
                  <tr className="border-t border-border">
                    <td colSpan={6} className="py-2 pl-[52px] pr-4">
                      <AddLinePicker label="Add line" onAdd={(channel) => handleAddBlankLine(stage, channel)} />
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>

      {/* Benchmark footer */}
      <p className="px-1 text-[11px] text-muted-foreground">
        Benchmarks: {plan.benchmarkBasis} · Adjust budgets inline above, or ask the AI to shift them.
      </p>

      <ConfirmDialog
        open={deletingLineId !== null}
        title="Delete this line?"
        description="This removes the line item from the plan and recalculates the budget. You can't undo this."
        confirmLabel="Delete line"
        destructive
        onConfirm={() => { if (deletingLineId) handleRemoveLine(deletingLineId); setDeletingLineId(null); }}
        onCancel={() => setDeletingLineId(null)}
      />
    </div>
  );
}
