"use client";

import { getCurrentBrand } from "@/data/brand-profiles";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { Users, Sparkles } from "lucide-react";

export default function AudiencesPage() {
  const brand = getCurrentBrand();
  const { openFullscreen } = useAICompanion();

  function handleBuildAudience() {
    openFullscreen("Help me build an audience segment for my campaigns");
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Audiences</h1>
        <p className="mt-0.5 text-[13px] text-[#8492A6]">
          Your audience segments will live here
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center rounded-xl bg-white px-8 py-10 text-center">
        {brand?.pageImages?.audiences ? (
          <div className="mb-5 w-full max-w-md overflow-hidden rounded-lg">
            <img src={brand.pageImages.audiences} alt="" className="h-48 w-full object-cover" />
          </div>
        ) : (
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Users className="h-6 w-6 text-foreground/70" strokeWidth={1.5} />
          </div>
        )}
        <h2 className="text-base font-semibold text-foreground">Define who you want to reach</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Build audience segments from your customer data, or let the AI suggest high-intent audiences based on your goals.
        </p>
        <button
          type="button"
          onClick={handleBuildAudience}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <Sparkles className="h-4 w-4" />
          Build an audience
        </button>
      </div>
    </div>
  );
}
