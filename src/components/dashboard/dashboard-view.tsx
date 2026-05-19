"use client";

import { useState, useEffect, useCallback } from "react";
import { universalTasks } from "@/data/personas";
import { CanvasChatInput } from "@/components/ai-companion/canvas-chat-input";
import { useAICompanion } from "@/contexts/ai-companion-context";
import {
  Megaphone,
  TrendingUp,
  Link,
  DollarSign,
  Building2,
  Sparkles,
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
   Dashboard view
   ────────────────────────────────────────────── */

export function DashboardView() {
  const { state, openFullscreen, startCampaignFlow } = useAICompanion();
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: "there", brand: null });

  useEffect(() => {
    setUserInfo(getUserInfo());
  }, []);

  const { name: userName, brand } = userInfo;

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

  // Personalized greeting when brand is known
  const greeting = brand
    ? `Welcome, ${userName}. Let’s get ${brand.name} running.`
    : `Welcome, ${userName}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-10">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {greeting}
      </h1>

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
