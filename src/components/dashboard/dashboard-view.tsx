"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { universalTasks } from "@/data/personas";
import { CanvasChatInput } from "@/components/ai-companion/canvas-chat-input";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { useCampaign } from "@/contexts/campaign-context";
import {
  Megaphone,
  TrendingUp,
  Link,
  DollarSign,
  Building2,
  ArrowRight,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrandFromEmail, getCurrentBrand, type BrandProfile } from "@/data/brand-profiles";
import { getDemoUserState } from "@/components/persona/persona-switcher";
import { FFERN_SEED_PERFORMANCE } from "@/data/seed-ffern";
import { SEED_PERFORMANCE } from "@/data/seed-company";
import type { SeedMonthlyPerformance } from "@/data/seed-company";
import type { GettingStartedTask } from "@/types/persona";
import type { LucideIcon } from "lucide-react";
import { FocusChatsTabs } from "./focus-chats-tabs";

const taskIcons: Record<string, LucideIcon> = {
  "first-campaign": Megaphone,
  "competitive-intel": Swords,
  "see-performance": TrendingUp,
  "connect-accounts": Link,
  "plan-spend": DollarSign,
};

// Maps optional task ids to their index in BrandProfile.cardImages
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SECONDARY_IMAGE_INDEX: Record<string, number> = {
  "see-performance": 0,
  "connect-accounts": 1,
  "plan-spend": 2,
};

/* ──────────────────────────────────────────────
   Hero image carousel — crossfade, no controls
   ────────────────────────────────────────────── */

function HeroCarousel({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-lg">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
            i === activeIndex ? "opacity-100" : "opacity-0"
          )}
        />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Hero card — first-time users
   ────────────────────────────────────────────── */

function HeroCard({
  task,
  onAction,
  brand,
}: {
  task: GettingStartedTask;
  onAction: () => void;
  brand: BrandProfile | null;
}) {
  const Icon = taskIcons[task.id] || Building2;
  // Only the campaign path leads with the brand carousel; other paths (e.g.
  // competitive) use an icon so the two activation paths read as distinct.
  const showCarousel = brand && task.id === "first-campaign";

  return (
    <div className="flex flex-col items-center rounded-xl bg-background px-8 py-10 text-center">
      {showCarousel ? (
        <div className="mb-5 w-full max-w-md">
          <HeroCarousel images={brand.heroImages} />
        </div>
      ) : (
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-6 w-6 text-foreground/70" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {task.description}
      </p>
      <button
        onClick={onAction}
        className="mt-5 inline-flex items-center rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        {task.cta}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Secondary card — first-time users
   ────────────────────────────────────────────── */

function SecondaryCard({
  task,
  onAction,
}: {
  task: GettingStartedTask;
  onAction: () => void;
}) {
  const Icon = taskIcons[task.id] || Building2;

  return (
    <div className="flex flex-col items-center rounded-xl bg-background px-4 py-6 text-center transition-shadow hover:shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
        {task.description}
      </p>
      <button
        onClick={onAction}
        className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
      >
        {task.cta}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Mini sparkline — simple inline chart
   ────────────────────────────────────────────── */

function MiniSparkline({
  data,
  color = "#2C9FDD",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Use viewBox for responsive width
  const vw = 100;
  const vh = height;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * vw;
    const y = vh - ((v - min) / range) * (vh - 4) - 2;
    return `${x},${y}`;
  });

  const areaPoints = [
    `0,${vh}`,
    ...points,
    `${vw},${vh}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="h-8 w-full" preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} fillOpacity="0.06" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ──────────────────────────────────────────────
   Return-visit hero — performance summary
   ────────────────────────────────────────────── */

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
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface MetricSummary {
  label: string;
  value: string;
  change: { value: number; direction: "up" | "down" | "flat" };
  sparkData: number[];
  color: string;
  invertColor?: boolean;
}

function ReturnVisitHero({
  perf,
  brand,
  onAction,
}: {
  perf: SeedMonthlyPerformance[];
  brand: BrandProfile | null;
  onAction: (prompt: string) => void;
}) {
  const current = perf[perf.length - 1];
  const previous = perf.length > 1 ? perf[perf.length - 2] : current;

  const roas = current.totalRevenue / current.totalSpend;
  const prevRoas = previous.totalRevenue / previous.totalSpend;
  const avgCpa = current.totalSpend / current.totalConversions;
  const prevCpa = previous.totalSpend / previous.totalConversions;

  const [, monthStr] = current.month.split("-").map(Number);
  const periodLabel = MONTH_NAMES[monthStr - 1];

  const metrics: MetricSummary[] = [
    {
      label: "Revenue",
      value: formatCurrency(current.totalRevenue),
      change: pctChange(current.totalRevenue, previous.totalRevenue),
      sparkData: perf.map((p) => p.totalRevenue),
      color: "#10B981",
    },
    {
      label: "ROAS",
      value: `${roas.toFixed(1)}x`,
      change: pctChange(roas, prevRoas),
      sparkData: perf.map((p) => p.totalRevenue / p.totalSpend),
      color: "#2C9FDD",
    },
    {
      label: "Spend",
      value: formatCurrency(current.totalSpend),
      change: pctChange(current.totalSpend, previous.totalSpend),
      sparkData: perf.map((p) => p.totalSpend),
      color: "#8492A6",
    },
    {
      label: "Avg CPA",
      value: `$${Math.round(avgCpa)}`,
      change: pctChange(avgCpa, prevCpa),
      sparkData: perf.map((p) => p.totalSpend / p.totalConversions),
      color: "#F59E0B",
      invertColor: true,
    },
  ];

  const brandName = brand?.name || "your marketing";

  return (
    <div className="rounded-xl bg-background">
      {/* Period header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <span className="text-[13px] font-semibold text-foreground">
          {periodLabel} performance
        </span>
        <button
          onClick={() => onAction(`Give me a detailed performance breakdown for ${brandName}`)}
          className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Full report
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-px bg-border/60 border-t border-border/60">
        {metrics.map((m) => {
          const isPositive = m.invertColor
            ? m.change.direction === "down"
            : m.change.direction === "up";
          const isNegative = m.invertColor
            ? m.change.direction === "up"
            : m.change.direction === "down";

          return (
            <div
              key={m.label}
              className="bg-background px-5 pt-4 pb-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </span>
                {m.change.direction !== "flat" && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      isPositive && "bg-emerald-50 text-emerald-600",
                      isNegative && "bg-red-50 text-red-500",
                    )}
                  >
                    {m.change.direction === "up" ? "↑" : "↓"}
                    {m.change.value}%
                  </span>
                )}
                {m.change.direction === "flat" && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    —
                  </span>
                )}
              </div>
              <div className="mt-1.5">
                <span className="text-2xl font-semibold tracking-tight text-foreground">
                  {m.value}
                </span>
              </div>
              <div className="mt-3">
                <MiniSparkline data={m.sparkData} color={m.color} height={32} width={120} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Task action routing
   ────────────────────────────────────────────── */

const taskActions: Record<string, string> = {
  "first-campaign": "campaign",
  "competitive-intel": "How am I positioned against competitors?",
  "see-performance": "Show me how my marketing is performing",
  "connect-accounts": "Help me connect my ad accounts",
  "plan-spend": "Help me plan my monthly spend",
};

/* ──────────────────────────────────────────────
   User + brand inference from localStorage
   ────────────────────────────────────────────── */

interface UserInfo {
  name: string;
  brand: BrandProfile | null;
}

function getUserInfo(): UserInfo {
  if (typeof window === "undefined") return { name: "there", brand: null };
  try {
    const stored = localStorage.getItem("fuseiq-user");
    if (stored) {
      const { name, email } = JSON.parse(stored);
      const firstName = name ? name.split(" ")[0] : "there";
      const brand = email ? getBrandFromEmail(email) : null;
      return { name: firstName, brand };
    }
  } catch {
    // ignore
  }
  return { name: "there", brand: null };
}

/* ──────────────────────────────────────────────
   Dashboard view
   ────────────────────────────────────────────── */

export function DashboardView() {
  const { openFullscreen, startCampaignFlow } = useAICompanion();
  const { savedStrategies, hydrated } = useCampaign();
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "there", brand: null });

  useEffect(() => {
    setUserInfo(getUserInfo());
  }, []);

  const { name: userName, brand } = userInfo;

  // Demo mode override — allows toggling between first-time and returning user
  const [demoState, setDemoState] = useState<string>("returning");
  useEffect(() => {
    setDemoState(getDemoUserState());
  }, []);

  const isReturningUser = hydrated && demoState === "first-time"
    ? false
    : hydrated && (savedStrategies?.length || 0) > 0;

  // Get performance data for returning users
  const perfData = useMemo(() => {
    if (!isReturningUser) return null;
    const b = getCurrentBrand();
    return b ? FFERN_SEED_PERFORMANCE : SEED_PERFORMANCE;
  }, [isReturningUser]);

  const essentialTasks = universalTasks.filter((t) => t.priority === "essential");
  const optionalTasks = universalTasks.filter((t) => t.priority === "optional");

  const handleTaskAction = useCallback(
    (taskId: string) => {
      const action = taskActions[taskId];
      if (action === "campaign") {
        startCampaignFlow();
      } else if (action) {
        openFullscreen(action);
      }
    },
    [startCampaignFlow, openFullscreen]
  );

  // Personalized greeting — different for returning users
  const greeting = isReturningUser
    ? brand
      ? `Welcome back. Here's what's happening with ${brand.name}.`
      : `Welcome back, ${userName}.`
    : brand
    ? `Welcome, ${userName}. Let's get ${brand.name} running.`
    : `Welcome, ${userName}`;

  return (
    <div className="flex h-full flex-col">
    <div className="flex-1 overflow-y-auto">
    <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-8 py-10">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {greeting}
      </h1>

      <div>
        <div className="space-y-3 rounded-2xl bg-muted/60 p-3">
          {/* HERO — morphs based on user state */}
          {isReturningUser && perfData ? (
            <ReturnVisitHero
              perf={perfData}
              brand={brand}
              onAction={openFullscreen}
            />
          ) : (
            essentialTasks.map((task) => (
              <HeroCard
                key={task.id}
                task={task}
                onAction={() => handleTaskAction(task.id)}
                brand={brand}
              />
            ))
          )}

          {/* SECONDARY — morphs based on user state */}
          {isReturningUser ? null : (
            <div className="grid grid-cols-3 gap-3">
              {optionalTasks.map((task) => (
                <SecondaryCard
                  key={task.id}
                  task={task}
                  onAction={() => handleTaskAction(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isReturningUser && (
        <FocusChatsTabs strategies={savedStrategies} />
      )}

    </div>
    </div>
      <div className="shrink-0 pb-6 pt-2">
        <div className="mx-auto max-w-3xl px-4 sm:px-8">
          <CanvasChatInput placeholder="Ask about performance, campaigns, or optimization ideas..." />
        </div>
      </div>
    </div>
  );
}
