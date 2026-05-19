"use client";

import { useState, useEffect, useCallback } from "react";
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
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrandFromEmail, type BrandProfile } from "@/data/brand-profiles";
import type { GettingStartedTask } from "@/types/persona";
import type { LucideIcon } from "lucide-react";

const taskIcons: Record<string, LucideIcon> = {
  "first-campaign": Megaphone,
  "see-performance": TrendingUp,
  "connect-accounts": Link,
  "plan-spend": DollarSign,
};

// Maps optional task ids to their index in BrandProfile.cardImages
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
   Hero card — with optional brand images
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

  return (
    <div className="flex flex-col items-center rounded-xl bg-background px-8 py-10 text-center">
      {brand ? (
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
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        <Sparkles className="h-4 w-4" />
        {task.cta}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Secondary card — with optional brand image
   ────────────────────────────────────────────── */

function SecondaryCard({
  task,
  onAction,
  imageUrl,
}: {
  task: GettingStartedTask;
  onAction: () => void;
  imageUrl?: string;
}) {
  const Icon = taskIcons[task.id] || Building2;

  return (
    <div className="flex flex-col items-center rounded-xl bg-background px-4 py-6 text-center transition-shadow hover:shadow-sm">
      {imageUrl ? (
        <div className="mb-3 h-9 w-9 overflow-hidden rounded-lg">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
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
   Task action routing
   ────────────────────────────────────────────── */

const taskActions: Record<string, string> = {
  "first-campaign": "campaign",
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
   Return-visit summary banner
   ────────────────────────────────────────────── */

function ReturnVisitBanner({
  brand,
  strategyCount,
  onAction,
}: {
  brand: BrandProfile | null;
  strategyCount: number;
  onAction: (prompt: string) => void;
}) {
  const brandName = brand?.name || "your brand";

  // Simulated insights — in production these come from real data
  const insights = [
    { icon: "📈", text: "Retargeting ROAS up 12% since last week" },
    { icon: "💰", text: "Pacing 8% under budget — room to scale" },
    { icon: "🎯", text: `${strategyCount} active ${strategyCount === 1 ? "strategy" : "strategies"} running` },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E0E8F2] bg-gradient-to-br from-white to-[#F5FAFF]">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-[#2C9FDD]" />
          <span className="text-[13px] font-semibold text-[#394859]">Since your last visit</span>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[13px] text-[#5D6B7D]">
              <span className="text-[14px]">{insight.icon}</span>
              <span>{insight.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-[#EDF1F5] px-5 py-3">
        <button
          onClick={() => onAction(`What changed since my last visit for ${brandName}?`)}
          className="flex items-center gap-1.5 rounded-lg bg-[#394859] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2A3744]"
        >
          Full summary
          <ArrowRight className="h-3 w-3" />
        </button>
        <button
          onClick={() => onAction(`Top optimization moves for ${brandName}`)}
          className="flex items-center gap-1.5 rounded-lg border border-[#D5DDE5] px-3 py-1.5 text-[12px] font-medium text-[#394859] transition-colors hover:bg-[#F7F9FB]"
        >
          Optimization ideas
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Dashboard view
   ────────────────────────────────────────────── */

export function DashboardView() {
  const { state, openFullscreen, startCampaignFlow } = useAICompanion();
  const { savedStrategies } = useCampaign();
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "there", brand: null });

  useEffect(() => {
    setUserInfo(getUserInfo());
  }, []);

  const { name: userName, brand } = userInfo;
  const isReturningUser = (savedStrategies?.length || 0) > 0;

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
      ? `Welcome back. Here’s what’s happening with ${brand.name}.`
      : `Welcome back, ${userName}.`
    : brand
    ? `Welcome, ${userName}. Let’s get ${brand.name} running.`
    : `Welcome, ${userName}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-10">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {greeting}
      </h1>

      {/* Return-visit summary for returning users */}
      {isReturningUser && (
        <ReturnVisitBanner
          brand={brand}
          strategyCount={savedStrategies?.length || 0}
          onAction={openFullscreen}
        />
      )}

      <div>
        <div className="space-y-3 rounded-2xl bg-muted/60 p-3">
          {essentialTasks.map((task) => (
            <HeroCard
              key={task.id}
              task={task}
              onAction={() => handleTaskAction(task.id)}
              brand={brand}
            />
          ))}

          {optionalTasks.length > 0 && (
            <div
              className={cn(
                "grid gap-3",
                optionalTasks.length >= 3
                  ? "grid-cols-3"
                  : `grid-cols-${optionalTasks.length}`
              )}
            >
              {optionalTasks.map((task) => (
                <SecondaryCard
                  key={task.id}
                  task={task}
                  onAction={() => handleTaskAction(task.id)}
                  imageUrl={
                    brand
                      ? brand.cardImages[SECONDARY_IMAGE_INDEX[task.id] ?? 0]
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {state === "resting" && <CanvasChatInput />}
    </div>
  );
}
