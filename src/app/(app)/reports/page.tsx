"use client";

import { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { getCurrentBrand } from "@/data/brand-profiles";
import { FFERN_SEED_PERFORMANCE, FFERN_SEED_ANOMALIES } from "@/data/seed-ffern";
import { SEED_PERFORMANCE, SEED_ANOMALIES } from "@/data/seed-company";
import type { SeedMonthlyPerformance, SeedAnomaly } from "@/data/seed-company";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";
import {
  FileText,
  Clock,
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
  Copy,
  Pencil,
  Share2,
  Archive,
  Trash2,
} from "lucide-react";
import { CardOverflowMenu, type OverflowAction } from "@/components/patterns/card-overflow-menu";
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
  invertColor?: boolean;
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

/* ──────────────────────────────────────────────
   Tab: Performance overview
   ────────────────────────────────────────────── */

function PerformanceTab({
  perf,
  anomalies,
  onAsk,
}: {
  perf: SeedMonthlyPerformance[];
  anomalies: SeedAnomaly[];
  onAsk: (prompt: string) => void;
}) {
  const brand = getCurrentBrand();

  if (perf.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl bg-white px-8 py-10 text-center">
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
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <Sparkles className="h-4 w-4" />
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
    <div className="space-y-4">
      {/* Metrics hero */}
      <div className="rounded-xl bg-white px-8 py-8">
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

        {anomalies.length > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#394859]">{anomalies[0].description}</p>
              <p className="mt-1 text-[12px] text-[#8492A6]">
                Detected {new Date(anomalies[0].detectedAt).toLocaleDateString()} · {anomalies[0].confidence} confidence
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAsk(`Explain the ${anomalies[0].channel} anomaly and what I should do about it`)}
              className="shrink-0 flex items-center gap-1 rounded-lg border border-amber-300 px-2.5 py-1.5 text-[12px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              Investigate
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Tab: Report templates
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

function TemplatesTab({ onGenerate }: { onGenerate: (prompt: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {REPORT_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onGenerate(t.prompt)}
          className="group flex items-start gap-3 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3.5 text-left transition-all hover:border-[#C4CDD8] hover:shadow-sm"
        >
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F7F9FB]">
            {t.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#394859] group-hover:text-[#2C9FDD] transition-colors">
                {t.title}
              </span>
              {t.schedule && (
                <span className="flex items-center gap-1 rounded-full bg-[#F0F2F5] px-2 py-0.5 text-[10px] font-medium text-[#8492A6]">
                  <Calendar className="h-2.5 w-2.5" />
                  {t.schedule}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-[#8492A6] line-clamp-1">{t.description}</p>
          </div>
          <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-[#C4CDD8] transition-colors group-hover:text-[#2C9FDD]" />
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Tab: Saved reports
   ────────────────────────────────────────────── */

const statusDot: Record<string, string> = {
  draft: "bg-[#C4CDD8]",
  final: "bg-emerald-500",
};

function SavedReportsTab({
  narratives,
  onOpen,
  onAction,
}: {
  narratives: { id: string; name: string; status: string; advertiserId: string; period: { month: number; year: number }; lastModifiedAt: string }[];
  onOpen: (id: string) => void;
  onAction: (narrativeId: string, actionId: string) => void;
}) {
  if (narratives.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl bg-white px-8 py-10 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F0FF]">
          <FileText className="h-5 w-5 text-[#7C5CFC]" />
        </div>
        <h3 className="text-[14px] font-semibold text-[#394859]">No saved reports yet</h3>
        <p className="mt-1 max-w-xs text-[13px] text-[#8492A6]">
          Generate a report from the Templates tab — it will be saved here automatically.
        </p>
      </div>
    );
  }

  const sorted = [...narratives].sort(
    (a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime()
  );

  return (
    <div className="space-y-2">
      {sorted.map((n) => {
        const config = n.status === "final"
          ? { label: "Final", bg: "bg-emerald-50", text: "text-emerald-600" }
          : { label: "Draft", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" };

        const actions: OverflowAction[] = [
          { id: "duplicate", label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => onAction(n.id, "duplicate") },
          { id: "rename", label: "Rename", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => onAction(n.id, "rename") },
          { id: "share", label: "Share", icon: <Share2 className="h-3.5 w-3.5" />, onClick: () => onAction(n.id, "share") },
          { id: "archive", label: "Archive", icon: <Archive className="h-3.5 w-3.5" />, onClick: () => onAction(n.id, "archive") },
          { id: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onClick: () => onAction(n.id, "delete") },
        ];

        return (
          <div
            key={n.id}
            className="group flex w-full items-center gap-3 rounded-xl border border-[#E0E8F2] bg-white px-4 py-3.5 text-left transition-all hover:border-[#C4CDD8] hover:shadow-sm cursor-pointer"
            onClick={() => onOpen(n.id)}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F0FF]">
              <FileText className="h-4 w-4 text-[#7C5CFC]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[n.status])} />
                <span className="truncate text-[13px] font-medium text-[#394859]">{n.name}</span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", config.bg, config.text)}>
                  {config.label}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 pl-3.5 text-[12px] text-[#8492A6]">
                <span>{n.advertiserId}</span>
                <span>·</span>
                <span>{MONTH_NAMES[n.period.month - 1]} {n.period.year}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(n.lastModifiedAt)}
                </span>
              </div>
            </div>
            <CardOverflowMenu actions={actions} />
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Reports page — tabbed layout
   ────────────────────────────────────────────── */

type ReportsTab = "performance" | "templates" | "saved";

const TABS: { id: ReportsTab; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "templates", label: "Templates" },
  { id: "saved", label: "Saved reports" },
];

export default function ReportsPage() {
  const {
    savedNarratives,
    setActiveNarrative,
    activeStrategy,
    setActiveStrategy,
    removeNarrative,
    duplicateNarrative,
  } = useCampaign();
  const { openFullscreen, setState } = useAICompanion();

  const [activeTab, setActiveTab] = useState<ReportsTab>("performance");
  const [data, setData] = useState<{
    perf: SeedMonthlyPerformance[];
    anomalies: SeedAnomaly[];
    brandName: string;
  }>({ perf: [], anomalies: [], brandName: "" });

  useEffect(() => {
    setData(getPerformanceData());
  }, []);

  function handleOpenNarrative(id: string) {
    const found = savedNarratives.find((n) => n.id === id);
    if (!found) return;
    if (activeStrategy) setActiveStrategy(null);
    setActiveNarrative(found);
    setState("split");
  }

  function handleGenerateReport(prompt: string) {
    openFullscreen(prompt);
  }

  function handleNarrativeAction(narrativeId: string, actionId: string) {
    switch (actionId) {
      case "duplicate":
        duplicateNarrative(narrativeId);
        break;
      case "delete":
        removeNarrative(narrativeId);
        break;
      case "archive":
        removeNarrative(narrativeId);
        break;
      default:
        break;
    }
  }

  const narrativeCount = savedNarratives.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-10">
          {/* Page header */}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Reports</h1>
            <p className="mt-0.5 text-[13px] text-[#8492A6]">
              Performance dashboards, automated reports, and saved narratives
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex items-center gap-1 border-b border-[#E0E8F2]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-4 py-2.5 text-[13px] font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-[#394859]"
                    : "text-[#8492A6] hover:text-[#394859]"
                )}
              >
                {tab.label}
                {tab.id === "saved" && narrativeCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-[#F0F2F5] px-1.5 py-0.5 text-[10px] font-medium text-[#8492A6]">
                    {narrativeCount}
                  </span>
                )}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#394859]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-6">
            {activeTab === "performance" && (
              <PerformanceTab
                perf={data.perf}
                anomalies={data.anomalies}
                onAsk={handleGenerateReport}
              />
            )}
            {activeTab === "templates" && (
              <TemplatesTab onGenerate={handleGenerateReport} />
            )}
            {activeTab === "saved" && (
              <SavedReportsTab
                narratives={savedNarratives}
                onOpen={handleOpenNarrative}
                onAction={handleNarrativeAction}
              />
            )}
          </div>
        </div>
      </div>

      {/* Chat input — always visible at bottom */}
      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask about metrics, trends, or anomalies..." />
      </div>
    </div>
  );
}
