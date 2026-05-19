"use client";

import { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { getCurrentBrand } from "@/data/brand-profiles";
import { FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES } from "@/data/seed-ffern";
import { SEED_PERFORMANCE, SEED_ANOMALIES } from "@/data/seed-company";
import type { SeedMonthlyPerformance, SeedAnomaly } from "@/data/seed-company";
import {
  FileText,
  Plus,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Zap,
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
   Performance dashboard — key metrics header
   ────────────────────────────────────────────── */

interface MetricTileProps {
  label: string;
  value: string;
  change: { value: number; direction: "up" | "down" | "flat" };
  icon: React.ReactNode;
  invertColor?: boolean; // true = "up" is bad (e.g. CPA)
}

function MetricTile({ label, value, change, icon, invertColor }: MetricTileProps) {
  const isPositive = invertColor
    ? change.direction === "down"
    : change.direction === "up";
  const isNegative = invertColor
    ? change.direction === "up"
    : change.direction === "down";

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#8492A6]">{label}</span>
        <span className="text-[#8492A6]">{icon}</span>
      </div>
      <span className="text-[20px] font-semibold tracking-tight text-[#394859]">{value}</span>
      <div className="flex items-center gap-1">
        {change.direction === "up" && <TrendingUp className="h-3 w-3" />}
        {change.direction === "down" && <TrendingDown className="h-3 w-3" />}
        <span
          className={cn(
            "text-[12px] font-medium",
            isPositive && "text-emerald-600",
            isNegative && "text-red-500",
            change.direction === "flat" && "text-[#8492A6]"
          )}
        >
          {change.direction === "flat"
            ? "No change"
            : `${change.value}% vs last month`}
        </span>
      </div>
    </div>
  );
}

function PerformanceDashboard({ perf }: { perf: SeedMonthlyPerformance[] }) {
  const current = perf[perf.length - 1];
  const previous = perf.length > 1 ? perf[perf.length - 2] : current;

  const avgCPA = current.totalSpend / current.totalConversions;
  const prevAvgCPA = previous.totalSpend / previous.totalConversions;
  const roas = current.totalRevenue / current.totalSpend;
  const prevRoas = previous.totalRevenue / previous.totalSpend;

  const [year, monthStr] = current.month.split("-").map(Number);
  const periodLabel = `${MONTH_NAMES[monthStr - 1]} ${year}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#2C9FDD]" />
          <span className="text-[13px] font-semibold text-[#394859]">Performance overview</span>
        </div>
        <span className="rounded-full bg-[#F5FAFF] px-2.5 py-0.5 text-[11px] font-medium text-[#2C9FDD]">
          {periodLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
  );
}

/* ──────────────────────────────────────────────
   Anomaly alert — if any active anomalies
   ────────────────────────────────────────────── */

function AnomalyBanner({
  anomalies,
  onAsk,
}: {
  anomalies: SeedAnomaly[];
  onAsk: (prompt: string) => void;
}) {
  if (anomalies.length === 0) return null;
  const a = anomalies[0]; // Show most recent

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3.5">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#394859]">{a.description}</p>
        <p className="mt-1 text-[12px] text-[#8492A6]">
          Detected {new Date(a.detectedAt).toLocaleDateString()} · {a.confidence} confidence
        </p>
      </div>
      <button
        type="button"
        onClick={() => onAsk(`Explain the ${a.channel} anomaly and what I should do about it`)}
        className="shrink-0 flex items-center gap-1 rounded-lg border border-amber-300 px-2.5 py-1.5 text-[12px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
      >
        Investigate
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Automated report templates
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
    icon: <Zap className="h-4 w-4 text-[#2C9FDD]" />,
    prompt: "Give me a weekly performance summary for this past week",
  },
  {
    id: "cfo-narrative",
    title: "Monthly CFO narrative",
    description: "Executive-ready report with spend, attribution, and recommendations.",
    schedule: "Monthly",
    icon: <FileText className="h-4 w-4 text-[#7C5CFC]" />,
    prompt: "Draft my CFO narrative for this month",
  },
  {
    id: "channel-deep-dive",
    title: "Channel deep dive",
    description: "Detailed performance breakdown for a specific channel.",
    schedule: null,
    icon: <BarChart3 className="h-4 w-4 text-emerald-500" />,
    prompt: "Give me a deep dive on my best and worst performing channels",
  },
  {
    id: "budget-pacing",
    title: "Budget pacing report",
    description: "Are you on track with monthly spend? Where to shift budget.",
    schedule: null,
    icon: <DollarSign className="h-4 w-4 text-amber-500" />,
    prompt: "How is my budget pacing this month? Any channels I should shift spend to?",
  },
];

function ReportTemplateCard({
  template,
  onGenerate,
}: {
  template: ReportTemplate;
  onGenerate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onGenerate}
      className="group flex items-start gap-3 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3.5 text-left transition-all hover:border-[#C4CDD8] hover:shadow-sm"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F7F9FB]">
        {template.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#394859] group-hover:text-[#2C9FDD] transition-colors">
            {template.title}
          </span>
          {template.schedule && (
            <span className="flex items-center gap-1 rounded-full bg-[#F0F2F5] px-2 py-0.5 text-[10px] font-medium text-[#8492A6]">
              <Calendar className="h-2.5 w-2.5" />
              {template.schedule}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-[#8492A6] line-clamp-1">{template.description}</p>
      </div>
      <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-[#C4CDD8] transition-colors group-hover:text-[#2C9FDD]" />
    </button>
  );
}

/* ──────────────────────────────────────────────
   Saved report row
   ────────────────────────────────────────────── */

const statusDot: Record<string, string> = {
  draft: "bg-[#C4CDD8]",
  final: "bg-emerald-500",
};

function NarrativeRow({
  narrative,
  onOpen,
}: {
  narrative: { id: string; name: string; status: string; advertiserId: string; period: { month: number; year: number }; lastModifiedAt: string };
  onOpen: () => void;
}) {
  const config = narrative.status === "final"
    ? { label: "Final", bg: "bg-emerald-50", text: "text-emerald-600" }
    : { label: "Draft", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3.5 text-left transition-all hover:border-[#C4CDD8] hover:shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F0FF]">
        <FileText className="h-4 w-4 text-[#7C5CFC]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[narrative.status])} />
          <span className="truncate text-[13px] font-medium text-[#394859]">{narrative.name}</span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", config.bg, config.text)}>
            {config.label}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 pl-3.5 text-[12px] text-[#8492A6]">
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
      <ChevronRight className="h-4 w-4 shrink-0 text-[#C4CDD8] transition-colors group-hover:text-[#8492A6]" />
    </button>
  );
}

/* ──────────────────────────────────────────────
   Reports page
   ────────────────────────────────────────────── */

export default function ReportsPage() {
  const {
    savedNarratives,
    setActiveNarrative,
    activeStrategy,
    setActiveStrategy,
  } = useCampaign();
  const { openFullscreen, setState } = useAICompanion();

  const [data, setData] = useState<{
    perf: SeedMonthlyPerformance[];
    anomalies: SeedAnomaly[];
    brandName: string;
  }>({ perf: [], anomalies: [], brandName: "" });

  useEffect(() => {
    setData(getPerformanceData());
  }, []);

  // Conversation-first: clicking a report opens split view with chat
  function handleOpenNarrative(id: string) {
    const found = savedNarratives.find((n) => n.id === id);
    if (!found) return;
    // Clear strategy so canvas shows narrative
    if (activeStrategy) setActiveStrategy(null);
    setActiveNarrative(found);
    setState("split");
  }

  function handleGenerateReport(prompt: string) {
    openFullscreen(prompt);
  }

  function handleNewReport() {
    openFullscreen("Help me create a custom report");
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="mt-0.5 text-[13px] text-[#8492A6]">
            Performance dashboards, narratives, and automated reports
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewReport}
          className="flex items-center gap-1.5 rounded-lg bg-[#2C9FDD] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#1A7BB5]"
        >
          <Plus className="h-4 w-4" />
          New report
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {/* Performance dashboard */}
        {data.perf.length > 0 && (
          <PerformanceDashboard perf={data.perf} />
        )}

        {/* Anomaly alert */}
        {data.anomalies.length > 0 && (
          <AnomalyBanner anomalies={data.anomalies} onAsk={handleGenerateReport} />
        )}

        {/* Automated report templates */}
        <div>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#8492A6]">
            Report templates
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REPORT_TEMPLATES.map((t) => (
              <ReportTemplateCard
                key={t.id}
                template={t}
                onGenerate={() => handleGenerateReport(t.prompt)}
              />
            ))}
          </div>
        </div>

        {/* Saved reports */}
        {savedNarratives.length > 0 && (
          <div>
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#8492A6]">
              Saved reports
            </h2>
            <div className="space-y-2">
              {savedNarratives
                .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
                .map((n) => (
                  <NarrativeRow
                    key={n.id}
                    narrative={n}
                    onOpen={() => handleOpenNarrative(n.id)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Empty state for saved reports when none exist */}
        {savedNarratives.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#D5DDE5] bg-[#FAFBFC] px-6 py-8 text-center">
            <FileText className="mx-auto h-6 w-6 text-[#C4CDD8]" />
            <p className="mt-2 text-[13px] font-medium text-[#394859]">No saved reports yet</p>
            <p className="mt-1 text-[12px] text-[#8492A6]">
              Generate a report from a template above, or ask the AI to create a custom one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
