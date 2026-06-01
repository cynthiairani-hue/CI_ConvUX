import type {
  Advertiser,
  IABIndustry,
  MediaCampaign,
  MediaForecast,
  MediaPlan,
} from "@/types/campaign";
import { getCapabilities } from "./prerequisites";

/**
 * Media Plan builder + single-source recalc engine.
 *
 * Mirrors the AdRoll Media Planner spec's behaviour: 5 channels grouped
 * Awareness → Consideration → Conversion, each an editable budget row with its
 * own forecast. The spec's hardcoded prototype had THREE disagreeing number
 * sources (headline 5,380 vs recalc 4,580 vs chat 5,510); we deliberately fix
 * that — there is ONE source of truth:
 *   summary.estConversions === Σ enabled campaign.forecast.conversions
 *   blended ROAS = Σ revenue / Σ spend   (a real ratio, not "rises with spend")
 *
 * Both inline canvas edits and AI chat refinements run the SAME recalc, so the
 * card and the narration can never diverge (two modalities, one artifact).
 */

const TEMPLATE_TOTAL = 120_000;

/** Channel template at the $120k reference budget (mirrors the spec's worked example). */
const CHANNEL_TEMPLATE: Omit<MediaCampaign, "forecast">[] = [
  {
    id: "mc-ctv",
    channel: "ctv",
    label: "Connected TV (CTV)",
    description: "Brand awareness via premium streaming",
    funnelStage: "awareness",
    status: "available",
    budget: 12_000,
    baseBudget: 12_000,
    enabled: true,
    baseForecast: { impressions: 2_400_000, conversions: 0, roas: null, cpa: null, vtr: 82, brandLift: 18, cpm: 5 },
  },
  {
    id: "mc-dooh",
    channel: "dooh",
    label: "Digital Out-of-Home (DOOH)",
    description: "Geo-targeted high-traffic markets",
    funnelStage: "awareness",
    status: "closed_beta",
    budget: 8_000,
    baseBudget: 8_000,
    enabled: true,
    baseForecast: { impressions: 1_300_000, conversions: 0, roas: null, cpa: null, cpm: 6, markets: 8, audiencePool: 22_000 },
  },
  {
    id: "mc-lookalike",
    channel: "lookalike",
    label: "Lookalike Prospecting",
    description: "Find new customers at scale",
    funnelStage: "consideration",
    status: "available",
    budget: 38_000,
    baseBudget: 38_000,
    enabled: true,
    baseForecast: { impressions: 7_600_000, conversions: 1_900, roas: 3.1, cpa: 20 },
  },
  {
    id: "mc-social",
    channel: "social",
    label: "Social — Meta & Instagram",
    description: "Awareness + DTC conversion",
    funnelStage: "consideration",
    status: "available",
    budget: 30_000,
    baseBudget: 30_000,
    enabled: true,
    baseForecast: { impressions: 5_000_000, conversions: 1_200, roas: 3.2, cpa: 25 },
  },
  {
    id: "mc-retargeting",
    channel: "retargeting",
    label: "Site Retargeting",
    description: "Convert warm visitors",
    funnelStage: "conversion",
    status: "available",
    budget: 32_000,
    baseBudget: 32_000,
    enabled: true,
    baseForecast: { impressions: 3_200_000, conversions: 1_480, roas: 4.8, cpa: 21 },
  },
];

const OBJ_TITLE: Record<string, string> = {
  awareness: "Brand Launch",
  traffic: "Demand Capture",
  leads: "Lead Generation",
  sales: "Conversion Push",
  retargeting: "Retargeting Plan",
};

const VERTICAL_WORD: Partial<Record<IABIndustry, string>> = {
  "style-fashion": "beauty & fashion",
  "technology-computing": "B2B SaaS",
  "business-finance": "finance",
  "healthy-living": "health & wellness",
  "food-drink": "food & beverage",
  travel: "travel",
  automotive: "automotive",
  entertainment: "media & entertainment",
  sports: "sports",
};

function scaleForecast(f: MediaForecast, factor: number): MediaForecast {
  return {
    ...f,
    impressions: Math.round(f.impressions * factor),
    conversions: Math.round(f.conversions * factor),
    audiencePool: f.audiencePool != null ? Math.round(f.audiencePool * factor) : undefined,
  };
}

/** Recompute one campaign's forecast from its current budget (linear from base). */
function recalcForecast(c: MediaCampaign): MediaForecast {
  const scale = c.baseBudget > 0 ? c.budget / c.baseBudget : 0;
  const f = c.baseForecast;
  const conversions = Math.round(f.conversions * scale);
  return {
    ...f,
    impressions: Math.round(f.impressions * scale),
    conversions,
    // ROAS is a per-channel ratio — constant, NOT scaling with spend.
    roas: f.roas,
    cpa: conversions > 0 ? Math.round(c.budget / conversions) : null,
    audiencePool: f.audiencePool != null ? Math.round(f.audiencePool * scale) : undefined,
  };
}

/**
 * The single source of truth: recompute every per-channel forecast, then derive
 * the summary KPIs from the ENABLED campaigns only. Call this after any edit
 * (inline budget change, channel toggle, or AI refine) — never store a separate
 * headline number.
 */
export function recalcMediaPlan(plan: MediaPlan, stampedAt: string = new Date().toISOString()): MediaPlan {
  const campaigns = plan.campaigns.map((c) => ({ ...c, forecast: recalcForecast(c) }));
  const active = campaigns.filter((c) => c.enabled);
  const totalBudget = active.reduce((s, c) => s + c.budget, 0);
  const estConversions = active.reduce((s, c) => s + c.forecast.conversions, 0);
  const estImpressions = active.reduce((s, c) => s + c.forecast.impressions, 0);
  const revenue = active.reduce((s, c) => s + (c.forecast.roas != null ? c.forecast.roas * c.budget : 0), 0);
  const estRoas = totalBudget > 0 ? Math.round((revenue / totalBudget) * 10) / 10 : 0;
  return {
    ...plan,
    campaigns,
    summary: { ...plan.summary, totalBudget, estConversions, estRoas, estImpressions },
    lastModifiedAt: stampedAt,
    lastModifiedBy: "you",
  };
}

/** Inline budget edit → recalc. */
export function editCampaignBudget(plan: MediaPlan, campaignId: string, newBudget: number): MediaPlan {
  const campaigns = plan.campaigns.map((c) =>
    c.id === campaignId ? { ...c, budget: Math.max(0, Math.round(newBudget)) } : c
  );
  return recalcMediaPlan({ ...plan, campaigns });
}

/** Edit the TOTAL budget → rescale enabled channels proportionally, then recalc. */
export function setTotalBudget(plan: MediaPlan, newTotal: number): MediaPlan {
  const target = Math.max(0, Math.round(newTotal));
  const enabled = plan.campaigns.filter((c) => c.enabled);
  const current = enabled.reduce((s, c) => s + c.budget, 0);
  if (current <= 0 || target <= 0) {
    return recalcMediaPlan({ ...plan, summary: { ...plan.summary, totalBudget: target } });
  }
  const factor = target / current;
  const campaigns = plan.campaigns.map((c) =>
    c.enabled ? { ...c, budget: Math.round(c.budget * factor) } : c
  );
  return recalcMediaPlan({ ...plan, campaigns });
}

/** Channel on/off toggle → recalc (disabled channels drop out of the summary). */
export function toggleCampaign(plan: MediaPlan, campaignId: string): MediaPlan {
  const campaigns = plan.campaigns.map((c) =>
    c.id === campaignId ? { ...c, enabled: !c.enabled } : c
  );
  return recalcMediaPlan({ ...plan, campaigns });
}

function flightLabel(now: Date, durationDays: number): string {
  const end = new Date(now.getTime() + durationDays * 86_400_000);
  const m = (d: Date) => d.toLocaleString("en-US", { month: "short" });
  const startM = m(now);
  const endM = m(end);
  const year = end.getFullYear();
  return startM === endM ? `${startM} ${year}` : `${startM}–${endM} ${year}`;
}

export function buildMediaPlan(
  advertiser: Advertiser,
  objective: string,
  monthlyBudget: number
): MediaPlan {
  const now = new Date();
  const nowIso = now.toISOString();
  const durationDays = 90;
  // The plan total is the flight budget; scale the $120k template proportionally.
  const total = monthlyBudget > 0 ? monthlyBudget : TEMPLATE_TOTAL;
  const factor = total / TEMPLATE_TOTAL;
  const pixelReady = getCapabilities().hasSitePixel;

  const campaigns: MediaCampaign[] = CHANNEL_TEMPLATE.map((t) => {
    const baseBudget = Math.round(t.budget * factor);
    const baseForecast = scaleForecast(t.baseForecast, factor);
    return {
      ...t,
      budget: baseBudget,
      baseBudget,
      baseForecast,
      forecast: baseForecast,
    };
  });

  const vertical = VERTICAL_WORD[advertiser.industry] ?? "your";
  const title = OBJ_TITLE[objective] ?? "Growth Plan";

  const plan: MediaPlan = {
    id: "mediaplan-active",
    name: `${advertiser.companyName} — ${title}`,
    advertiserId: advertiser.id,
    title,
    objective,
    flight: flightLabel(now, durationDays),
    durationDays,
    benchmarkBasis: `${vertical} vertical · benchmarks`,
    pixelReady,
    campaigns,
    summary: {
      totalBudget: total,
      estConversions: 0,
      estRoas: 0,
      estImpressions: 0,
      // Targets the plan is measured against (scaled with budget).
      targets: { conversions: Math.round(4_200 * factor), roas: 3.0 },
    },
    reviewState: "draft",
    checkInDays: null,
    createdAt: nowIso,
    lastModifiedAt: nowIso,
    lastModifiedBy: "system",
  };

  // Derive the summary from the campaigns — single source of truth.
  return recalcMediaPlan(plan, nowIso);
}
