"use client";

import { useState, useEffect, useRef } from "react";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { usePersona } from "@/contexts/persona-context";
import type { MediaPlan } from "@/types/campaign";
import { getCurrentBrand, useBrand } from "@/data/brand-profiles";
import { FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES } from "@/data/seed-ffern";
import { SEED_PERFORMANCE, SEED_ANOMALIES } from "@/data/seed-company";
import type { SeedMonthlyPerformance, SeedAnomaly } from "@/data/seed-company";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";
import { fetchCubePerformance } from "@/lib/cube/client";
import { CardOverflowMenu, type OverflowAction } from "@/components/patterns/card-overflow-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FileText,
  Clock,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Zap,
  Copy,
  Pencil,
  Share2,
  Archive,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────
   Data helpers
   ────────────────────────────────────────────── */

function getPerformanceData(): { perf: SeedMonthlyPerformance[]; anomalies: SeedAnomaly[]; brandName: string } {
  const brand = getCurrentBrand();
  if (brand) {
    return { perf: FFERN_SEED_PERFORMANCE, anomalies: FFERN_SEED_ANOMALIES, brandName: brand.name };
  }
  return { perf: SEED_PERFORMANCE, anomalies: SEED_ANOMALIES, brandName: "All channels" };
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

function pctChange(current: number, previous: number): { value: number; direction: "up" | "down" | "flat" } {
  if (previous === 0) return { value: 0, direction: "flat" };
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(Math.round(change)),
    direction: change > 1 ? "up" : change < -1 ? "down" : "flat",
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ──────────────────────────────────────────────
   Performance metrics (always visible at top)
   ────────────────────────────────────────────── */

interface MetricTileProps {
  label: string;
  value: string;
  change: { value: number; direction: "up" | "down" | "flat" };
  icon: React.ReactNode;
  invertColor?: boolean;
}

function MetricTile({ label, value, change, invertColor }: MetricTileProps) {
  const isPositive = invertColor
    ? change.direction === "down"
    : change.direction === "up";
  const isNegative = invertColor
    ? change.direction === "up"
    : change.direction === "down";

  return (
    <div className="bg-background px-5 pt-4 pb-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {change.direction !== "flat" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              isPositive && "bg-emerald-50 text-emerald-600",
              isNegative && "bg-red-50 text-red-500",
            )}
          >
            {change.direction === "up" ? "↑" : "↓"}
            {change.value}%
          </span>
        )}
        {change.direction === "flat" && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            —
          </span>
        )}
      </div>
      <div className="mt-1.5">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}

function PerformanceSection({
  perf,
  anomalies,
  onAsk,
}: {
  perf: SeedMonthlyPerformance[];
  anomalies: SeedAnomaly[];
  onAsk: (prompt: string) => void;
}) {
  const brand = useBrand();

  if (perf.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border bg-card px-8 py-10 text-center">
        {brand?.pageImages?.reports ? (
          <div className="mb-5 w-full max-w-md overflow-hidden rounded-lg">
            <img src={brand.pageImages.reports} alt="" className="h-48 w-full object-cover" />
          </div>
        ) : (
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <BarChart3 className="h-6 w-6 text-foreground/70" strokeWidth={1.5} />
          </div>
        )}
        <h2 className="text-base font-semibold text-foreground">See how your marketing is performing</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Connect your ad accounts and the AI will generate performance dashboards, executive narratives, and anomaly alerts.
        </p>
        <button
          type="button"
          onClick={() => onAsk("Show me how my marketing is performing")}
          className="mt-5 inline-flex items-center rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          View performance
        </button>
      </div>
    );
  }

  const current = perf[perf.length - 1];
  const previous = perf.length > 1 ? perf[perf.length - 2] : current;
  const avgCPA = current.totalSpend / current.totalConversions;
  const prevAvgCPA = previous.totalSpend / previous.totalConversions;
  const roas = current.totalRevenue / current.totalSpend;
  const prevRoas = previous.totalRevenue / previous.totalSpend;
  const [year, monthStr] = current.month.split("-").map(Number);
  const periodLabel = `${MONTH_NAMES[monthStr - 1]} ${year}`;

  return (
    <div className="space-y-3 rounded-2xl bg-muted/60 p-3">
      <div className="rounded-xl bg-background">
        {/* Period header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold text-foreground">Performance overview</span>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {periodLabel}
          </span>
        </div>

        {/* Metrics grid — unified card with dividers */}
        <div className="grid grid-cols-2 gap-px bg-border/60 border-t border-border/60 sm:grid-cols-4">
          <MetricTile
            label="Total spend"
            value={formatCurrency(current.totalSpend)}
            change={pctChange(current.totalSpend, previous.totalSpend)}
            icon={<DollarSign className="h-3.5 w-3.5" />}
          />
          <MetricTile
            label="Revenue"
            value={formatCurrency(current.totalRevenue)}
            change={pctChange(current.totalRevenue, previous.totalRevenue)}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <MetricTile
            label="ROAS"
            value={`${roas.toFixed(1)}x`}
            change={pctChange(roas, prevRoas)}
            icon={<Target className="h-3.5 w-3.5" />}
          />
          <MetricTile
            label="Avg CPA"
            value={`$${Math.round(avgCPA)}`}
            change={pctChange(avgCPA, prevAvgCPA)}
            icon={<DollarSign className="h-3.5 w-3.5" />}
            invertColor
          />
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{anomalies[0].description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Detected {new Date(anomalies[0].detectedAt).toLocaleDateString()} · {anomalies[0].confidence} confidence
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAsk(`Explain the ${anomalies[0].channel} anomaly and what I should do about it`)}
            className="shrink-0 flex items-center gap-1 rounded-md border border-amber-300 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            Investigate
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Report templates
   ────────────────────────────────────────────── */

interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  schedule: string | null;
  icon: React.ReactNode;
  prompt: string;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "weekly-summary",
    title: "Weekly performance summary",
    description: "Key metrics, channel trends, and what changed this week.",
    schedule: "Every Monday",
    icon: <Zap className="h-4 w-4 text-muted-foreground" />,
    prompt: "Give me a weekly performance summary for this past week",
  },
  {
    id: "cfo-narrative",
    title: "Monthly CFO narrative",
    description: "Executive-ready report with spend, attribution, and recommendations.",
    schedule: "Monthly",
    icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    prompt: "Draft my CFO narrative for this month",
  },
  {
    id: "channel-deep-dive",
    title: "Channel deep dive",
    description: "Detailed performance breakdown for a specific channel.",
    schedule: null,
    icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
    prompt: "Give me a deep dive on my best and worst performing channels",
  },
  {
    id: "budget-pacing",
    title: "Budget pacing report",
    description: "Are you on track with monthly spend? Where to shift budget.",
    schedule: null,
    icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    prompt: "How is my budget pacing this month? Any channels I should shift spend to?",
  },
];

function TemplatesContent({ onGenerate }: { onGenerate: (prompt: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {REPORT_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onGenerate(t.prompt)}
          className="group flex flex-col rounded-xl border bg-card p-4 text-left transition-all hover:shadow-sm hover:border-foreground/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              {t.icon}
            </div>
            {t.schedule && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Calendar className="h-2.5 w-2.5" />
                {t.schedule}
              </span>
            )}
          </div>
          <span className="mt-3 text-[13px] font-medium text-foreground">
            {t.title}
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Saved report row with overflow actions
   ────────────────────────────────────────────── */

const statusDot: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  final: "bg-emerald-500",
};

function NarrativeRow({
  narrative,
  onOpen,
  onAction,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: {
  narrative: { id: string; name: string; status: string; advertiserId: string; period: { month: number; year: number }; lastModifiedAt: string };
  onOpen: () => void;
  onAction: (actionId: string) => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}) {
  const config = narrative.status === "final"
    ? { label: "Final", bg: "bg-emerald-50", text: "text-emerald-600" }
    : { label: "Draft", bg: "bg-muted", text: "text-muted-foreground" };

  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameRef.current) renameRef.current.focus();
  }, [isRenaming]);

  const actions: OverflowAction[] = [
    { id: "duplicate", label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => onAction("duplicate") },
    { id: "rename", label: "Rename", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => onAction("rename") },
    { id: "share", label: "Share", icon: <Share2 className="h-3.5 w-3.5" />, onClick: () => onAction("share") },
    { id: "archive", label: "Archive", icon: <Archive className="h-3.5 w-3.5" />, onClick: () => onAction("archive") },
    { id: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: () => onAction("delete") },
  ];

  return (
    <div
      onClick={isRenaming ? undefined : onOpen}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3.5 text-left transition-all hover:shadow-sm",
        isRenaming ? "ring-1 ring-ring" : "cursor-pointer"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                ref={renameRef}
                type="text"
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameSubmit();
                  if (e.key === "Escape") onRenameCancel();
                }}
                className="min-w-0 flex-1 rounded-md border px-2 py-0.5 text-sm font-medium text-foreground outline-none focus:border-ring"
              />
              <button onClick={onRenameSubmit} className="flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={onRenameCancel} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[narrative.status])} />
              <span className="truncate text-sm font-medium text-foreground">{narrative.name}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", config.bg, config.text)}>
                {config.label}
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 pl-3.5 text-xs text-muted-foreground">
          <span>{narrative.advertiserId}</span>
          <span>·</span>
          <span>{MONTH_NAMES[narrative.period.month - 1]} {narrative.period.year}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(narrative.lastModifiedAt)}
          </span>
        </div>
      </div>
      {!isRenaming && <CardOverflowMenu actions={actions} />}
    </div>
  );
}

function SavedReportsContent({
  narratives,
  onOpen,
  onAction,
  renamingId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: {
  narratives: { id: string; name: string; status: string; advertiserId: string; period: { month: number; year: number }; lastModifiedAt: string }[];
  onOpen: (id: string) => void;
  onAction: (narrativeId: string, actionId: string) => void;
  renamingId: string | null;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (narratives.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border bg-card px-8 py-10 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No saved reports yet</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Generate a report from the Templates tab — it will be saved here automatically.
        </p>
      </div>
    );
  }

  const filtered = statusFilter === "all"
    ? narratives
    : narratives.filter((n) => n.status === statusFilter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="flex items-center gap-1">
        {(["all", "draft", "final"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              statusFilter === f
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {f === "all" ? "All" : f === "draft" ? "Draft" : "Final"}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No reports match this filter.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((n) => (
            <NarrativeRow
              key={n.id}
              narrative={n}
              onOpen={() => onOpen(n.id)}
              onAction={(actionId) => onAction(n.id, actionId)}
              isRenaming={renamingId === n.id}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameSubmit={() => onRenameSubmit(n.id)}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Reports page
   ────────────────────────────────────────────── */

type ReportsTab = "saved" | "templates";

/* ──────────────────────────────────────────────
   Live Status — in-flight pacing for active media plans.
   Delivered vs. target, with on-pace status (red/green). Numbers are
   deterministic per plan (stable hash) so the demo is consistent.
   ────────────────────────────────────────────── */

function pacingHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function PacingBar({ label, delivered, target, fmt }: { label: string; delivered: number; target: number; fmt: (n: number) => string }) {
  const pct = target > 0 ? Math.min(100, Math.round((delivered / target) * 100)) : 0;
  // Expected pace ~70% through flight. On track if at/above; behind if a bit under; at risk if well under.
  const tone = pct >= 66 ? "emerald" : pct >= 50 ? "amber" : "rose";
  const barColor = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  const textColor = tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-rose-600";
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground"><span className="font-medium">{fmt(delivered)}</span> of {fmt(target)} <span className={cn("font-medium", textColor)}>· {pct}%</span></span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LivePacingSection({ plans, onOpen }: { plans: MediaPlan[]; onOpen: (p: MediaPlan) => void }) {
  if (plans.length === 0) return null;
  const fmtImpr = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : `${Math.round(n)}`);
  const fmtNum = (n: number) => Math.round(n).toLocaleString();
  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground"><Zap className="h-3.5 w-3.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground">In-flight pacing</div>
          <div className="text-[11px] text-muted-foreground">How active plans are tracking against their stated goals</div>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">{plans.length} live</span>
      </div>
      <div className="divide-y divide-border">
        {plans.map((p) => {
          const h = pacingHash(p.id);
          // Stable delivered fraction in [0.42, 0.92] for demo variety.
          const frac = 0.42 + (h % 51) / 100;
          const imprTarget = p.summary.estImpressions || 0;
          const convTarget = p.summary.targets?.conversions || p.summary.estConversions || 0;
          const imprDelivered = Math.round(imprTarget * frac);
          const convDelivered = Math.round(convTarget * Math.min(1, frac + 0.05));
          const onPace = frac >= 0.66 ? "On track" : frac >= 0.5 ? "Slightly behind" : "Behind pace";
          const paceTone = frac >= 0.66 ? "bg-emerald-50 text-emerald-600" : frac >= 0.5 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600";
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p)}
              className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-foreground">{p.name}</span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", paceTone)}>{onPace}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{p.flight} · {p.campaigns.filter((c) => c.enabled).length} lines live</div>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <PacingBar label="Impressions delivered" delivered={imprDelivered} target={imprTarget} fmt={fmtImpr} />
                <PacingBar label="Conversions" delivered={convDelivered} target={convTarget} fmt={fmtNum} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Campaign Timeline (Gantt) — all media plans across the calendar year,
   each bar colored by status. Reads the plan's flight string (e.g. "Jun–Aug
   2026") to position the bar; clicking a row opens that plan.
   ────────────────────────────────────────────── */

const TL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseFlightMonths(flight: string): { start: number; end: number } | null {
  const matches = flight.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi);
  if (!matches) return null;
  const found = matches
    .map((m) => TL_MONTHS.findIndex((x) => x.toLowerCase() === m.slice(0, 3).toLowerCase()))
    .filter((i) => i >= 0);
  if (found.length === 0) return null;
  return { start: found[0], end: found[found.length - 1] };
}

const TL_STATUS: Record<string, { bar: string; dot: string; label: string }> = {
  active: { bar: "bg-emerald-500", dot: "bg-emerald-500", label: "Active" },
  approved: { bar: "bg-[#2C9FDD]", dot: "bg-[#2C9FDD]", label: "Approved" },
  "pending-approval": { bar: "bg-amber-400", dot: "bg-amber-400", label: "Pending" },
  draft: { bar: "bg-slate-300", dot: "bg-slate-300", label: "Draft" },
  paused: { bar: "bg-amber-300", dot: "bg-amber-300", label: "Paused" },
  archived: { bar: "bg-slate-200", dot: "bg-slate-200", label: "Archived" },
};

function CampaignTimeline({ plans, onOpen }: { plans: MediaPlan[]; onOpen: (p: MediaPlan) => void }) {
  if (plans.length === 0) return null;
  const legendStates = Array.from(new Set(plans.map((p) => p.reviewState))).filter((s) => TL_STATUS[s]);
  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold text-foreground">Campaign timeline</div>
          <div className="text-[11px] text-muted-foreground">All media plans across the year — click to open</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {legendStates.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", TL_STATUS[s].dot)} />
              {TL_STATUS[s].label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px] px-4 py-3">
          {/* Month axis */}
          <div className="flex border-b border-border pb-1.5">
            <div className="w-[200px] shrink-0" />
            <div className="flex flex-1">
              {TL_MONTHS.map((m) => (
                <div key={m} className="flex-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{m}</div>
              ))}
            </div>
          </div>
          {/* Rows */}
          {plans.map((p) => {
            const f = parseFlightMonths(p.flight);
            const st = TL_STATUS[p.reviewState] ?? TL_STATUS.draft;
            const left = f ? (f.start / 12) * 100 : 0;
            const width = f ? ((f.end - f.start + 1) / 12) * 100 : 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpen(p)}
                className="flex w-full items-center rounded-md py-2 text-left transition-colors hover:bg-accent"
              >
                <div className="w-[200px] shrink-0 pr-3">
                  <div className="truncate text-[13px] font-medium text-foreground">{p.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{p.flight}</div>
                </div>
                <div className="relative h-6 flex-1">
                  {f && (
                    <div
                      className={cn("absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full", st.bar)}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${p.name} · ${p.flight} · ${st.label}`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const {
    savedNarratives,
    setActiveNarrative,
    activeStrategy,
    setActiveStrategy,
    removeNarrative,
    duplicateNarrative,
    renameNarrative,
    showToast,
    hydrated,
    savedMediaPlans,
  } = useCampaign();
  const { openFullscreen, openPlanContext } = useAICompanion();
  const { activePersona } = usePersona();
  const isAgency = activePersona.vertical === "agency";
  const activePlans = (savedMediaPlans ?? []).filter((p) => p.reviewState === "active");

  function handleOpenPlanPacing(p: MediaPlan) {
    openPlanContext(p);
  }

  const [activeTab, setActiveTab] = useState<ReportsTab>("saved");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [data, setData] = useState<{
    perf: SeedMonthlyPerformance[];
    anomalies: SeedAnomaly[];
    brandName: string;
  }>({ perf: [], anomalies: [], brandName: "" });

  useEffect(() => {
    // Mock seed first so the UI is never empty (and the public demo stays mock).
    const seed = getPerformanceData();
    setData(seed);
    // Then try real Cube data (local dev only — env-gated). On success, keep the
    // seed's brand/anomalies but swap in real performance numbers.
    let cancelled = false;
    fetchCubePerformance().then((real) => {
      if (!cancelled && real) {
        setData((prev) => ({ ...prev, perf: real.perf }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpenNarrative(id: string) {
    const found = savedNarratives.find((n) => n.id === id);
    if (!found) return;
    if (activeStrategy) setActiveStrategy(null);
    setActiveNarrative(found);
  }

  function handleGenerateReport(prompt: string) {
    openFullscreen(prompt);
  }

  function handleNarrativeAction(narrativeId: string, actionId: string) {
    switch (actionId) {
      case "duplicate":
        duplicateNarrative(narrativeId);
        showToast("Report duplicated");
        break;
      case "rename":
        const found = savedNarratives.find((n) => n.id === narrativeId);
        if (found) {
          setRenamingId(narrativeId);
          setRenameValue(found.name);
        }
        break;
      case "share":
        navigator.clipboard?.writeText(`${window.location.origin}/reports?id=${narrativeId}`);
        showToast("Share link copied to clipboard");
        break;
      case "archive":
        removeNarrative(narrativeId);
        showToast("Report archived");
        break;
      case "delete":
        setDeletingId(narrativeId);
        break;
    }
  }

  function handleRenameSubmit(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renameNarrative(id, trimmed);
      showToast("Report renamed");
    }
    setRenamingId(null);
  }

  const narrativeCount = savedNarratives.length;

  if (!hydrated) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto my-auto w-full max-w-3xl px-4 sm:px-8 py-10">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Reports</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-3xl px-4 sm:px-8 py-10">
          {/* Page header */}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{isAgency ? "Live Status" : "Reports"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAgency
              ? "Track active media plans in flight against their stated goals — adjust as you go."
              : "Performance dashboards, automated reports, and saved narratives."}
          </p>

          {/* Campaign timeline (Gantt) — agency: all plans across the year */}
          {isAgency && (savedMediaPlans ?? []).length > 0 && (
            <div className="mt-8">
              <CampaignTimeline plans={savedMediaPlans} onOpen={handleOpenPlanPacing} />
            </div>
          )}

          {/* In-flight pacing — agency, active plans only (live status) */}
          {isAgency && activePlans.length > 0 && (
            <div className="mt-8">
              <LivePacingSection plans={activePlans} onOpen={handleOpenPlanPacing} />
            </div>
          )}

          {/* Performance — always visible at top */}
          <div className="mt-8">
            <PerformanceSection
              perf={data.perf}
              anomalies={data.anomalies}
              onAsk={handleGenerateReport}
            />
          </div>

          {/* Tabs: Custom reports + Templates */}
          <div className="mt-10 flex items-center gap-1 border-b">
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "saved"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Custom reports
              {narrativeCount > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0 text-xs text-muted-foreground">
                  {narrativeCount}
                </span>
              )}
              {activeTab === "saved" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-colors",
                activeTab === "templates"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Templates
              {activeTab === "templates" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="mt-5">
            {activeTab === "saved" && (
              <SavedReportsContent
                narratives={savedNarratives}
                onOpen={handleOpenNarrative}
                onAction={handleNarrativeAction}
                renamingId={renamingId}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={() => setRenamingId(null)}
              />
            )}
            {activeTab === "templates" && (
              <TemplatesContent onGenerate={handleGenerateReport} />
            )}
          </div>
        </div>
      </div>

      {/* Chat input */}
      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask about metrics, trends, or anomalies..." />
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deletingId !== null}
        title="Delete report"
        description="Are you sure you want to delete this report? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingId) {
            removeNarrative(deletingId);
            showToast("Report deleted");
          }
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
