"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Image, Sparkles, LayoutDashboard, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrandFromEmail, type BrandProfile } from "@/data/brand-profiles";

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

function buildDiscoverySteps(brand: BrandProfile | null, domain: string): DiscoveryStep[] {
  return [
    {
      id: "scan",
      icon: Globe,
      loading: `Scanning ${domain}...`,
      complete: `${domain} scanned`,
      delayMs: 1800,
    },
    {
      id: "imagery",
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
  onComplete,
}: {
  brand: BrandProfile | null;
  domain: string;
  onComplete: () => void;
}) {
  const steps = buildDiscoverySteps(brand, domain);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [visibleImages, setVisibleImages] = useState(0);

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

      // Stagger images in during the "imagery" step
      if (steps[index].id === "imagery" && brand) {
        const imgCount = Math.min(brand.heroImages.length, 4);
        for (let img = 0; img < imgCount; img++) {
          const t = setTimeout(() => setVisibleImages(img + 1), 400 + img * 350);
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

  const imageryDone = completedSteps.includes("imagery");
  const imageryActive = steps[activeStep]?.id === "imagery" && !imageryDone;

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
              Setting up your workspace
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              We&apos;re analyzing <span className="font-medium text-foreground">{domain}</span> to personalize your experience with your own brand imagery, industry context, and relevant recommendations.
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

          {/* Brand imagery — loads progressively during imagery step */}
          {(imageryActive || imageryDone) && brand && visibleImages > 0 && (
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

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("Cynthia Irani");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "discovery">("form");
  const [discoveryBrand, setDiscoveryBrand] = useState<BrandProfile | null>(null);
  const [discoveryDomain, setDiscoveryDomain] = useState("");

  const canSubmit = name.trim() && email.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    // Clear any previous session data so the home page shows first-time experience
    localStorage.removeItem("fuseiq-strategies");
    localStorage.removeItem("fuseiq-advertisers");
    localStorage.removeItem("fuseiq-narratives");
    localStorage.removeItem("fuseiq-audiences");
    localStorage.removeItem("fuseiq-approvals");
    localStorage.removeItem("fuseiq-chat-mode");
    localStorage.removeItem("fuseiq-detail-level");
    localStorage.removeItem("fuseiq-layout-state");
    localStorage.removeItem("fuseiq-entry-layout");
    localStorage.removeItem("fuseiq-floating-panel");
    localStorage.removeItem("fuseiq-dock-side");
    localStorage.removeItem("fuseiq-chat-sessions");

    // Save new user to localStorage
    localStorage.setItem("fuseiq-user", JSON.stringify({ name, email }));

    // Extract domain for discovery screen
    const domain = email.split("@")[1]?.toLowerCase() || "";
    const brand = getBrandFromEmail(email);

    setDiscoveryDomain(domain);
    setDiscoveryBrand(brand);
    setPhase("discovery");
  }

  const handleDiscoveryComplete = useCallback(() => {
    router.push("/home");
  }, [router]);

  if (phase === "discovery") {
    return (
      <BrandDiscovery
        brand={discoveryBrand}
        domain={discoveryDomain}
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
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Get started with FuseIQ. We&apos;ll personalize your experience as
              you go.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Your name"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-colors",
              canSubmit
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </main>
    </div>
  );
}
