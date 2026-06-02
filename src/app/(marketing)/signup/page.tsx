"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Image, Sparkles, LayoutDashboard, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrandFromEmail, type BrandProfile } from "@/data/brand-profiles";
import { BRAINLABS_DISCOVERED, faviconUrl, AGENCY } from "@/data/seed-agency";

/* ──────────────────────────────────────────────
   Discovery step definition
   ────────────────────────────────────────────── */

interface DiscoveryStep {
  id: string;
  icon: typeof Globe;
  loading: string;     // shown while "in progress"
  complete: string;    // shown when done
  detail?: string;     // extra detail line once complete (brand-aware)
  delayMs: number;     // time before this step completes (from its start)
}

function buildDiscoverySteps(brand: BrandProfile | null, domain: string, isAgency: boolean): DiscoveryStep[] {
  if (isAgency) {
    return [
      {
        id: "scan",
        icon: Globe,
        loading: `Scanning ${domain}...`,
        complete: `${domain} scanned`,
        delayMs: 1800,
      },
      {
        id: "visual", // client roster discovery — drives the logo reveal
        icon: Users,
        loading: "Discovering your client roster...",
        complete: `${BRAINLABS_DISCOVERED.length} clients found`,
        delayMs: 2200,
      },
      {
        id: "enrich",
        icon: Image,
        loading: "Pulling client logos & industries...",
        complete: "Logos & industries pulled",
        delayMs: 1600,
      },
      {
        id: "workspace",
        icon: LayoutDashboard,
        loading: "Building your agency portfolio...",
        complete: "Portfolio ready",
        delayMs: 1200,
      },
    ];
  }
  return [
    {
      id: "scan",
      icon: Globe,
      loading: `Scanning ${domain}...`,
      complete: `${domain} scanned`,
      delayMs: 1800,
    },
    {
      id: "visual", // brand imagery — drives the image reveal
      icon: Image,
      loading: "Extracting brand imagery...",
      complete: brand
        ? `${brand.heroImages.length} brand images found`
        : "Brand imagery analyzed",
      delayMs: 2000,
    },
    {
      id: "industry",
      icon: Sparkles,
      loading: "Identifying industry & positioning...",
      complete: brand
        ? `${brand.industry} — "${brand.tagline}"`
        : "Industry profile built",
      delayMs: 1600,
    },
    {
      id: "workspace",
      icon: LayoutDashboard,
      loading: "Building your personalized workspace...",
      complete: "Workspace ready",
      delayMs: 1200,
    },
  ];
}

/* ──────────────────────────────────────────────
   Brand discovery screen
   ────────────────────────────────────────────── */

function BrandDiscovery({
  brand,
  domain,
  isAgency,
  onComplete,
}: {
  brand: BrandProfile | null;
  domain: string;
  isAgency: boolean;
  onComplete: () => void;
}) {
  const steps = buildDiscoverySteps(brand, domain, isAgency);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [visibleImages, setVisibleImages] = useState(0);

  const visualCount = isAgency
    ? Math.min(BRAINLABS_DISCOVERED.length, 6)
    : Math.min(brand?.heroImages.length ?? 0, 4);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const imageTimeouts: NodeJS.Timeout[] = [];

    function advance(index: number) {
      if (index >= steps.length) {
        // All steps done — auto-navigate after a short pause
        setTimeout(() => onComplete(), 800);
        return;
      }

      setActiveStep(index);

      // Stagger the visual (brand images OR client logos) in during the visual step
      if (steps[index].id === "visual" && visualCount > 0) {
        for (let img = 0; img < visualCount; img++) {
          const t = setTimeout(() => setVisibleImages(img + 1), 400 + img * 300);
          imageTimeouts.push(t);
        }
      }

      timeout = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, steps[index].id]);
        // Small pause before starting next step
        setTimeout(() => advance(index + 1), 300);
      }, steps[index].delayMs);
    }

    // Start the first step after a brief pause
    const startTimeout = setTimeout(() => advance(0), 600);

    return () => {
      clearTimeout(timeout);
      clearTimeout(startTimeout);
      imageTimeouts.forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visualDone = completedSteps.includes("visual");
  const visualActive = steps[activeStep]?.id === "visual" && !visualDone;
  const showVisual = (visualActive || visualDone) && visibleImages > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center border-b px-6">
        <span className="text-sm font-semibold tracking-tight">FuseIQ</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg space-y-8">
          {/* Heading */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {isAgency ? "Setting up your agency workspace" : "Setting up your workspace"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isAgency ? (
                <>We&apos;re analyzing <span className="font-medium text-foreground">{domain}</span> to find your clients, pull their logos and industries, and build your portfolio.</>
              ) : (
                <>We&apos;re analyzing <span className="font-medium text-foreground">{domain}</span> to personalize your experience with your own brand imagery, industry context, and relevant recommendations.</>
              )}
            </p>
          </div>

          {/* Steps list */}
          <div className="space-y-4">
            {steps.map((step, i) => {
              const isComplete = completedSteps.includes(step.id);
              const isActive = activeStep === i && !isComplete;
              const isPending = i > activeStep && !isComplete;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 transition-opacity duration-500",
                    isPending && "opacity-30",
                  )}
                >
                  {/* Status indicator */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                      isComplete && "bg-emerald-50",
                      isActive && "bg-muted",
                      isPending && "bg-muted/50",
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : isActive ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={cn(
                        "text-sm transition-colors duration-300",
                        isComplete && "font-medium text-foreground",
                        isActive && "text-foreground",
                        isPending && "text-muted-foreground",
                      )}
                    >
                      {isComplete ? step.complete : step.loading}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agency: client logos load progressively during the roster-discovery step */}
          {isAgency && showVisual && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground animate-in fade-in duration-300">
                Clients found on {AGENCY.domain}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {BRAINLABS_DISCOVERED.slice(0, 6).map((c, i) => (
                  <div
                    key={c.domain}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 transition-all duration-500",
                      i < visibleImages ? "opacity-100 scale-100" : "opacity-0 scale-95",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={faviconUrl(c.domain)} alt="" className="h-5 w-5 shrink-0 rounded object-contain" />
                    <span className="truncate text-[11px] font-medium text-foreground">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brand: imagery loads progressively during the imagery step */}
          {!isAgency && brand && showVisual && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground animate-in fade-in duration-300">
                {brand.name} brand imagery
              </p>
              <div className="flex gap-2 overflow-hidden rounded-lg">
                {brand.heroImages.slice(0, 4).map((src, i) => (
                  <div
                    key={src}
                    className={cn(
                      "h-24 flex-1 overflow-hidden rounded-md transition-all duration-500",
                      i < visibleImages ? "opacity-100 scale-100" : "opacity-0 scale-95",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`${brand.name} brand`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Signup page — two phases
   ────────────────────────────────────────────── */

type ScenarioId = "smb" | "abm" | "agency";
type StartState = "net-new" | "returning";

const SCENARIOS: { id: ScenarioId; label: string; role: string; brand: string; persona: string; email: string; comingSoon?: boolean }[] = [
  { id: "smb", label: "In-house", role: "Brand-side marketer", brand: "Ffern · luxury fragrance", persona: "cynthia-b2c", email: "cynthia@ffern.co" },
  { id: "agency", label: "Agency", role: "Manages a client roster", brand: "Brainlabs · performance agency", persona: "cynthia-agency", email: "cynthia@brainlabs.co.uk" },
  { id: "abm", label: "Enterprise", role: "Account-based (ABM)", brand: "Norwest Analytics · B2B SaaS", persona: "cynthia-b2b", email: "cynthia@norwest.io", comingSoon: true },
];

const SEED_KEYS = [
  "fuseiq-strategies", "fuseiq-media-plans", "fuseiq-advertisers", "fuseiq-narratives", "fuseiq-audiences",
  "fuseiq-approvals", "fuseiq-briefs", "fuseiq-chat-sessions", "fuseiq-agency-clients",
  "fuseiq-agency-clients-v2", "fuseiq-active-client",
  "fuseiq-chat-mode", "fuseiq-detail-level", "fuseiq-layout-state", "fuseiq-entry-layout",
  "fuseiq-floating-panel", "fuseiq-dock-side",
];

export default function SignupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ScenarioId | null>(null);
  const [start, setStart] = useState<StartState>("returning");
  const [phase, setPhase] = useState<"form" | "discovery">("form");
  const [discoveryBrand, setDiscoveryBrand] = useState<BrandProfile | null>(null);
  const [discoveryDomain, setDiscoveryDomain] = useState("");
  const [discoveryIsAgency, setDiscoveryIsAgency] = useState(false);

  function handleEnter() {
    if (!profile) return;
    const s = SCENARIOS.find((x) => x.id === profile)!;

    // Reset all demo state so each scenario loads clean — no leftovers.
    SEED_KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem("fuseiq-user", JSON.stringify({ name: "Cynthia Irani", email: s.email }));
    localStorage.setItem("fuseiq-persona", s.persona);
    localStorage.setItem("fuseiq-demo-user-state", start === "net-new" ? "first-time" : "returning");

    if (start === "net-new") {
      // Net-new gets the brand-discovery flourish before landing.
      setDiscoveryDomain(s.email.split("@")[1] || "");
      setDiscoveryBrand(getBrandFromEmail(s.email));
      setDiscoveryIsAgency(s.id === "agency");
      setPhase("discovery");
    } else {
      router.push("/home");
    }
  }

  const handleDiscoveryComplete = useCallback(() => {
    router.push("/home");
  }, [router]);

  if (phase === "discovery") {
    return (
      <BrandDiscovery
        brand={discoveryBrand}
        domain={discoveryDomain}
        isAgency={discoveryIsAgency}
        onComplete={handleDiscoveryComplete}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center border-b px-6">
        <a href="/" className="text-sm font-semibold tracking-tight">
          FuseIQ
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg space-y-8">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Internal demo
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Choose a demo scenario
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Internal demo selector — pick a profile and starting state, and FuseIQ loads that experience fully set up.
            </p>
          </div>

          {/* Profile */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile</p>
            <div className="grid grid-cols-3 gap-3">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={s.comingSoon}
                  onClick={() => { if (!s.comingSoon) setProfile(s.id); }}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                    s.comingSoon
                      ? "cursor-not-allowed border-border bg-muted/40 opacity-60"
                      : profile === s.id ? "border-[#2C9FDD] bg-[#EBF5FB] shadow-sm" : "border-border bg-background hover:border-foreground/20"
                  )}
                >
                  <span className="text-[14px] font-semibold text-foreground">{s.label}</span>
                  <span className="mt-0.5 text-[12px] text-muted-foreground">{s.role}</span>
                  {s.comingSoon ? (
                    <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Coming soon
                    </span>
                  ) : (
                    <span className="mt-2 text-[11px] text-muted-foreground/70">{s.brand}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Starting state */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Starting state</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "net-new" as StartState, label: "Net-new", desc: "Empty workspace, onboarding flow" },
                { id: "returning" as StartState, label: "Returning", desc: "Fully populated workspace" },
              ]).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setStart(o.id)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                    start === o.id ? "border-[#2C9FDD] bg-[#EBF5FB] shadow-sm" : "border-border bg-background hover:border-foreground/20"
                  )}
                >
                  <span className="text-[13px] font-semibold text-foreground">{o.label}</span>
                  <span className="mt-0.5 text-[12px] text-muted-foreground">{o.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleEnter}
            disabled={!profile}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-colors",
              profile
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            Enter FuseIQ
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
